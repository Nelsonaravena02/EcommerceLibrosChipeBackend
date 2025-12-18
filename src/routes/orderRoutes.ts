// src/routes/orderRoutes.ts
import { Router } from 'express';
import {
  crearOrden,
  obtenerOrdenes,
  obtenerOrdenPorId,
  eliminarOrden,
  actualizarOrden,
  obtenerOrdenesCliente, // ✅ AGREGADO
} from '../controllers/orderController.js';
import { authMiddleware, adminOnly } from '../middleware/loginmiddleware.js';

const router: Router = Router();

// ✅ NUEVA RUTA: Órdenes del cliente logueado (SOLO auth, NO admin)
router.get('/cliente', authMiddleware, obtenerOrdenesCliente);

// ✅ ADMIN: Todas las órdenes (sin auth para compatibilidad)
router.get('/', obtenerOrdenes);

// ✅ Resto SIN CAMBIOS
router.post('/', authMiddleware, crearOrden);
router.get('/:id', obtenerOrdenPorId);
router.put('/:id', authMiddleware, adminOnly, actualizarOrden);
router.delete('/:id', authMiddleware, adminOnly, eliminarOrden);

export default router;
