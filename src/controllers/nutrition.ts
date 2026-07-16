import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const NUTRITION_TEMPLATES = [
  { name: 'Keto Full', portions: 0, proteinG: 150, veggieG: 400, description: 'Dieta cetogénica estricta, 0 porciones de carbohidratos' },
  { name: 'Low Carb', portions: 2, proteinG: 130, veggieG: 350, description: 'Baja en carbohidratos, 2 porciones al día' },
  { name: 'Mid Carb', portions: 6, proteinG: 120, veggieG: 300, description: 'Carbohidratos moderados, 6 porciones al día' },
  { name: 'Balance Carb', portions: 12, proteinG: 100, veggieG: 250, description: 'Dieta balanceada, 12 porciones de carbohidratos al día' },
];

export async function seedPlans() {
  for (const plan of NUTRITION_TEMPLATES) {
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
      portions: userPlan?.plan.portions || 0,
      proteinG: userPlan?.plan.proteinG || null,
      veggieG: userPlan?.plan.veggieG || null,
      startDate: userPlan?.startDate?.toISOString() || null,
      endDate: userPlan?.endDate?.toISOString() || null,
      durationType: userPlan?.durationType || null,
      selectedMeals: dailyLog.selectedMeals,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateNutritionPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.authUser!.userId;
    const { planName, startDate, endDate, durationType } = req.body;

    if (!planName || typeof planName !== 'string') {
      throw new AppError(400, 'planName is required');
    }

    const plan = await prisma.nutritionPlan.findUnique({ where: { name: planName } });
    if (!plan) {
      throw new AppError(404, `Plan "${planName}" not found`);
    }

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    await prisma.userNutritionPlan.upsert({
      where: { userId_nutritionPlanId: { userId, nutritionPlanId: plan.id } },
      create: {
        userId,
        nutritionPlanId: plan.id,
        startDate: start,
        endDate: end,
        durationType: durationType || null,
      },
      update: {
        selectedAt: new Date(),
        startDate: start,
        endDate: end,
        durationType: durationType || null,
      },
    });

    res.json({
      nutritionPlan: plan.name,
      portions: plan.portions,
      proteinG: plan.proteinG,
      veggieG: plan.veggieG,
      startDate: start?.toISOString() || null,
      endDate: end?.toISOString() || null,
      durationType: durationType || null,
    });
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
