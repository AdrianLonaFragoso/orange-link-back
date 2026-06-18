import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getHydration,
  updateGoal,
  addIntake,
  calculateHydration,
} from '../controllers/hydration';

const router = Router();

router.use(auth);

router.get('/', getHydration);
router.put('/goal', updateGoal);
router.post('/intake', addIntake);
router.post('/calculate', calculateHydration);

export default router;
