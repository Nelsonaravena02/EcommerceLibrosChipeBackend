import express from 'express';
import { obtenerProductos, obtenerProductosPorCategoria } from '../controllers/productController.js';
const router = express.Router();
router.get('/', obtenerProductos);
router.get('/por-categoria', obtenerProductosPorCategoria);
export default router;
//# sourceMappingURL=productosRoutes.js.map