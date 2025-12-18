import type { Request, Response } from 'express';
import pkg from 'transbank-sdk';

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
      console.error('❌ Parámetros inválidos:', {
        buyOrder,
        sessionId,
        amount,
      });
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

    console.log('🧾 Creando transacción Webpay:', {
      buyOrder,
      sessionId,
      amount,
    });

    const response = await transaction.create(
      buyOrder,
      sessionId,
      amount,
      RETURN_URL
    );

    console.log('✅ Transacción creada:', response);

    return res.status(200).json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder,
    });
  } catch (error: any) {
    console.error('🔥 CREATE TRANSACTION ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/* ======================================================
   WEBPAY RETURN (REDIRECT)
====================================================== */

export const webpayReturn = async (req: Request, res: Response) => {
  console.log('🔁 Webpay return hit:', req.query);

  try {
    const token =
      req.query.token_ws ||
      req.query.token ||
      req.body?.token_ws;

    const buyOrder = req.query.TBK_ORDEN_COMPRA;

    if (!token) {
      console.error('❌ Token faltante en return');
      return res.redirect(
        `${process.env.FRONTEND_URL}/pago-error`
      );
    }

    const frontendUrl =
      process.env.FRONTEND_URL ||
      'https://ecommercechipelibros.pages.dev';

    console.log('➡️ Redirigiendo a frontend:', {
      token,
      buyOrder,
    });

    return res.redirect(
      `${frontendUrl}/pago-exitoso?token_ws=${token}`
    );
  } catch (error: any) {
    console.error('🔥 WEBPAY RETURN ERROR:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/pago-error`
    );
  }
};

/* ======================================================
   WEBPAY COMMIT
====================================================== */

export const webpayCommit = async (req: Request, res: Response) => {
  try {
    const token = req.body?.token || req.query?.token;

    if (!token || typeof token !== 'string') {
      console.error('❌ Token inválido en commit');
      return res.status(400).json({
        success: false,
        error: 'Token requerido',
      });
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);

    const result = await transaction.commit(token);

    console.log('💳 Commit RAW:', result);

    const success = result.response_code === 0;

    if (!result.buy_order) {
      console.error('❌ Commit sin buy_order');
      return res.status(500).json({
        success: false,
        error: 'Commit inválido: falta buy_order',
      });
    }

    return res.json({
      success,
      data: {
        buy_order: result.buy_order,
        amount: result.amount,
        authorization_code: result.authorization_code,
        payment_type_code: result.payment_type_code,
        response_code: result.response_code,
        transaction_date: result.transaction_date,
        raw: result,
      },
      message: success ? 'Pago autorizado' : 'Pago rechazado',
    });
  } catch (error: any) {
    console.error('🔥 COMMIT ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
