import { Router } from 'express';
import {
  getAdmin,
  loginAdmin,
  logoutAdmin,
  approveUser,
  rejectUser,
  createUser,
  editUser,
  deleteUser,
} from '../controllers/admin';

const router = Router();

router.get('/', getAdmin);
router.post('/login', loginAdmin);
router.post('/logout', logoutAdmin);
router.post('/approve/:id', approveUser);
router.post('/reject/:id', rejectUser);
router.post('/create', createUser);
router.post('/edit/:id', editUser);
router.post('/delete/:id', deleteUser);

export default router;
