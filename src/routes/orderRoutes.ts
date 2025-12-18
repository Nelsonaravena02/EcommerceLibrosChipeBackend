import { Router } from 'express';
import {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  eliminarOrden,
  actualizarOrden,
  obtenerOrdenesCliente,
} from '../controllers/orderController.js';
import { authMiddleware, adminOnly } from '../middleware/loginmiddleware.js';

const router: Router = Router();


router.get('/cliente', authMiddleware, obtenerOrdenesCliente);


router.get('/', obtenerOrdenes);

router.post('/', authMiddleware,crearOrden);
router.get('/:id', obtenerOrdenPorId);
router.put('/:id', authMiddleware, adminOnly, actualizarOrden);
router.delete('/:id', authMiddleware, adminOnly, eliminarOrden);

export default router;
