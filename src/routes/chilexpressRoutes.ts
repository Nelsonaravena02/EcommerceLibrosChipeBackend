import { Router } from 'express';
import { getShippingQuote } from '../controllers/chileexpressController.js';

const router: Router = Router();
router.post('/quote', getShippingQuote);

export default router;
