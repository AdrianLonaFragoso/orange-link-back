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
  getUserTemplates,
  uploadTemplate,
  deleteTemplate,
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
router.get('/templates/:userId/json', getUserTemplates);
router.post('/templates/:userId', uploadTemplate);
router.post('/templates/:userId/delete', deleteTemplate);

export default router;
