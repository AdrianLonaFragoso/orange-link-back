import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

export function calculateProtein(req: Request, res: Response, next: NextFunction) {
  try {
    const { weight, activityLevel, scoopSize } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      throw new AppError(400, 'Valid weight is required');
    }

    const activityMultipliers: Record<string, number> = {
      sedentary: 0.8,
      light: 1.0,
      moderate: 1.2,
      active: 1.6,
      very_active: 2.0,
    };

    const multiplier = activityMultipliers[activityLevel as string] || 1.2;
    const dailyGoal = Math.round(weight * multiplier * 10) / 10;

    let scoopsNeeded = null;
    if (scoopSize && typeof scoopSize === 'number' && scoopSize > 0) {
      scoopsNeeded = Math.ceil(dailyGoal / scoopSize);
    }

    res.json({ dailyGoal, scoopsNeeded });
  } catch (err) {
    next(err);
  }
}

export function calculateCreatine(req: Request, res: Response, next: NextFunction) {
  try {
    const { weight, phase } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
      throw new AppError(400, 'Valid weight is required');
    }

    let dose: number;
    let duration: number;

    if (phase === 'loading') {
      dose = Math.round(weight * 0.3 * 10) / 10;
      duration = 7;
    } else {
      dose = Math.round(weight * 0.03 * 10) / 10;
      duration = 0;
    }

    res.json({ dose, phase: phase || 'maintenance', duration });
  } catch (err) {
    next(err);
  }
}
