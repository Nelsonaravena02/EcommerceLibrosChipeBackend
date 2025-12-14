import { Router, type Router as ExpressRouter } from 'express';
import { CreateUser } from '../controllers/userAccountController.js';

const router: ExpressRouter = Router();

router.post('/usuarios', CreateUser);

export default router;
