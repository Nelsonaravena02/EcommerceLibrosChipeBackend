import { Router, type Router as ExpressRouter } from 'express';
import { loginConGoogleController } from '../controllers/userAccountController.js';

const authRouter: ExpressRouter = Router();

authRouter.post('/google', loginConGoogleController);

export default authRouter;
