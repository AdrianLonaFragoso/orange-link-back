import { Router } from 'express';
import {
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
  assignTemplate,
  getGlobalTemplates,
  createGlobalTemplate,
  deleteGlobalTemplate,
  getUserTrainingAdmin,
  updateRoutineDay,
  updateRoutinesBulk,
  requireAdmin,
  verifyAdmin,
  listUsersJson,
} from '../controllers/admin';

const router = Router();

// Auth (JSON API only — frontend at /admin and /coach)
router.post('/api/login', loginAdmin);
router.post('/api/logout', requireAdmin, logoutAdmin);
router.get('/api/verify', verifyAdmin);

// Users (super user only — /admin)
router.get('/api/users', requireAdmin, listUsersJson);
router.get('/users/json', requireAdmin, listUsersJson);
router.post('/api/users', requireAdmin, createUser);
router.put('/api/users/:id', requireAdmin, editUser);
router.delete('/api/users/:id', requireAdmin, deleteUser);
router.post('/api/users/:id/approve', requireAdmin, approveUser);
router.post('/api/users/:id/reject', requireAdmin, rejectUser);
// legacy HTML form aliases still support JSON via wantsJson
router.post('/approve/:id', approveUser);
router.post('/reject/:id', rejectUser);
router.post('/create', createUser);
router.post('/edit/:id', editUser);
router.post('/delete/:id', deleteUser);

// Templates globales (used by both /admin and /coach)
router.get('/templates/json', getGlobalTemplates);
router.get('/api/templates', requireAdmin, getGlobalTemplates);
router.post('/templates', createGlobalTemplate);
router.post('/api/templates', requireAdmin, createGlobalTemplate);
router.post('/templates/delete', deleteGlobalTemplate);
router.post('/api/templates/delete', requireAdmin, deleteGlobalTemplate);

// Training routines per user
router.get('/training/:userId/json', getUserTrainingAdmin);
router.get('/api/training/:userId', requireAdmin, getUserTrainingAdmin);
router.post('/routines/:userId/day', updateRoutineDay);
router.post('/api/routines/:userId/day', requireAdmin, updateRoutineDay);
router.post('/routines/:userId/bulk', updateRoutinesBulk);
router.post('/api/routines/:userId/bulk', requireAdmin, updateRoutinesBulk);

// Legacy per-user templates (deprecated, proxied to global)
router.get('/templates/:userId/json', getUserTemplates);
router.post('/templates/:userId', uploadTemplate);
router.post('/templates/:userId/delete', deleteTemplate);
router.post('/assign/:userId', assignTemplate);
router.post('/api/assign/:userId', requireAdmin, assignTemplate);

export default router;
