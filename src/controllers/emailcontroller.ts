import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET as string | undefined;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno');
}

/* ========== Brevo API vía HTTP (axios) ========== */

// Función para enviar email OTP usando la API HTTP de Brevo
export const enviarEmailOTP = async (email: string, otp: string, nombreCompleto: string) => {
  const apiKey = process.env.BREVO_API_KEY as string;
  const senderEmail = process.env.EMAIL_FROM as string;
  const senderName = process.env.EMAIL_FROM_NAME || 'Chipelibros';

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email,
          name: nombreCompleto,
        },
      ],
      subject: 'Verifica tu cuenta en Chipelibros',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Hola ${nombreCompleto}!</h2>
          <p>Tu código de verificación es:</p>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #007bff; border: 2px solid #007bff; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p><strong>Este código expira en 10 minutos.</strong></p>
          <p>Si no solicitaste este código, ignora este email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Este email fue enviado automáticamente por Chipelibros.
          </p>
        </div>
      `,
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
};

// ✅ NUEVA FUNCIÓN: Enviar comprobante de pago
export const enviarComprobantePago = async (
  email: string,
  nombreCompleto: string,
  orderNumber: string,
  total: number,
  metodoPago: string,
  fecha: string,
  items: Array<{ name: string; quantity: number; price: number }>,
  direccionEnvio: string,
  telefono: string
) => {
  const apiKey = process.env.BREVO_API_KEY as string;
  const senderEmail = process.env.EMAIL_FROM as string;
  const senderName = process.env.EMAIL_FROM_NAME || 'Chipelibros';

  const totalFormateado = `$${total.toLocaleString('es-CL')}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; margin-bottom: 30px;">
        <div style="width: 80px; height: 80px; background: white; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px;">
          ✅
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">¡Pedido #${orderNumber} confirmado!</h1>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="padding: 15px; border-bottom: 1px solid #e9ecef; font-weight: 600;">Fecha</td>
          <td style="padding: 15px; border-bottom: 1px solid #e9ecef;">${fecha}</td>
        </tr>
        <tr style="background: #e8f5e8;">
          <td style="padding: 15px; font-weight: 600;">Total pagado</td>
          <td style="padding: 15px; font-weight: 700; color: #28a745;">${totalFormateado}</td>
        </tr>
        <tr>
          <td style="padding: 15px; font-weight: 600;">Método de pago</td>
          <td style="padding: 15px;">${metodoPago}</td>
        </tr>
      </table>

      <h3 style="color: #333; margin: 25px 0 15px;">📦 Tus productos:</h3>
      ${items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 15px; background: white; margin-bottom: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="flex: 1;">
            <strong style="font-size: 16px;">${item.name}</strong><br>
            <span style="color: #666; font-size: 14px;">Cant: ${item.quantity}</span>
          </div>
          <div style="text-align: right; font-weight: 700; font-size: 16px;">
            $${(item.price * item.quantity).toLocaleString('es-CL')}
          </div>
        </div>
      `).join('')}

      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 25px 0;">
        <h3 style="color: #166534; margin: 0 0 10px;">📍 Dirección de envío</h3>
        <p style="margin: 0; font-size: 15px;">${direccionEnvio}</p>
        <p style="margin: 5px 0 0; font-size: 15px;"><strong>📞 Teléfono:</strong> ${telefono}</p>
      </div>

      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
        <p style="margin: 0; color: #664d03;"><strong>⏰ Próximos pasos:</strong><br>
        Tu pedido será procesado en 24-48 horas hábiles. Recibirás actualizaciones por email.</p>
      </div>

      <hr style="margin: 30px 0;">
      <p style="color: #666; font-size: 14px; text-align: center;">
        ¿Necesitas ayuda? Escríbenos a <a href="mailto:contacto@chipe.com" style="color: #667eea;">contacto@chipe.com</a>
      </p>
    </div>
  `;

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [{ email, name: nombreCompleto || 'Cliente' }],
      subject: `✅ Chipelibros - Pedido #${orderNumber} confirmado`,
      htmlContent,
    },
    {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
};

/* ========== JWT helper ========== */

export const generarToken = (cliente: { id: number; id_rol: number }) => {
  return jwt.sign(
    {
      userId: cliente.id,
      roleId: cliente.id_rol,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/* ========== Verificar Email ========== */

export const verificarEmail = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp || otp.length !== 5) {
      return res.status(400).json({ message: 'Email y código OTP requeridos' });
    }

    const cliente = await prisma.clientes.findFirst({
      where: { 
        email,
        verification_token: otp,
        is_email_verified: false
      },
      include: {
        rol: true
      }
    });

    if (!cliente) {
      return res.status(400).json({ message: 'Código inválido o cuenta ya verificada' });
    }

    if (!cliente.verification_expires_at || cliente.verification_expires_at < new Date()) {
      return res.status(400).json({ message: 'Código expirado. Regístrate de nuevo.' });
    }

    await prisma.clientes.update({
      where: { id: cliente.id },
      data: {
        is_email_verified: true,
        verification_token: null,
        verification_expires_at: null
      }
    });

    const token = generarToken({ id: cliente.id, id_rol: cliente.id_rol });

    return res.status(200).json({
      message: 'Email verificado correctamente',
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        phone: cliente.phone,
        id_rol: cliente.id_rol
      },
      token
    });
  } catch (error) {
    console.error('Error verificar email:', error);
    return res.status(500).json({ message: 'Error al verificar email' });
  }
};

/* ========== ✅ NUEVO CONTROLLER: Enviar Comprobante de Pago ========== */

export const enviarComprobanteController = async (req: Request, res: Response) => {
  try {
    const {
      email,
      nombreCompleto,
      orderNumber,
      total,
      metodoPago,
      fecha,
      items,
      direccionEnvio,
      telefono
    } = req.body;

    // Validaciones básicas
    if (!email || !orderNumber || !items || items.length === 0) {
      return res.status(400).json({ 
        message: 'Email, orderNumber e items son requeridos' 
      });
    }

    // Enviar el comprobante
    await enviarComprobantePago(
      email,
      nombreCompleto || 'Cliente Chipelibros',
      orderNumber,
      total || 0,
      metodoPago || 'Webpay',
      fecha || new Date().toLocaleDateString('es-CL'),
      items,
      direccionEnvio || 'Pendiente de confirmación',
      telefono || ''
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Comprobante de pago enviado correctamente al cliente' 
    });

  } catch (error) {
    console.error('Error enviando comprobante:', error);
    return res.status(500).json({ 
      message: 'Error interno al enviar comprobante de pago',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};
