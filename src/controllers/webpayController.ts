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

    const success = result.response_code === 0;

    res.json({
      success,
      data: result,
    });
  } catch (error: any) {
    console.error('WEBPAY COMMIT ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
