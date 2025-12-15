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


// src/controllers/webpayController.ts - SOLO createTransaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { buyOrder, sessionId, amount }: CreateTransactionRequest = req.body;

    if (!buyOrder || !sessionId || !amount || amount <= 0) {
      console.log('❌ Validación falló:', { buyOrder, sessionId, amount });
      res.status(400).json({ error: 'Parámetros inválidos' });
      return;
    }

    // ✅ ÚNICA RETURN_URL: DIRECTO AL FRONTEND
    const RETURN_URL = 'https://ecommercechipelibros.pages.dev/webpay-return';

    console.log('🔗 Creando transacción →', RETURN_URL);

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);
    const response = await transaction.create(buyOrder, sessionId, amount, RETURN_URL);

    console.log('✅ CREADA:', response.url);
    console.log('📄 Transbank irá a:', RETURN_URL);

    res.status(200).json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder: response.buyOrder
    });

  } catch (error: any) {
    console.error('❌ CREATE ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
};



export const webpayReturn = async (req: Request, res: Response) => {
    console.log('🎯 === TRANSBANK RETURN HIT ===', req.query); // ← ÚNICO LOG

  try {
    const { token, TBK_ORDEN_COMPRA } = req.query;
    
    if (!token) {
      res.status(400).json({ error: 'Token faltante' });
      return;
    }

    res.cookie('webpayToken', token as string, { httpOnly: true });
    
    console.log('✅ Transbank retorno:', { token: token?.toString(), buyOrder: TBK_ORDEN_COMPRA });
    
    const frontendUrl = process.env.FRONTEND_URL || 'https://ecommercechipelibros.pages.dev';
    res.redirect(`${frontendUrl}/pago-exitoso?order=${TBK_ORDEN_COMPRA}&token=${token}`);
    
  } catch (error: any) {
    console.error('❌ Error webpay return:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'https://ecommercechipelibros.pages.dev'}/pago-error`);
  }
};



export const webpayCommit = async (req: Request, res: Response) => { 
  try {
    const { token } = req.body || req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );
    
    const transaction = new WebpayPlus.Transaction(options);
    const result = await transaction.commit(token as string);
    
    console.log('💳 Commit RAW:', result);
    
    // ✅ snake_case CORRECTO
    const success = result.response_code === 0;
    
    console.log('✅ SUCCESS:', success, 'response_code:', result.response_code);
    
    res.json({
      success,
      data: result,
      message: success ? 'Pago autorizado' : 'Pago rechazado'
    });
    
  } catch (error: any) {
    console.error('❌ Commit ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};




