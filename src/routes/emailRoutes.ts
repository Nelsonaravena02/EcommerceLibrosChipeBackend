import { Router } from "express";
import { verificarEmail } from '../controllers/emailcontroller.js'; 

const router: Router = Router();
router.post('/verificar-email', verificarEmail);

export default router;
