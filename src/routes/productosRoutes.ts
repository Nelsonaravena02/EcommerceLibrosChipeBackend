import express from 'express';
import {
  obtenerProductos,
  obtenerProductosPorCategoria,
  obtenerProductoPorID,
  crearProducto,
  actualizarProducto,
  eliminarProducto
} from '../controllers/productController.js';

const router: express.Router = express.Router();

// GET /api/productos
router.get('/', obtenerProductos);

// GET /api/productos/por-categoria?categoria=Nombre
router.get('/por-categoria', obtenerProductosPorCategoria);

// GET /api/productos/producto?id=123
router.get('/producto', obtenerProductoPorID);

// POST /api/productos
router.post('/', crearProducto);

// PUT /api/productos/:id
router.put('/:id', actualizarProducto);

// DELETE /api/productos/:id   
router.delete('/:id', eliminarProducto);

export default router;
