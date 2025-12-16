// controllers/orderController.ts
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearOrden = async (req: Request, res: Response) => {
  try {
    const {
      id_cliente,
      id_location,
      id_status_ordenes, // por ejemplo, el status "pagado"
      costo_envio,
      id_comuna_destino,
      comments,
      items,             // [{ id_producto, cantidad, precio_unitario_congelado, discount_aplicado_congelado }]
      total_precio,      // total de la orden (incluye envío)
      payment,           // datos del pago Webpay (monto, token, etc.)
    } = req.body;

    if (!id_cliente || !id_location || !id_status_ordenes) {
      return res.status(400).json({
        error: 'id_cliente, id_location e id_status_ordenes son obligatorios',
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
      const orden = await tx.ordenes.create({
        data: {
          id_cliente,
          total_precio,
          id_status_ordenes,
          id_location,
          costo_envio: costo_envio ?? null,
          id_comuna_destino: id_comuna_destino ?? null,
          comments: comments ?? null,
          // blue_express_code, access_token, etc. los puedes setear después si quieres
        },
      });

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

      if (payment) {
        // necesitas tener el id de algún status de payment (por ejemplo, "pagado")
        const paymentStatus = await tx.payment_statuses.findFirst({
          where: { status_code: payment.status_code || 'PAID' },
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
        payments: true,
      },
    });

    return res.status(201).json(ordenConRelaciones);
  } catch (error) {
    console.error('Error al crear orden', error);
    return res.status(500).json({ error: 'Error al crear orden' });
  }
};
