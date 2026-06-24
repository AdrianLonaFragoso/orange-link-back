import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isEatingWindow(windowStart: string, windowEnd: string): boolean {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = windowStart.split(':').map(Number);
  const [eh, em] = windowEnd.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (end > start) {
    return nowMinutes >= start && nowMinutes <= end;
  }
  return nowMinutes >= start || nowMinutes <= end;
}

export async function getFasting(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const config = await prisma.fastingConfig.findUnique({ where: { userId } });

    res.json({
      planType: config?.planType ?? null,
      windowStart: config?.windowStart ?? null,
      windowEnd: config?.windowEnd ?? null,
      endDate: config ? config.endDate.toISOString().split('T')[0] : null,
      daysRemaining: config ? getDaysRemaining(config.endDate) : null,
      isEatingWindow: config ? isEatingWindow(config.windowStart, config.windowEnd) : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFasting(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { planType, windowStart, endDate } = req.body;

    if (!planType || !windowStart || !endDate) {
      throw new AppError(400, 'planType, windowStart and endDate are required');
    }

    const eatingHours = parseInt(planType.split('-')[1]);
    const [h, m] = windowStart.split(':').map(Number);
    const endH = (h + eatingHours) % 24;
    const windowEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const config = await prisma.fastingConfig.upsert({
      where: { userId },
      create: {
        userId,
        planType,
        windowStart,
        windowEnd,
        endDate: new Date(endDate),
      },
      update: {
        planType,
        windowStart,
        windowEnd,
        endDate: new Date(endDate),
      },
    });

    const daysRemaining = getDaysRemaining(config.endDate);
    const eating = isEatingWindow(config.windowStart, config.windowEnd);

    res.json({
      planType: config.planType,
      windowStart: config.windowStart,
      windowEnd: config.windowEnd,
      endDate: config.endDate.toISOString().split('T')[0],
      daysRemaining,
      isEatingWindow: eating,
    });
  } catch (err) {
    next(err);
  }
}
