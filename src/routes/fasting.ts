import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getFasting, updateFasting } from '../controllers/fasting';

const router = Router();

router.use(auth);

router.get('/', getFasting);
router.put('/', updateFasting);

export default router;
