import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getHydration(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    });

    res.json({
      waterIntake: dailyLog.waterIntake,
      waterGoal: dailyLog.waterGoal,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateGoal(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { waterGoal } = req.body;

    if (typeof waterGoal !== 'number' || waterGoal <= 0) {
      throw new AppError(400, 'Valid waterGoal is required');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, waterGoal },
      update: { waterGoal },
    });

    res.json({ waterGoal: dailyLog.waterGoal });
  } catch (err) {
    next(err);
  }
}

export async function addIntake(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { amount } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      throw new AppError(400, 'Valid amount is required');
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, waterIntake: amount },
      update: { waterIntake: { increment: amount } },
    });

    res.json({ waterIntake: dailyLog.waterIntake, waterGoal: dailyLog.waterGoal });
  } catch (err) {
    next(err);
  }
}

export async function calculateHydration(req: Request, res: Response, next: NextFunction) {
  try {
    const { weight, activity, sex } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      throw new AppError(400, 'Valid weight is required');
    }

    let base = weight * 0.033;
    if (activity === 'high') base *= 1.3;
    else if (activity === 'moderate') base *= 1.15;
    if (sex === 'male') base *= 1.05;

    const recommended = Math.round(base * 10) / 10;
    res.json({ recommended });
  } catch (err) {
    next(err);
  }
}
