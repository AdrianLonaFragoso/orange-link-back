import { Router } from 'express';
import { auth } from '../middleware/auth';
import { register, login, refresh, logout, me } from '../controllers/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', auth, logout);
router.get('/me', auth, me);

export default router;
