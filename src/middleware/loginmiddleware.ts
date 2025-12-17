// src/middleware/authMiddleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthRequest extends Request {
  user?: {
    id: number;
    roleId: number;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; roleId: number };

    req.user = {
      id: payload.userId,
      roleId: payload.roleId,
    };

    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.roleId !== 1) {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }
  next();
};
