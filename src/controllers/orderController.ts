// controllers/orderController.ts
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Crear orden + items + pago
export const crearOrden = async (req: Request, res: Response) => {
  try {
    const {
      id_cliente,
      // id_location,      // ya no lo pedimos del body
      id_status_ordenes,   // estado de la ORDEN: pendiente / enviado / cancelado / etc.
      costo_envio,
      id_comuna_destino,
      comments,
      items,               // [{ id_producto, cantidad, precio_unitario_congelado, discount_aplicado_congelado }]
      total_precio,        // total de la orden (incluye envío)
      payment,             // datos del pago Webpay (monto, token, status_code, etc.)
    } = req.body;

    if (!id_cliente || !id_status_ordenes) {
      return res.status(400).json({
        error: 'id_cliente e id_status_ordenes son obligatorios',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Debe enviar al menos un item en la orden',
      });
    }

    if (typeof total_precio !== 'number') {
      return res.status(400).json({
        error: 'total_precio debe ser un número',
      });
    }

    // Crear la orden + items + pago en una sola transacción
    const nuevaOrden = await prisma.$transaction(async (tx) => {
      // 1) Orden (estado de la ORDEN en id_status_ordenes)
      const orden = await tx.ordenes.create({
        data: {
          id_cliente,
          total_precio,
          id_status_ordenes,
          // Workaround: usar una location dummy existente mientras no tengas flow de direcciones
          id_location: 1, // Asegúrate de que exista locations.id = 1
          costo_envio: costo_envio ?? null,
          id_comuna_destino: id_comuna_destino ?? null,
          comments: comments ?? null,
        },
      });

      // 2) Items
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

      // 3) Pago (estado del PAGO en payment_statuses.status_code)
      if (payment) {
        // aquí esperas algo como payment.status_code = 'AUTHORIZED' | 'REJECTED' | 'PENDING'
        const paymentStatus = await tx.payment_statuses.findFirst({
          where: { status_code: payment.status_code || 'AUTHORIZED' },
        });

        if (paymentStatus) {
          await tx.payments.create({
            data: {
              id_orden: orden.id,
              id_payment_status: paymentStatus.id,
              payment_method: payment.payment_method || 'webpay',
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

    // devolver orden con relaciones
    const ordenConRelaciones = await prisma.ordenes.findUnique({
      where: { id: nuevaOrden.id },
      include: {
        ordenes_items: {
          include: {
            productos: true,
          },
        },
        clientes: true,
        locations: true,
        comunas: true,
        status_ordenes: true,
        payments: {
          include: {
            payment_statuses: true,
          },
        },
      },
    });

    return res.status(201).json(ordenConRelaciones);
  } catch (error) {
    console.error('Error al crear orden (controller):', error);
    return res.status(500).json({ error: 'Error al crear orden' });
  }
};

// Listar órdenes (con filtros/paginación)
export const obtenerOrdenes = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      id_cliente,
      id_status_ordenes,
      fecha_desde,
      fecha_hasta,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const whereClause: any = {};

    if (id_cliente) {
      whereClause.id_cliente = Number(id_cliente);
    }

    if (id_status_ordenes) {
      whereClause.id_status_ordenes = Number(id_status_ordenes);
    }

    if (fecha_desde) {
      whereClause.c_at = {
        gte: new Date(fecha_desde as string),
      };
    }

    if (fecha_hasta) {
      if (!whereClause.c_at) {
        whereClause.c_at = {};
      }
      whereClause.c_at.lte = new Date(fecha_hasta as string);
    }

    const [ordenes, total] = await Promise.all([
      prisma.ordenes.findMany({
        skip,
        take,
        where: whereClause,
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
          locations: {
            select: {
              id: true,
              recipient_name: true,
              recipient_phone: true,
              address_line1: true,
              address_line2: true,
              city: true,
              postal_code: true,
            },
          },
          comunas: {
            select: {
              id: true,
              nombre: true,
              codigo_envio: true,
            },
          },
          status_ordenes: {
            select: {
              id: true,
              status: true,
            },
          },
          payments: {
            include: {
              payment_statuses: {
                select: {
                  id: true,
                  status_code: true,
                  description: true,
                },
              },
            },
            orderBy: { payment_date: 'desc' },
          },
        },
      }),
      prisma.ordenes.count({ where: whereClause }),
    ]);

    return res.json({
      ordenes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
        hasNext: skip + take < total,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    return res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

// Obtener una orden por ID
export const obtenerOrdenPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    const orden = await prisma.ordenes.findUnique({
      where: { id: Number(id) },
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
                numero_paginas: true,
                encuadernacion: true,
                idioma: true,
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
        comunas: {
          select: {
            id: true,
            nombre: true,
            codigo_envio: true,
          },
        },
        status_ordenes: {
          select: {
            id: true,
            status: true,
          },
        },
        payments: {
          include: {
            payment_statuses: {
              select: {
                id: true,
                status_code: true,
                description: true,
              },
            },
          },
          orderBy: { payment_date: 'desc' },
        },
      },
    });

    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    return res.json(orden);
  } catch (error) {
    console.error('Error al obtener orden por ID:', error);
    return res.status(500).json({ error: 'Error al obtener orden' });
  }
};

// Eliminar orden (opcional, si usas DELETE en frontend)
export const eliminarOrden = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'ID de orden inválido' });
    }

    const deletedOrder = await prisma.$transaction(async (tx) => {
      await tx.payments.deleteMany({ where: { id_orden: Number(id) } });
      await tx.ordenes_items.deleteMany({ where: { id_orden: Number(id) } });

      return tx.ordenes.delete({
        where: { id: Number(id) },
      });
    });

    return res.json({
      message: 'Orden eliminada exitosamente',
      deletedOrder,
    });
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    return res.status(500).json({ error: 'Error al eliminar orden' });
  }
};
