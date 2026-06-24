import { Router } from 'express';
import {
  getAdmin,
  loginAdmin,
  logoutAdmin,
  approveUser,
  rejectUser,
} from '../controllers/admin';

const router = Router();

router.get('/', getAdmin);
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.post('/approve/:id', approveUser);
router.post('/reject/:id', rejectUser);

export default router;
