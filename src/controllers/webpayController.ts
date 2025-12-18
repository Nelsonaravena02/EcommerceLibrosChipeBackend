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
====================================================== */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { buyOrder, sessionId, amount } = req.body;

    if (!buyOrder || !sessionId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

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
      buyOrder,
      sessionId,
      amount,
      RETURN_URL
    );

    res.json({
      success: true,
      token: response.token,
      url: response.url,
      buyOrder,
    });
  } catch (error: any) {
    console.error('WEBPAY CREATE ERROR:', error);
    res.status(500).json({ error: error.message });
  }
};

/* ======================================================
   RETURN
====================================================== */
export const webpayReturn = async (_req: Request, res: Response) => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    'https://ecommercechipelibros.pages.dev';

  res.redirect(`${frontendUrl}/webpay-return`);
};

/* ======================================================
   COMMIT (🔥 AQUÍ SE CREA LA ORDEN 🔥)
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
       CREAR ORDEN
    =============================== */
    const orden = await prisma.ordenes.create({
      data: {
        buy_order: result.buy_order,
        total_precio: result.amount,
        id_status_ordenes: 1, // PAGADA
        comments: 'Pago confirmado vía Webpay',
      },
    });

    /* ===============================
       CREAR PAYMENT
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
          metadata: result,
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
    res.status(500).json({ success: false, error: error.message });
  }
};
