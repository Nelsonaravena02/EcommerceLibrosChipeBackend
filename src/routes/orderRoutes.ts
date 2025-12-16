import { Router } from 'express';
import { crearOrden } from '../controllers/orderController.js';

const router: Router = Router(); 

router.post('/', crearOrden);

export default router;
