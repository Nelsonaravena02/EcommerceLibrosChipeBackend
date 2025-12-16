// routes/ordenes.ts
import express from 'express';
import { crearOrden } from '../controllers/orderController.js';

const router = express.Router();

router.post('/', crearOrden);

export default router;

