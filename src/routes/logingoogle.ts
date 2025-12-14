import { Router } from 'express';
import { loginConGoogleController } from '../controllers/userAccountController.js';

const authRouter = Router();

authRouter.post('/google', loginConGoogleController);

export default authRouter;
