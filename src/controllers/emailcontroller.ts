import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  TransactionalEmailsApi,
  SendSmtpEmail,
} from '@getbrevo/brevo';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET as string | undefined;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno');
}

/* ========== Brevo API ========== */

// Pasar apiKey en el constructor (forma simple)
const brevoClient = new TransactionalEmailsApi(
  process.env.BREVO_API_KEY as string
);

// Función para enviar email OTP
export const enviarEmailOTP = async (email: string, otp: string, nombreCompleto: string) => {
  const sendSmtpEmail: SendSmtpEmail = {
    to: [{ email, name: nombreCompleto }],
    sender: {
      email: process.env.EMAIL_FROM as string,
      name: process.env.EMAIL_FROM_NAME || 'Chipelibros',
    },
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
  };

  await brevoClient.sendTransacEmail(sendSmtpEmail);
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
