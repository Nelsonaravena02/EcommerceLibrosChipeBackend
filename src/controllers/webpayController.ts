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

    const RETURN_URL =
      process.env.WEBPAY_RETURN_URL ||
      'https://ecommercechipelibros.pages.dev/webpay-return';

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);

    const response = await transaction.create(
      buyOrder,
      sessionId,
      amount,
      RETURN_URL
    );

    return res.json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/* ======================================================
   WEBPAY COMMIT → CREA ORDEN REAL
====================================================== */
export const webpayCommit = async (req: Request, res: Response) => {
  try {
    const token = req.body?.token || req.query?.token;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);
    const result = await transaction.commit(token);

    console.log('💳 Commit RAW:', result);

    if (result.response_code !== 0) {
      return res.json({ success: false, data: result });
    }

    if (!result.buy_order) {
      return res.status(500).json({ error: 'buy_order inexistente' });
    }

    /* ======================================================
       EVITAR DUPLICADOS (MUY IMPORTANTE)
    ====================================================== */
    const existe = await prisma.ordenes.findUnique({
      where: { buy_order: result.buy_order },
    });

    if (existe) {
      return res.json({
        success: true,
        message: 'Orden ya existente',
        data: existe,
      });
    }

    /* ======================================================
       CREAR ORDEN + PAYMENT (TRANSACCIÓN)
    ====================================================== */
    const orden = await prisma.$transaction(async (tx) => {
      const nuevaOrden = await tx.ordenes.create({
        data: {
          buy_order: result.buy_order,
          total_precio: result.amount,
          id_status_ordenes: 2, // PAGADO
        },
      });

      await tx.payments.create({
        data: {
          id_orden: nuevaOrden.id,
          id_payment_status: 1, // APROBADO
          payment_method: 'webpay',
          amount: result.amount,
          transaction_id_prod: result.authorization_code ?? undefined,
          transaction_id_inte: token,
          provider: 'webpay',
          metadata: result,
        },
      });

      return nuevaOrden;
    });

    console.log('✅ ORDEN CREADA:', orden.id);

    return res.json({
      success: true,
      message: 'Pago confirmado y orden creada',
      data: {
        ordenId: orden.id,
        buy_order: orden.buy_order,
        total: orden.total_precio,
      },
    });
  } catch (error: any) {
    console.error('🔥 COMMIT ERROR:', error);
    return res.status(500).json({ error: error.message });
  }
};
