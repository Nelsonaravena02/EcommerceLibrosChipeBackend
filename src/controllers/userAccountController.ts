import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { enviarEmailOTP } from './emailcontroller.js';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET as string | undefined;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en las variables de entorno');
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string | undefined;
if (!GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID no está definido en las variables de entorno');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Función helper para generar token
const generarToken = (cliente: { id: number; id_rol: number }) => {
  return jwt.sign(
    {
      userId: cliente.id,
      roleId: cliente.id_rol,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const CreateUser = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, email, password, phone } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const existing = await prisma.clientes.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const rolCliente = await prisma.rol.findUnique({
      where: { rol: 'cliente' },
    });

    if (!rolCliente) {
      return res.status(500).json({
        message: 'Rol "cliente" no existe en la base de datos',
      });
    }

    const nuevoCliente = await prisma.clientes.create({
      data: {
        nombre,
        apellido,
        email,
        password: hashedPassword,
        phone,
        id_rol: rolCliente.id,
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        phone: true,
        id_rol: true,
        c_at: true,
      },
    });

    // Generar OTP de 5 dígitos y fecha de expiración (10 minutos)
    const otp = crypto.randomInt(10000, 99999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await prisma.clientes.update({
      where: { id: nuevoCliente.id },
      data: {
        verification_token: otp,
        verification_expires_at: expiresAt,
        is_email_verified: false
      }
    });

    await enviarEmailOTP(email, otp, `${nombre} ${apellido}`);

    return res.status(201).json({
      message: 'Revisa tu email para verificar la cuenta',
      cliente: { 
        id: nuevoCliente.id, 
        email: nuevoCliente.email 
      }
      // NO devuelves token hasta verificación
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al crear el cliente',
    });
  }
};

// ✅ NUEVO: Login con email/password
export const loginCliente = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const cliente = await prisma.clientes.findUnique({
      where: { email },
      include: { 
        rol: true 
      }
    });

    if (!cliente || !cliente.password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!cliente.is_email_verified) {
      return res.status(403).json({ message: 'Verifica tu email primero' });
    }

    const passwordValido = await bcrypt.compare(password, cliente.password);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generarToken({ id: cliente.id, id_rol: cliente.id_rol });

    return res.status(200).json({
      message: 'Login exitoso',
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
    console.error('Error login:', error);
    return res.status(500).json({ message: 'Error en login' });
  }
};

export const loginConGoogleController = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    console.log('Credential recibido:', credential);
    console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Falta o es inválido el credential de Google' });
    }

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error('Error en verifyIdToken:', verifyError);
      return res.status(401).json({ message: 'Token de Google inválido o expirado' });
    }

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Token de Google inválido' });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const nombreCompleto = payload.name || '';
    const nombre = nombreCompleto.split(' ')[0] || '';
    const apellido = nombreCompleto.split(' ').slice(1).join(' ') || '';

    if (!email || !googleId) {
      return res.status(400).json({ message: 'No se pudo obtener email o google_id' });
    }

    let rolCliente = await prisma.rol.findUnique({
      where: { rol: 'cliente' },
    });

    // Crear rol "cliente" automáticamente si no existe
    if (!rolCliente) {
      console.warn('Rol "cliente" no existe, creando automáticamente...');
      rolCliente = await prisma.rol.create({
        data: { rol: 'cliente' },
      });
      console.log('Rol "cliente" creado:', rolCliente);
    }

    let cliente = await prisma.clientes.findFirst({
      where: {
        OR: [{ google_id: googleId }, { email }],
      },
    });

    if (!cliente) {
      console.log('Usuario no encontrado, creando nuevo cliente...');
      cliente = await prisma.clientes.create({
        data: {
          nombre: nombre || 'Usuario',
          apellido: apellido || null,
          email,
          google_id: googleId,
          is_email_verified: true,
          id_rol: rolCliente.id,
        },
      });
      console.log('Cliente creado:', cliente);
    } else if (!cliente.google_id) {
      console.log('Cliente existente sin google_id, actualizando...');
      cliente = await prisma.clientes.update({
        where: { id: cliente.id },
        data: {
          google_id: googleId,
          is_email_verified: true,
        },
      });
      console.log('Cliente actualizado:', cliente);
    } else {
      console.log('Cliente existente encontrado:', cliente);
    }

    const token = generarToken({ id: cliente.id, id_rol: cliente.id_rol });

    return res.status(200).json({
      message: 'Login con Google exitoso',
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        id_rol: cliente.id_rol,
      },
      token,
    });
  } catch (error) {
    console.error('Error en login con Google:', error);
    return res.status(500).json({
      message: 'Error interno en login con Google',
      error: error instanceof Error ? error.message : error,
    });
  }
};
