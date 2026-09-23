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
        height: user.height,
        weight: user.weight,
        age: user.age,
        sex: user.sex,
        activityLevel: user.activityLevel,
        avatarUrl: user.avatarUrl,
        theme: (user as any).theme || 'default',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { name, email, height, weight, age, sex, activityLevel, avatarUrl, theme } = req.body;

    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (height !== undefined) data.height = height;
    if (weight !== undefined) data.weight = weight;
    if (age !== undefined) data.age = age;
    if (sex !== undefined) data.sex = sex;
    if (activityLevel !== undefined) data.activityLevel = activityLevel;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (theme !== undefined) {
      const t = String(theme);
      if (t === 'default' || t === 'system-shadow' || t === 'peach') data.theme = t;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    res.json({
      userProfile: {
        name: user.name || 'Usuario',
        email: user.email,
        registrationDate: user.createdAt.toISOString(),
        height: user.height,
        weight: user.weight,
        age: user.age,
        sex: user.sex,
        activityLevel: user.activityLevel,
        avatarUrl: user.avatarUrl,
        theme: (user as any).theme || 'default',
      },
    });
  } catch (err) {
    next(err);
  }
}
