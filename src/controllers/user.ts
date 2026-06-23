import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      userProfile: {
        name: user.name || 'Usuario',
        email: user.email,
        registrationDate: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { name, email } = req.body;

    const data: { name?: string; email?: string } = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    res.json({
      userProfile: {
        name: user.name || 'Usuario',
        email: user.email,
        registrationDate: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}
