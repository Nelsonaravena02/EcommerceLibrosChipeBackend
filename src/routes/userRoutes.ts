import { Router, type Router as ExpressRouter } from 'express';
import { 
  CreateUser, 
  loginCliente,
  loginConGoogleController 
} from '../controllers/userAccountController.js';
import { 
  getPerfilCliente, 
  updatePerfilCliente, 
  cambiarPassword, 
  eliminarCuenta 
} from '../controllers/userAccountController.js'; 
import { authMiddleware } from '../middleware/loginmiddleware.js'; 

const router: ExpressRouter = Router();

router.post('/usuarios', CreateUser);
router.post('/login', loginCliente); 
router.post('/auth/google', loginConGoogleController);

router.use(authMiddleware); 

router.get('/perfil', getPerfilCliente);        
router.put('/perfil', updatePerfilCliente);
router.put('/password', cambiarPassword);
router.delete('/cuenta', eliminarCuenta);

export default router;
