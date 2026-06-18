import { Router } from 'express';
import { auth } from '../middleware/auth';
import { calculateProtein, calculateCreatine } from '../controllers/calculators';

const router = Router();

router.use(auth);

router.post('/protein', calculateProtein);
router.post('/creatine', calculateCreatine);

export default router;
