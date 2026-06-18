import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getDashboard } from '../controllers/dashboard';

const router = Router();

router.use(auth);

router.get('/', getDashboard);

export default router;
