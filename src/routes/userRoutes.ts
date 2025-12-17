import { Router, type Router as ExpressRouter } from 'express';
import { CreateUser,loginCliente } from '../controllers/userAccountController.js';

const router: ExpressRouter = Router();

router.post('/usuarios', CreateUser);
router.post('/api/login', loginCliente);

export default router;
