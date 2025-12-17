// src/routes/orderRoutes.ts
import { Router } from 'express';
import {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  eliminarOrden,
  actualizarOrden,
} from '../controllers/orderController.js';
import { authMiddleware, adminOnly } from '../middleware/loginmiddleware.js';

const router: Router = Router();

router.post('/', authMiddleware, adminOnly, crearOrden);


router.get('/', obtenerOrdenes);


router.get('/:id', obtenerOrdenPorId);


router.put('/:id', authMiddleware, adminOnly, actualizarOrden);
router.delete('/:id', authMiddleware, adminOnly, eliminarOrden);

export default router;
