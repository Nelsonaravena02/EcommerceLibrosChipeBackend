// routes/webpay.ts o en tu app principal
import { Router } from 'express';
import { createTransaction } from '../controllers/webpayController.js';

const router = Router();

router.post('/create', createTransaction);

export default router;
