import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthPayload;
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const configuredId = process.env.DEFAULT_USER_ID;
    if (configuredId) {
      req.authUser = { userId: configuredId, email: '' };
      return next();
    }

    const user = await prisma.user.findFirst();
    if (!user) {
      res.status(500).json({ error: 'No default user configured' });
      return;
    }

    req.authUser = { userId: user.id, email: user.email };
    next();
  } catch {
    res.status(500).json({ error: 'Auth setup failed' });
  }
}
