import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

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

    const token = generarToken({ id: nuevoCliente.id, id_rol: nuevoCliente.id_rol });

    return res.status(201).json({
      message: 'Cliente creado correctamente',
      cliente: nuevoCliente,
      token,
    });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    return res.status(500).json({
      message: 'Error interno del servidor al crear el cliente',
    });
  }
};

export const loginConGoogleController = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Falta credential de Google' });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID, // ya garantizado como string
    });

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

    const rolCliente = await prisma.rol.findUnique({
      where: { rol: 'cliente' },
    });

    if (!rolCliente) {
      return res.status(500).json({ message: 'Rol "cliente" no existe en la base de datos' });
    }

    let cliente = await prisma.clientes.findFirst({
      where: {
        OR: [{ google_id: googleId }, { email }],
      },
    });

    if (!cliente) {
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
    } else if (!cliente.google_id) {
      cliente = await prisma.clientes.update({
        where: { id: cliente.id },
        data: {
          google_id: googleId,
          is_email_verified: true,
        },
      });
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
    });
  }
};
