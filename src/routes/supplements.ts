import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getSupplements,
  addSupplement,
  deleteSupplement,
  toggleSupplement,
} from '../controllers/supplements';

const router = Router();

router.use(auth);

router.get('/', getSupplements);
router.post('/', addSupplement);
router.delete('/:id', deleteSupplement);
router.put('/:id/toggle', toggleSupplement);

export default router;
