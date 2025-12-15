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

    // 🔍 Validaciones
    if (!buyOrder || !sessionId || !amount || amount <= 0) {
      console.log('❌ Validación falló:', { buyOrder, sessionId, amount });
      res.status(400).json({ error: 'Parámetros inválidos: buyOrder, sessionId y amount requeridos' });
      return;
    }

    // ✅ RETURN_URL directa al FRONTEND (público)
    const RETURN_URL = 'https://ecommercechipelibros.pages.dev/webpay-return';

    console.log('🔗 Creando transacción Webpay...');
    console.log('📋 Datos:', { buyOrder, sessionId, amount, returnUrl: RETURN_URL });

    // Configuración integración Transbank
    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,  // 597055555541
      IntegrationApiKeys.WEBPAY,             // 579B532A7440BB0C9079B1E0E56A8CC57C66A198
      Environment.Integration
    );

    const transaction = new WebpayPlus.Transaction(options);

    // Crear transacción
    const response = await transaction.create(buyOrder, sessionId, amount, RETURN_URL);

    console.log('✅ Transacción CREADA exitosamente:');
    console.log('🌐 URL Webpay:', response.url);
    console.log('🔑 Token:', response.token);
    console.log('📄 Return URL enviada:', RETURN_URL);

    // Respuesta para frontend
    res.status(200).json({
      success: true,
      url: response.url,
      token: response.token,
      buyOrder: response.buyOrder
    });

  } catch (error: any) {
    console.error('❌ Error creando transacción Webpay:', error.message);
    console.error('📋 Detalles error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Error al crear transacción Webpay',
      details: error.message 
    });
  }
};


export const webpayReturn = async (req: Request, res: Response): Promise<void> => {
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

export const webpayCommit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body || req.query;
    
    if (!token) {
      res.status(400).json({ error: 'Token requerido' });
      return;
    }

    const options = new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );
    
    const transaction = new WebpayPlus.Transaction(options);
    const result = await transaction.commit(token as string);
    
    console.log('💳 Commit resultado:', result);
    
    res.json({
      success: result.responseCode === 0,
      data: result
    });
    
  } catch (error: any) {
    console.error('❌ Commit error:', error);
    res.status(500).json({ error: 'Commit falló' });
  }
};
