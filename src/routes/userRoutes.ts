import { Router } from 'express';
import { CreateUser } from '../controllers/userAccountController.js';

const router = Router();

router.post('/usuarios', CreateUser);

export default router;
