import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getTraining, updateTraining, toggleMission } from '../controllers/training';

const router = Router();

router.use(auth);

router.get('/', getTraining);
router.put('/', updateTraining);
router.put('/missions/:key', toggleMission);

export default router;
