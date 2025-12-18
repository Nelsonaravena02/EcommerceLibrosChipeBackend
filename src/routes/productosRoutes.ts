import express from 'express';
import {
  obtenerProductos,
  obtenerProductosPorCategoria,
  obtenerProductoPorID,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from '../controllers/productController.js';
import { authMiddleware, adminOnly } from '../middleware/loginmiddleware.js';

const router: express.Router = express.Router();

router.get('/', obtenerProductos);
router.get('/por-categoria', obtenerProductosPorCategoria);
router.get('/producto', obtenerProductoPorID);

router.post('/', authMiddleware, adminOnly, crearProducto);
router.put('/:id', authMiddleware, adminOnly, actualizarProducto);
router.delete('/:id', authMiddleware, adminOnly, eliminarProducto);

export default router;
