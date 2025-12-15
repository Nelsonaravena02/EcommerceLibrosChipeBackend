// src/routes/webpay.ts
import { Router } from 'express';
import { createTransaction } from '../controllers/webpayController.js';

const router: Router = Router();

router.post('/create', createTransaction);

export default router;
