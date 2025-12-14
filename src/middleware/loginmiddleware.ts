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
    // si lo envías en header:
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // o si usas cookie:
    // const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; roleId: number };

    req.user = {
      id: payload.userId,
      roleId: payload.roleId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};
