import type { Request, Response } from 'express';
import pkg from 'transbank-sdk';
const { Environment, IntegrationApiKeys, IntegrationCommerceCodes, Options, WebpayPlus } = pkg;

interface CreateTransactionRequest {
  buyOrder: string;
  sessionId: string;
  amount: number;
}

interface WebpayCreateResponse {
  url: string;
  token: string;
}

// URL donde Transbank redirigirá post-pago (cámbiala por tu dominio)
const RETURN_URL = 'https://ecommercechipelibros.pages.dev/';

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buyOrder, sessionId, amount }: CreateTransactionRequest = req.body;

    // Validaciones básicas
    if (!buyOrder || !sessionId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Faltan parámetros requeridos o monto inválido' });
      return;
    }

    // Crear transacción Webpay Plus (entorno integración)
    const transaction = WebpayPlus.Transaction.buildForIntegration(
      IntegrationApiKeys.WEBPAY,
      IntegrationCommerceCodes.WEBPAY_PLUS
    );

    const response = await transaction.create(buyOrder, sessionId, amount, RETURN_URL);

    // Respuesta para frontend
    res.status(200).json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder: response.buyOrder
    });

  } catch (error) {
    console.error('Error creando transacción Webpay:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno al crear transacción',
      details: (error as Error).message 
    });
  }
};
