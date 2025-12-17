import { Router } from "express";
import { verificarEmail,enviarComprobanteController} from '../controllers/emailcontroller.js'; 

const router: Router = Router();
router.post('/verificar-email', verificarEmail);
router.post('/enviar-comprobante', enviarComprobanteController);

export default router;
