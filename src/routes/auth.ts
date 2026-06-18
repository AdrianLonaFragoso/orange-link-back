import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { generateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login` }),
  (req: Request, res: Response) => {
    const user = req.user as { id: string; email: string };
    const token = generateToken({ userId: user.id, email: user.email });
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  },
);

router.get('/me', async (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(200).json({ user: null });
    return;
  }

  try {
    const payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET || 'fallback-secret',
    ) as { userId: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

export default router;
