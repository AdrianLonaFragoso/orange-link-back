import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [dailyLog, config, fasting, measurements, supplements, plans] = await Promise.all([
      prisma.dailyLog.upsert({
        where: { userId_date: { userId, date: today } },
        create: { userId, date: today },
        update: {},
      }),
      prisma.trainingConfig.findUnique({ where: { userId } }),
      prisma.fastingConfig.findUnique({ where: { userId } }),
      prisma.bodyMeasurement.findFirst({
        where: { userId },
        orderBy: { measuredAt: 'desc' },
      }),
      prisma.supplement.findMany({ where: { userId } }),
      prisma.userNutritionPlan.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { selectedAt: 'desc' },
      }),
    ]);

    const targets = await prisma.bodyStatusTargets.findUnique({ where: { userId } });

    const dailyMissions = (dailyLog.dailyMissions as Record<string, boolean>) || {};
    const trainingMissions = (dailyLog.trainingMissions as Record<string, boolean>) || {};
    const supplementsTaken = (dailyLog.supplementsTaken as Record<string, boolean>) || {};

    const isAllTrainingDone = Object.values(trainingMissions).length > 0 && Object.values(trainingMissions).every(Boolean);
    const isAllSupplementsDone = supplements.length > 0 && supplements.every((s: { id: string }) => supplementsTaken[s.id]);

    const missions = [
      { key: 'water', label: 'Completa tu agua diaria', done: dailyMissions.water || false },
      { key: 'workout', label: 'Completa un entrenamiento', done: isAllTrainingDone || dailyMissions.workout || false },
      { key: 'supplements', label: 'Toma tus suplementos', done: isAllSupplementsDone || dailyMissions.supplements || false },
      { key: 'fasting', label: 'Completa tu ayuno', done: dailyMissions.fasting || false },
      { key: 'carbs', label: 'Control de carbohidratos', done: dailyMissions.carbs || false },
    ];

    const completedCount = missions.filter((m) => m.done).length;
    const progress = Math.round((completedCount / missions.length) * 100);

    res.json({
      progress,
      completedCount,
      totalMissions: missions.length,
      missions,
      modules: {
        nutrition: plans?.plan.name || null,
        fasting: {
          windowStart: fasting?.windowStart || '08:00',
          windowEnd: fasting?.windowEnd || '16:00',
        },
        training: {
          intensity: config?.intensity || 100,
        },
        hydration: {
          intake: dailyLog.waterIntake,
          goal: dailyLog.waterGoal,
        },
        supplements: {
          taken: Object.values(supplementsTaken).filter(Boolean).length,
          total: supplements.length,
        },
        bodyStatus: measurements ? { weight: measurements.weight } : null,
      },
      bodyStatusTargets: targets || null,
      selectedMeals: dailyLog.selectedMeals,
    });
  } catch (err) {
    next(err);
  }
}
