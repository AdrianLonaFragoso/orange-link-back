import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getStatus,
  getHistory,
  createMeasurement,
  updateTargets,
  getTips,
} from '../controllers/status';

const router = Router();

router.use(auth);

router.get('/', getStatus);
router.get('/history', getHistory);
router.post('/', createMeasurement);
router.put('/targets', updateTargets);
router.get('/tips', getTips);

export default router;
