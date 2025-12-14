import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const obtenerProductos = async (req, res) => {
    try {
        const productos = await prisma.productos.findMany({
            where: { is_active: true },
            include: {
                categorias: {
                    select: {
                        nombre: true, // ✅ traer solo el nombre de la categoría
                    },
                },
            },
        });
        // Opcional: aplanar el objeto para frontend
        const productosConCategoria = productos.map((p) => ({
            ...p,
            categoria: p.categorias?.nombre || null,
        }));
        res.json(productosConCategoria);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los productos" });
    }
};
export const obtenerProductosPorCategoria = async (req, res) => {
    try {
        const categoriaId = parseInt(req.query.categoria);
        if (!categoriaId) {
            return res.status(400).json({ error: 'Debe enviar un id de categoria válido' });
        }
        const productosFiltrados = await prisma.productos.findMany({
            where: {
                is_active: true,
                id_categoria: categoriaId
            },
            include: {
                categorias: true
            }
        });
        const productosConCategoria = productosFiltrados.map(p => ({
            ...p,
            categoria: p.categorias?.nombre,
        }));
        res.json(productosConCategoria);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los productos por categoria" });
    }
};
//# sourceMappingURL=productController.js.map