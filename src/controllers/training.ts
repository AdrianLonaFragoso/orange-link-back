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

export async function getTraining(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let config = await prisma.trainingConfig.findUnique({ where: { userId } });

    if (!config) {
      const defaultEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      config = await prisma.trainingConfig.create({
        data: { userId, intensity: 100, endDate: defaultEnd },
      });
    }

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    });

    const trainingMissions = (dailyLog.trainingMissions as Record<string, boolean>) || {};

    res.json({
      intensity: config.intensity,
      endDate: config.endDate.toISOString().split('T')[0],
      daysRemaining: getDaysRemaining(config.endDate),
      trainingMissions,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTraining(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { intensity, endDate } = req.body;

    if (intensity !== undefined && (typeof intensity !== 'number' || intensity < 10 || intensity > 100)) {
      throw new AppError(400, 'Intensity must be between 10 and 100');
    }

    const data: any = {};
    if (intensity !== undefined) data.intensity = intensity;
    if (endDate) data.endDate = new Date(endDate);

    const config = await prisma.trainingConfig.upsert({
      where: { userId },
      create: {
        userId,
        intensity: intensity ?? 100,
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: data,
    });

    res.json({
      intensity: config.intensity,
      endDate: config.endDate.toISOString().split('T')[0],
      daysRemaining: getDaysRemaining(config.endDate),
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleMission(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const key = req.params.key as string;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const validKeys = ['squats', 'situps', 'pushups', 'running'];
    if (!validKeys.includes(key)) {
      throw new AppError(400, `Invalid mission key: ${key}`);
    }

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, trainingMissions: { [key]: true } },
      update: {},
    });

    const current = (dailyLog.trainingMissions as Record<string, boolean>) || {};
    const newValue = !current[key];

    const updated = await prisma.dailyLog.update({
      where: { userId_date: { userId, date: today } },
      data: {
        trainingMissions: { ...current, [key]: newValue },
      },
    });

    res.json({ trainingMissions: updated.trainingMissions });
  } catch (err) {
    next(err);
  }
}
