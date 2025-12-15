// src/controllers/webpayController.ts - VERSIÓN CORREGIDA
import type { Request, Response } from 'express';
import pkg from 'transbank-sdk';

const { 
  Environment, 
  IntegrationApiKeys, 
  IntegrationCommerceCodes, 
  Options, 
  WebpayPlus 
} = pkg;

interface CreateTransactionRequest {
  buyOrder: string;
  sessionId: string;
  amount: number;
}

const RETURN_URL = process.env.WEBPAY_RETURN_URL || 'https://ecommercelibroschipebackend-production.up.railway.app/api/webpay/return';

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buyOrder, sessionId, amount }: CreateTransactionRequest = req.body;

    if (!buyOrder || !sessionId || !amount || amount <= 0) {
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,  
      IntegrationApiKeys.WEBPAY,             
      Environment.Integration                 
    );

    const transaction = new WebpayPlus.Transaction(options);

    console.log('🔄 Creando transacción Webpay...');
    const response = await transaction.create(buyOrder, sessionId, amount, RETURN_URL);

    res.status(200).json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder: response.buyOrder
    });

  } catch (error: any) {
    console.error('❌ Error Webpay:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Error Webpay',
      details: error.message 
    });
  }
};
