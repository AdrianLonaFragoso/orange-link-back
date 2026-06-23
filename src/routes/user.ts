import { Router } from 'express';
import { auth } from '../middleware/auth';
import { getProfile, updateProfile } from '../controllers/user';

const router = Router();

router.use(auth);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;
