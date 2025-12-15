import express from 'express';
import router from './routes/productosRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { CreateUser } from './controllers/userAccountController.js';
import authRouter from './routes/logingoogle.js';
import webpayRoutes from './routes/webpay.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ecommercechipelibros.pages.dev',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/productos', router);
app.post('/api/clientes', CreateUser);
app.use('/api/auth', authRouter);

app.use('/api/webpay', webpayRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
