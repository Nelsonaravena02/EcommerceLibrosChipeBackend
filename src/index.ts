import express from 'express';
import router from './routes/productosRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { CreateUser } from './controllers/userAccountController.js'; // ajusta ruta
import authRouter from './routes/logingoogle.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ecommercechipelibros.pages.dev'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// Ruta productos
app.use('/api/productos', router);

// Ruta creación de usuarios
app.post('/api/clientes', CreateUser);

// Ruta para login google 
app.use('/api/auth', authRouter)

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
