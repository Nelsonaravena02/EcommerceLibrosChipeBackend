// src/routes/webpay.ts - COMPLETO
import { Router } from 'express';
import { 
  createTransaction, 
  webpayReturn, 
  webpayCommit 
} from '../controllers/webpayController.js';

const router: Router = Router();

router.post('/create', createTransaction);
router.get('/return', webpayReturn);     
router.post('/commit', webpayCommit);    

export default router;
