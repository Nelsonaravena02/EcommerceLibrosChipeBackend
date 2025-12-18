import type { Request, Response } from 'express';
import pkg from 'transbank-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} = pkg;

/* ======================================================
   CREATE TRANSACTION
   👉 AQUÍ SE CREA LA ORDEN (PENDIENTE)
====================================================== */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { id_cliente, amount, comments } = req.body;

    if (!id_cliente || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const buyOrder = `ORD-${Date.now()}`;

    /* ===============================
       1️⃣ CREAR ORDEN PENDIENTE
    =============================== */
    const orden = await prisma.ordenes.create({
      data: {
        buy_order: buyOrder,              // 🔴 OBLIGATORIO
        id_cliente,
        total_precio: amount,
        id_status_ordenes: 0,             // PENDIENTE
        comments: comments ?? 'Esperando pago Webpay',
      },
    });

    /* ===============================
       2️⃣ WEBPAY
    =============================== */
    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);

    const RETURN_URL =
      process.env.WEBPAY_RETURN_URL ||
      'https://ecommercechipelibros.pages.dev/webpay-return';

    const response = await transaction.create(
      buyOrder,                   // ✔️ existe
      orden.id.toString(),        // sessionId
      amount,
      RETURN_URL
    );

    return res.json({
      success: true,
      token: response.token,
      url: response.url,
      buyOrder,
    });

  } catch (error: any) {
    console.error('WEBPAY CREATE ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};


/* ======================================================
   RETURN (SOLO REDIRECCIÓN)
====================================================== */
export const webpayReturn = async (_req: Request, res: Response) => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    'https://ecommercechipelibros.pages.dev';

  res.redirect(`${frontendUrl}/webpay-return`);
};

/* ======================================================
   COMMIT
   👉 SOLO CONFIRMA Y ACTUALIZA ORDEN
====================================================== */
export const webpayCommit = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requerido' });
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);
    const result = await transaction.commit(token);

    if (result.response_code !== 0) {
      return res.json({ success: false, data: result });
    }

    /* ===============================
       1️⃣ ACTUALIZAR ORDEN
    =============================== */
    const orden = await prisma.ordenes.update({
      where: { buy_order: result.buy_order },
      data: {
        id_status_ordenes: 1, // ✅ PAGADA
        comments: 'Pago confirmado vía Webpay',
      },
    });

    /* ===============================
       2️⃣ REGISTRAR PAYMENT
    =============================== */
    const status = await prisma.payment_statuses.findFirst({
      where: { status_code: 'AUTHORIZED' },
    });

    if (status) {
      await prisma.payments.create({
        data: {
          id_orden: orden.id,
          id_payment_status: status.id,
          payment_method: 'webpay',
          amount: result.amount,
          transaction_id_inte: result.authorization_code,
          provider: 'transbank',
          metadata: result as any,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        orden_id: orden.id,
        buy_order: orden.buy_order,
        amount: orden.total_precio,
      },
    });

  } catch (error: any) {
    console.error('WEBPAY COMMIT ERROR:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
