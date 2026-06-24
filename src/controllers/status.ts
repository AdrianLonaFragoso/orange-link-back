import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const lastMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const targets = await prisma.bodyStatusTargets.findUnique({ where: { userId } });

    res.json({
      bodyStatus: lastMeasurement || null,
      bodyStatusTargets: targets || null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const measurements = await prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
      take: 50,
    });

    res.json({ measurements });
  } catch (err) {
    next(err);
  }
}

export async function createMeasurement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { weight, height, bodyFat, visceralFat, skeletalMuscle, restingMetabolism } = req.body;

    if (typeof weight !== 'number' || typeof height !== 'number') {
      throw new AppError(400, 'weight and height are required');
    }

    const bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;

    const measurement = await prisma.bodyMeasurement.create({
      data: {
        userId,
        measuredAt: new Date(),
        weight,
        height,
        bodyFat: bodyFat ?? null,
        visceralFat: visceralFat ?? null,
        skeletalMuscle: skeletalMuscle ?? null,
        bmi,
        restingMetabolism: restingMetabolism ?? null,
      },
    });

    res.status(201).json({ measurement });
  } catch (err) {
    next(err);
  }
}

export async function updateTargets(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { weight, bodyFat, visceralFat, skeletalMuscle, bmi } = req.body;

    const targets = await prisma.bodyStatusTargets.upsert({
      where: { userId },
      create: {
        userId,
        weight: weight ?? null,
        bodyFat: bodyFat ?? null,
        visceralFat: visceralFat ?? null,
        skeletalMuscle: skeletalMuscle ?? null,
        bmi: bmi ?? null,
      },
      update: {
        weight: weight !== undefined ? weight : undefined,
        bodyFat: bodyFat !== undefined ? bodyFat : undefined,
        visceralFat: visceralFat !== undefined ? visceralFat : undefined,
        skeletalMuscle: skeletalMuscle !== undefined ? skeletalMuscle : undefined,
        bmi: bmi !== undefined ? bmi : undefined,
      },
    });

    res.json({ bodyStatusTargets: targets });
  } catch (err) {
    next(err);
  }
}

function getCondition(bmi: number) {
  if (bmi < 18.5) return { label: 'Bajo peso', color: 'amber' };
  if (bmi < 25) return { label: 'Normal', color: 'green' };
  if (bmi < 30) return { label: 'Sobrepeso', color: 'orange' };
  return { label: 'Obesidad', color: 'red' };
}

export async function getTips(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;

    const last = await prisma.bodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredAt: 'desc' },
    });

    const targets = await prisma.bodyStatusTargets.findUnique({ where: { userId } });

    const tips: { title: string; text: string }[] = [];

    if (last && targets) {
      if (targets.weight && last.weight > targets.weight) {
        tips.push({
          title: 'Pérdida de Peso',
          text: 'Prueba el ayuno intermitente 16:8 para regular tu insulina y acelerar la quema de grasa.',
        });
      }
      if (targets.bodyFat && last.bodyFat > targets.bodyFat) {
        tips.push({
          title: 'Grasa Corporal',
          text: 'Aumenta tu consumo de proteína (1.6g/kg) para proteger tu músculo mientras pierdes grasa.',
        });
      }
      if (last.visceralFat > 9) {
        tips.push({
          title: 'Salud Visceral',
          text: 'Reduce azúcares procesados y alcohol para disminuir la grasa que rodea tus órganos.',
        });
      }
      if (targets.skeletalMuscle && last.skeletalMuscle < targets.skeletalMuscle) {
        tips.push({
          title: 'Masa Muscular',
          text: 'Prioriza el entrenamiento de fuerza pesado y asegúrate de descansar al menos 7-8 horas.',
        });
      }
      if (last.bmi > 25) {
        tips.push({
          title: 'Comp. Corporal',
          text: 'Céntrate en la recomposición corporal (perder grasa/ganar músculo) antes que solo en el peso.',
        });
      }
    }

    if (tips.length === 0) {
      tips.push({
        title: '¡Excelente Estado!',
        text: 'Estás en tus metas. Mantén la consistencia y sigue registrando tus marcas cada semana.',
      });
    }

    res.json({ tips });
  } catch (err) {
    next(err);
  }
}
