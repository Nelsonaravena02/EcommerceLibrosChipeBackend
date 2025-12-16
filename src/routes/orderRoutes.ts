import { Router } from 'express';
import { crearOrden, obtenerOrdenes, obtenerOrdenPorId } from '../controllers/orderController.js';

const router: Router = Router(); 

router.post('/', crearOrden);
router.get('/', obtenerOrdenes);
router.get('/:id', obtenerOrdenPorId);

export default router;
