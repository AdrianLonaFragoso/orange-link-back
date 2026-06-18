import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const DEFAULT_PLANS = [
  { name: 'Keto Full', description: 'Dieta cetogénica estricta, alta en grasas y baja en carbohidratos' },
  { name: 'Carnívora', description: 'Solo alimentos de origen animal' },
  { name: 'Low Carb', description: 'Baja en carbohidratos, moderada en proteínas y grasas' },
  { name: 'OMAD', description: 'One Meal A Day - una sola comida al día' },
  { name: 'Cetogénica 2.0', description: 'Versión moderna de la dieta keto con más flexibilidad' },
];

export async function seedPlans() {
  for (const plan of DEFAULT_PLANS) {
    await prisma.nutritionPlan.upsert({
      where: { name: plan.name },
      create: plan,
      update: {},
    });
  }
}

export async function getPlans(_req: Request, res: Response, next: NextFunction) {
  try {
    const plans = await prisma.nutritionPlan.findMany({ orderBy: { name: 'asc' } });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentNutrition(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const userPlan = await prisma.userNutritionPlan.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { selectedAt: 'desc' },
    });

    const dailyLog = await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today },
      update: {},
    });

    res.json({
      nutritionPlan: userPlan?.plan.name || null,
      selectedMeals: dailyLog.selectedMeals,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateNutritionPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { planName } = req.body;

    if (!planName || typeof planName !== 'string') {
      throw new AppError(400, 'planName is required');
    }

    const plan = await prisma.nutritionPlan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new AppError(404, `Plan "${planName}" not found`);
    }

    await prisma.userNutritionPlan.upsert({
      where: { userId_nutritionPlanId: { userId, nutritionPlanId: plan.id } },
      create: { userId, nutritionPlanId: plan.id },
      update: { selectedAt: new Date() },
    });

    res.json({ nutritionPlan: plan.name });
  } catch (err) {
    next(err);
  }
}

export async function updateMeals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { desayuno, comida, cena, snack } = req.body;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const selectedMeals = { desayuno, comida, cena, snack };

    await prisma.dailyLog.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, selectedMeals },
      update: { selectedMeals },
    });

    res.json({ selectedMeals });
  } catch (err) {
    next(err);
  }
}
