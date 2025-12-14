import express from 'express';
import { obtenerProductos, obtenerProductosPorCategoria, obtenerProductoPorID} from '../controllers/productController.js';

const router = express.Router();

router.get('/', obtenerProductos);
router.get('/por-categoria', obtenerProductosPorCategoria)
router.get('/producto', obtenerProductoPorID)
export default router;