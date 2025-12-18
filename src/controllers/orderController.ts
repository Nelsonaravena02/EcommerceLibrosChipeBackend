import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../middleware/loginmiddleware.js';

const prisma = new PrismaClient();

/* ======================================================
   CREAR ORDEN (CLIENTE AUTENTICADO)
   ====================================================== */
export const crearOrden = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🟢 crearOrden ejecutado');

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const {
      id_status_ordenes,
      costo_envio,
      id_comuna_destino,
      comments,
      items,
      total_precio,
      payment,
    } = req.body;

    if (!id_status_ordenes) {
      return res.status(400).json({ error: 'id_status_ordenes es obligatorio' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe enviar al menos un item' });
    }

    if (typeof total_precio !== 'number') {
      return res.status(400).json({ error: 'total_precio debe ser un número' });
    }

    const nuevaOrden = await prisma.$transaction(async (tx) => {
      /* ---------------- ORDEN ---------------- */
      const orden = await tx.ordenes.create({
        data: {
          id_cliente: req.user!.id,
          total_precio,
          id_status_ordenes,
          id_location: 1, // placeholder mientras no tengas direcciones
          costo_envio: costo_envio ?? null,
          id_comuna_destino: id_comuna_destino ?? null,
          comments: comments ?? null,
        },
      });

      /* ---------------- ITEMS ---------------- */
      await tx.ordenes_items.createMany({
        data: items.map((item: any) => ({
          id_orden: orden.id,
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario_congelado: item.precio_unitario_congelado,
          discount_aplicado_congelado: item.discount_aplicado_congelado ?? 0,
          precio_item_total: item.precio_item_total ?? null,
        })),
      });

      /* ---------------- PAGO ---------------- */
      if (payment) {
        const statusCode = String(payment.status_code ?? '0');

        let paymentStatus = await tx.payment_statuses.findFirst({
          where: { status_code: statusCode },
        });

        if (!paymentStatus) {
          paymentStatus = await tx.payment_statuses.findFirst({
            where: { status_code: 'ERROR' },
          });
        }

        if (paymentStatus) {
          await tx.payments.create({
            data: {
              id_orden: orden.id,
              id_payment_status: paymentStatus.id,
              payment_method: payment.payment_method ?? 'webpay',
              amount: payment.amount,
              transaction_id_prod: payment.transaction_id_prod ?? null,
              transaction_id_inte: payment.transaction_id_inte ?? null,
              provider: payment.provider ?? 'webpay',
              metadata: payment.metadata ?? null,
            },
          });
        }
      }

      return orden;
    });

    const ordenCompleta = await prisma.ordenes.findUnique({
      where: { id: nuevaOrden.id },
      include: {
        ordenes_items: { include: { productos: true } },
        clientes: true,
        locations: true,
        comunas: true,
        status_ordenes: true,
        payments: { include: { payment_statuses: true } },
      },
    });

    return res.status(201).json(ordenCompleta);
  } catch (error) {
    console.error('❌ Error al crear orden:', error);
    return res.status(500).json({ error: 'Error al crear orden' });
  }
};

/* ======================================================
   ÓRDENES DEL CLIENTE LOGUEADO
   ====================================================== */
export const obtenerOrdenesCliente = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { page = '1', limit = '10' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [ordenes, total] = await Promise.all([
      prisma.ordenes.findMany({
        where: { id_cliente: req.user.id },
        skip,
        take,
        orderBy: { c_at: 'desc' },
        include: {
          ordenes_items: {
            include: {
              productos: {
                select: {
                  id: true,
                  nombre: true,
                  precio: true,
                  precio_final: true,
                  discount: true,
                  image_url: true,
                  image_public_id: true,
                  isbn: true,
                  autor: true,
                  editorial: true,
                  id_categoria: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
          clientes: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              phone: true,
            },
          },
          locations: true,
          comunas: true,
          status_ordenes: true,
          payments: {
            include: {
              payment_statuses: true,
            },
            orderBy: { payment_date: 'desc' },
          },
        },
      }),
      prisma.ordenes.count({
        where: { id_cliente: req.user.id },
      }),
    ]);

    return res.json({
      ordenes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error obteniendo órdenes del cliente:', error);
    return res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

/* ======================================================
   LISTAR TODAS LAS ÓRDENES (ADMIN)
   ====================================================== */
export const obtenerOrdenes = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', id_cliente, id_status_ordenes } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (id_cliente) where.id_cliente = Number(id_cliente);
    if (id_status_ordenes) where.id_status_ordenes = Number(id_status_ordenes);

    const [ordenes, total] = await Promise.all([
      prisma.ordenes.findMany({
        where,
        skip,
        take,
        orderBy: { c_at: 'desc' },
        include: {
          ordenes_items: { include: { productos: true } },
          clientes: true,
          locations: true,
          comunas: true,
          status_ordenes: true,
          payments: { include: { payment_statuses: true } },
        },
      }),
      prisma.ordenes.count({ where }),
    ]);

    return res.json({
      ordenes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error al obtener órdenes:', error);
    return res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

/* ======================================================
   OBTENER ORDEN POR ID
   ====================================================== */
export const obtenerOrdenPorId = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const orden = await prisma.ordenes.findUnique({
      where: { id },
      include: {
        ordenes_items: { include: { productos: true } },
        clientes: true,
        locations: true,
        comunas: true,
        status_ordenes: true,
        payments: { include: { payment_statuses: true } },
      },
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    return res.json(orden);
  } catch (error) {
    console.error('❌ Error al obtener orden:', error);
    return res.status(500).json({ error: 'Error al obtener orden' });
  }
};

/* ======================================================
   ACTUALIZAR ORDEN (ADMIN)
   ====================================================== */
export const actualizarOrden = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { id_status_ordenes, comments } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const data: any = {};
    if (typeof id_status_ordenes === 'number') data.id_status_ordenes = id_status_ordenes;
    if (typeof comments === 'string') data.comments = comments;

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: 'Nada para actualizar' });
    }

    const orden = await prisma.ordenes.update({
      where: { id },
      data,
      include: { status_ordenes: true, clientes: true },
    });

    return res.json(orden);
  } catch (error) {
    console.error('❌ Error al actualizar orden:', error);
    return res.status(500).json({ error: 'Error al actualizar orden' });
  }
};

/* ======================================================
   ELIMINAR ORDEN (ADMIN)
   ====================================================== */
export const eliminarOrden = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payments.deleteMany({ where: { id_orden: id } });
      await tx.ordenes_items.deleteMany({ where: { id_orden: id } });
      await tx.ordenes.delete({ where: { id } });
    });

    return res.json({ message: 'Orden eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar orden:', error);
    return res.status(500).json({ error: 'Error al eliminar orden' });
  }
};
