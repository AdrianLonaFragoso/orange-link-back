import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getPlans,
  getCurrentNutrition,
  updateNutritionPlan,
  updateMeals,
} from '../controllers/nutrition';

const router = Router();

router.use(auth);

router.get('/plans', getPlans);
router.get('/current', getCurrentNutrition);
router.put('/plan', updateNutritionPlan);
router.put('/meals', updateMeals);

export default router;
