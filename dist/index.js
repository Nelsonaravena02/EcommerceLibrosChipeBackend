import express from 'express';
import router from './routes/productosRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors'
dotenv.config();

const app = express();

// Permitir CORS para tu frontend
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ecommercechipelibros.pages.dev'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));


app.use(express.json());

// Rutas
app.use('/api/productos', router);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
