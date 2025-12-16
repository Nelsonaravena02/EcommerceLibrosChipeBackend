import { Router } from 'express';
import {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  eliminarOrden,
  actualizarOrden,   // 👈 importar
} from '../controllers/orderController.js';

const router: Router = Router();

router.post('/', crearOrden);
router.get('/', obtenerOrdenes);
router.get('/:id', obtenerOrdenPorId);
router.put('/:id', actualizarOrden);   // 👈 NUEVA RUTA
router.delete('/:id', eliminarOrden);

export default router;
