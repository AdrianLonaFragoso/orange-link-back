import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getSupplements(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const supplements = await prisma.supplement.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const dailyLog = await prisma.dailyLog.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    const supplementsTaken = (dailyLog?.supplementsTaken as Record<string, boolean>) || {};

    const result = supplements.map((s) => ({
      id: s.id,
      name: s.name,
      taken: supplementsTaken[s.id] || false,
    }));

    res.json({ supplements: result });
  } catch (err) {
    next(err);
  }
}

export async function addSupplement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'Name is required');
    }

    const supplement = await prisma.supplement.create({
      data: { userId, name: name.trim() },
    });

    res.status(201).json({ supplement });
  } catch (err) {
    next(err);
  }
}

export async function deleteSupplement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const id = req.params.id as string;

    const supp = await prisma.supplement.findUnique({ where: { id } });
    if (!supp || supp.userId !== userId) {
      throw new AppError(404, 'Supplement not found');
    }

    await prisma.supplement.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function toggleSupplement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const id = req.params.id as string;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const supp = await prisma.supplement.findUnique({ where: { id } });
    if (!supp || supp.userId !== userId) {
      throw new AppError(404, 'Supplement not found');
    }

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        supplementsTaken: { [id]: true },
      },
      update: {
        supplementsTaken: undefined,
      },
    });

    const current = (dailyLog.supplementsTaken as Record<string, boolean>) || {};
    const newValue = !current[id];

    const updated = await prisma.dailyLog.update({
      where: { userId_date: { userId, date: today } },
      data: {
        supplementsTaken: { ...current, [id]: newValue },
      },
    });

    res.json({ taken: (updated.supplementsTaken as Record<string, boolean>)[id] });
  } catch (err) {
    next(err);
  }
}
