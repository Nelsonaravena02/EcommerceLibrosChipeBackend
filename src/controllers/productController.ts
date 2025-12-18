import type { Request, Response } from 'express';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerProductos = async (req: Request, res: Response) => {
  try {
    const productos = await prisma.productos.findMany({
      where: { is_active: true },
      include: {
        categorias: {
          select: {
            nombre: true, 
          },
        },
      },
    });

    
    const productosConCategoria = productos.map((p) => ({
      ...p,
      categoria: p.categorias?.nombre || null,
    }));

    res.json(productosConCategoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los productos" });
  }
};

export const obtenerProductosPorCategoria = async (req: Request, res: Response) => {
  try {
    const categoriaNombre = req.query.categoria as string;

    if (!categoriaNombre || categoriaNombre.trim() === '') {
      return res.status(400).json({
        error: 'Debe enviar un nombre de categoría válido'
      });
    }

    const productos = await prisma.productos.findMany({
      where: {
        is_active: true,
        categorias: {
          nombre: categoriaNombre
        }
      },
      include: {
        categorias: true
      }
    });

    const productosConCategoria = productos.map(p => ({
      ...p,
      categoria: p.categorias?.nombre
    }));

    res.json(productosConCategoria);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error al obtener los productos por categoría'
    });
  }
};

export const obtenerProductoPorID = async (req: Request, res: Response) => {
  try {
    const product_id = parseInt(req.query.id as string);

    if (!product_id) {
      return res.status(400).json({ error: 'Debe enviar un id de producto válido' });
    }

    const producto = await prisma.productos.findUnique({
      where: { id: product_id },
      include: {
        categorias: true 
      }
    });

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const productoFinal = {
      ...producto,
      categoria: producto.categorias?.nombre 
    };

    res.json(productoFinal);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el producto por id" });
  }
};

export const crearProducto = async (req: Request, res: Response) => {
  try {
    const {
      nombre,
      descripcion,
      autor,
      categoriaNombre,
      precio,
      stock,
      isbn,
      encuadernacion,
      numero_paginas,
      editorial,
      idioma,
      tamano,
      descuento,
      image_url,
    } = req.body;

    if (!nombre || !descripcion || precio == null || stock == null || !isbn) {
      return res.status(400).json({
        error: 'Nombre, descripción, precio, stock e ISBN son obligatorios',
      });
    }

    if (!categoriaNombre || categoriaNombre.trim() === '') {
      return res.status(400).json({
        error: 'Debe enviar un nombre de categoría válido',
      });
    }

    let categoria = await prisma.categorias.findFirst({
      where: { nombre: categoriaNombre },
    });

    if (!categoria) {
      categoria = await prisma.categorias.create({
        data: { nombre: categoriaNombre },
      });
    }

    const precioNumber = Number(precio);
    const descuentoNumber = descuento != null ? Number(descuento) : 0;
    const precioFinal = Math.round(
      precioNumber * (1 - descuentoNumber / 100),
    );

    const nuevoProducto = await prisma.productos.create({
      data: {
        nombre,
        descripcion,
        autor,
        precio: precioNumber,
        stock: Number(stock),
        isbn,                               
        encuadernacion,
        numero_paginas: numero_paginas
          ? Number(numero_paginas)
          : null,
        editorial,
        idioma,
        shipping_size: tamano,             
        discount: descuentoNumber,       
        precio_final: precioFinal,       
        image_url,
        is_active: true,
        id_categoria: categoria.id,
      },
      include: {
        categorias: {
          select: { nombre: true },
        },
      },
    });

    const productoConCategoria = {
      ...nuevoProducto,
      categoria: nuevoProducto.categorias?.nombre || null,
    };

    return res.status(201).json(productoConCategoria);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Error al crear el producto' });
  }
};

export const actualizarProducto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      autor,
      categoriaNombre,
      precio,
      stock,
      isbn,
      encuadernacion,
      numero_paginas,
      editorial,
      idioma,
      tamano,       
      descuento,    
      image_url,
    } = req.body;

    const productId = Number(id);
    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    if (!nombre || !descripcion || precio == null || stock == null || !isbn) {
      return res.status(400).json({
        error: 'Nombre, descripción, precio, stock e ISBN son obligatorios',
      });
    }

    const productoExistente = await prisma.productos.findUnique({
      where: { id: productId },
    });

    if (!productoExistente) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    let idCategoria: number | null = productoExistente.id_categoria ?? null;

    if (categoriaNombre && categoriaNombre.trim() !== '') {
      let categoria = await prisma.categorias.findFirst({
        where: { nombre: categoriaNombre },
      });

      if (!categoria) {
        categoria = await prisma.categorias.create({
          data: { nombre: categoriaNombre },
        });
      }

      idCategoria = categoria.id;
    }

    const precioNumber = Number(precio);
    const descuentoNumber =
      descuento != null ? Number(descuento) : Number(productoExistente.discount);
    const precioFinal = Math.round(
      precioNumber * (1 - descuentoNumber / 100),
    );

    const data: any = {
      nombre,
      descripcion,
      precio: precioNumber,
      stock: Number(stock),
      isbn,
      discount: descuentoNumber,
      precio_final: precioFinal,
      updated_at: new Date(),
    };

    if (autor !== undefined) data.autor = autor;
    if (encuadernacion !== undefined) data.encuadernacion = encuadernacion;
    if (numero_paginas !== undefined)
      data.numero_paginas = numero_paginas ? Number(numero_paginas) : null;
    if (editorial !== undefined) data.editorial = editorial;
    if (idioma !== undefined) data.idioma = idioma;
    if (tamano !== undefined) data.shipping_size = tamano;
    if (image_url !== undefined) data.image_url = image_url;
    if (idCategoria !== null) data.id_categoria = idCategoria;

    const productoActualizado = await prisma.productos.update({
      where: { id: productId },
      data,
      include: {
        categorias: {
          select: { nombre: true },
        },
      },
    });

    const productoConCategoria = {
      ...productoActualizado,
      categoria: productoActualizado.categorias?.nombre ?? null,
    };

    return res.status(200).json(productoConCategoria);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Error al actualizar el producto' });
  }
};

export const eliminarProducto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);

    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    const productoExistente = await prisma.productos.findUnique({
      where: { id: productId },
    });

    if (!productoExistente) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await prisma.productos.update({
      where: { id: productId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    return res.status(204).send(); 
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: 'Error al eliminar el producto' });
  }
};

