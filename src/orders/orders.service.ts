import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateOrderDto } from './dto/update-order.dto';
import { EmailService } from 'src/utils/middleware/email.middleware';
import { PaymentService } from 'src/payment/payment.service';
import { randomUUID } from 'crypto';
import { CouponService } from 'src/coupon/coupon.service';
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
    private readonly couponService: CouponService,
  ) {}

  private generateUid(prefix: string) {
    return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  async create(createOrderDto: CreateOrderDto) {
    const { userId, items, observation, address, payment_method, coupon_code } =
      createOrderDto;

    // Agrupar por workshop
    const workshops = [...new Set(items.map((i) => i.workshopId))];
    const now = new Date();

    // Buscar todos os produtos de uma vez
    const productIds = items.map((i) => String(i.productId));
    const products = await this.prisma.product.findMany({
      where: { uid: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.uid, p]));

    // Buscar todos os produtos de workshop de uma vez
    const workshopProducts =
      await this.prisma.transformation_workshop_product.findMany({
        where: {
          transformation_workshop_fk: { in: workshops },
          product_fk: { in: products.map((i) => i.id) },
        },
      });
    const workshopProductMap = new Map(
      workshopProducts.map((wp) => [
        `${wp.transformation_workshop_fk}-${wp.product_fk}`,
        wp,
      ]),
    );
    const activeReservations = await this.prisma.stock_reservation.findMany({
      where: {
        transformation_workshop_fk: { in: workshops },
        product_fk: { in: products.map((i) => i.id) },
        expires_at: { gt: now },
        NOT: { user_fk: userId },
      },
    });
    const reservationMap = new Map<string, number>();
    for (const reservation of activeReservations) {
      const key = `${reservation.transformation_workshop_fk}-${reservation.product_fk}`;
      reservationMap.set(key, (reservationMap.get(key) ?? 0) + reservation.quantity);
    }

    const workshopUsersManagers = await this.prisma.transformation_workshop_user.findMany({
      where: {
        transformation_workshop_fk: { in: workshops },
        users: { role: { in: ['SELLER', 'SELLER_MANAGER'] }, }
      },
      select: {
        users: {
          select: { email: true }
        }
      }
    });

    const subtotalWithoutDiscount = items.reduce((acc, item) => {
      const product = productMap.get(item.productId);
      const itemPrice = product?.price ?? 0;
      return acc + itemPrice * item.quantity + (item.delivery_estimate?.cost ?? 0);
    }, 0);

    const validCoupon = coupon_code
      ? await this.couponService.validateCoupon(coupon_code, subtotalWithoutDiscount)
      : null;
    const discountAmount = validCoupon?.discount ?? 0;

    const createdOrdersData = await this.prisma.$transaction(async (tx) => {
      const createdOrders: any[] = [];

      const date = new Date(Date.now());
      const uid = this.generateUid(
        `ZR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
      );

      // Criar pedido principal uma única vez
      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          uid: uid,
          total_amount: 0, // será atualizado depois
          notes: observation,
          payment_method: payment_method ?? 'PIX',
          discount_amount: discountAmount,
          ...(validCoupon
            ? { coupon: { connect: { id: validCoupon.id } } }
            : {}),
        },
      });

      let totalOrderAmount = 0;

      for (const workshopId of workshops) {
        const itemsForWorkshop = items
          .filter((i) => i.workshopId === workshopId)
          .map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new HttpException(
                `Produto ${item.productId} não encontrado`,
                HttpStatus.BAD_REQUEST,
              );
            }

            const unitPrice = product.price ?? 0;
            const totalPrice = unitPrice * item.quantity;

            const wpKey = `${workshopId}-${product.id}`;
            const twProduct = workshopProductMap.get(wpKey);
            const reservedQuantity = reservationMap.get(wpKey) ?? 0;
            const availableQuantity = (twProduct?.quantity ?? 0) - reservedQuantity;

            if (!twProduct || availableQuantity < item.quantity) {
              throw new HttpException(
                `Estoque insuficiente para produto ${item.productId} no workshop ${workshopId}`,
                HttpStatus.BAD_REQUEST,
              );
            }

            return {
              quantity: item.quantity,
              unit_price: unitPrice,
              total_price: totalPrice,
              product: { connect: { id: product.id } },
              ...(item.variantId
                ? { variant: { connect: { id: item.variantId } } }
                : {}),
              delivery_estimate: item.delivery_estimate,
            };
          });

        const workshopTotal = itemsForWorkshop.reduce((acc, i) => acc + i.total_price + i.delivery_estimate.cost, 0);
        totalOrderAmount += workshopTotal;
        const uid_service = this.generateUid(
          `OS-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`,
        );

        const orderService = await tx.order_service.create({
          data: {
            uid: uid_service,
            transformation_workshop: { connect: { id: workshopId } },
            total_amount: workshopTotal,
            order: { connect: { id: order.id } },
            order_item: { create: itemsForWorkshop },
          },
          include: { order_item: true },
        });

        for (const item of itemsForWorkshop) {
          const wpKey = `${workshopId}-${item.product.connect.id}`;
          const twProduct = workshopProductMap.get(wpKey);
          if (twProduct) {
            await tx.transformation_workshop_product.update({
              where: { id: twProduct.id },
              data: { quantity: twProduct.quantity - item.quantity },
            });
          }
        }
      }

      // Criar o endereço de entrega apenas uma vez (fora do loop de workshops)
      if (address) {
        await tx.order_delivery_address.create({
          data: {
            cep: address.cep,
            address: address.address,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            state: { connect: { id: address.stateId } },
            city: { connect: { id: address.cityId } },
            order: { connect: { id: order.id } },
          },
        });
      }

      // Atualizar o total do pedido
      await tx.order.update({
        where: { id: order.id },
        data: {
          total_amount: Math.max(0, totalOrderAmount - discountAmount),
        },
      });

      if (validCoupon) {
        await tx.coupon.update({
          where: { id: validCoupon.id },
          data: {
            uses_count: {
              increment: 1,
            },
          },
        });
      }

      await tx.stock_reservation.updateMany({
        where: {
          user_fk: userId,
          expires_at: { gt: new Date() },
          order_fk: null,
        },
        data: { order_fk: order.id },
      });

      createdOrders.push(order);
      return createdOrders;
    });

    // após o commit da transação
    const user = await this.prisma.users.findUnique({ where: { id: userId } });

    // enviar emails fora da transação
    for (const order of createdOrdersData) {
      const fullOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          order_delivery_address: {
            include: { city: true, state: true },
          },
          order_services: {
            include: {
              order_item: {
                include: { product: { include: { product_image: true } } },
              },
            },
          },
        },
      });

      if (fullOrder) {
        const totalShippingCost = fullOrder.order_services.reduce(
          (acc: number, service: any) => acc + service.order_item.reduce(
            (itemAcc: number, item: any) => itemAcc + (item.delivery_estimate?.cost ?? 0),
            0
          ),
          0
        );

        await this.paymentService.createPaymentIntent(
          Math.round(fullOrder.total_amount * 100),
          'BRL',
          order.id,
          fullOrder.payment_method ?? undefined,
        );

        // Preparar produtos para email
        const products = fullOrder.order_services.flatMap((service: any) =>
          service.order_item.map((i: any) => ({
            id: i.product.uid,
            name: i.product.name,
            quantity: i.quantity,
            price: i.total_price,
            imagem: i.product.product_image[0]?.img_url ?? '',
          }))
        );

        await this.emailService.sendEmail(
          user?.email ?? '',
          'Pedido realizado',
          'sendOrder.hbs',
          {
            name_client: user?.name,
            id_order: fullOrder.uid,
            total_amount: fullOrder.total_amount,
            payment_method: fullOrder.payment_method,
            address: fullOrder.order_delivery_address?.address,
            number: fullOrder.order_delivery_address?.number,
            neighborhood: fullOrder.order_delivery_address?.neighborhood,
            cep: fullOrder.order_delivery_address?.cep,
            state: fullOrder.order_delivery_address?.state?.name,
            city: fullOrder.order_delivery_address?.city?.name,
            products,
          },
        );

        console.log('workshopUsersManagers', workshopUsersManagers);

        for (const manager of workshopUsersManagers) {
          await this.emailService.sendEmail(
            manager?.users.email ?? '',
            'Pedido realizado',
            'sendOrderManager.hbs',
            {
              name_client: user?.name,
              id_order: fullOrder.uid,
              total_amount: fullOrder.total_amount,
              payment_method: fullOrder.payment_method,
              address: fullOrder.order_delivery_address?.address,
              number: fullOrder.order_delivery_address?.number,
              neighborhood: fullOrder.order_delivery_address?.neighborhood,
              cep: fullOrder.order_delivery_address?.cep,
              state: fullOrder.order_delivery_address?.state?.name,
              city: fullOrder.order_delivery_address?.city?.name,
              products,
            },
          );
        }
      }
    }

    const customerCart = await this.prisma.cart.findFirst({
      where: { customer: { user_fk: userId } },
    });

    if (customerCart) {
      await this.prisma.cartItem.deleteMany({
        where: { cart_fk: customerCart.id },
      });
    }

    return {
      message: 'Pedidos criados com sucesso!',
      orders: createdOrdersData.map((o) => ({ id: o.id, uid: o.uid })),
    };

  }

  async findAll(query: QueryOrderDto) {
    const { page = 1, limit = 20, payment_status } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.orderWhereInput = payment_status
      ? { payment_status }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        where,
        include: {
          user: true,
          order_services: {
            include: {
              transformation_workshop: true,
              order_item: {
                include: {
                  product: true,
                  variant: true,
                },
              },
            },
          },
          order_delivery_address: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        order_services: {
          include: {
            order_item: {
              include: {
                product: true,
                variant: true,
              },
            },
            transformation_workshop: {
              include: { state: true, city: true },
            },
          }
        },
        order_delivery_address: {
          include: { state: true, city: true },
        },
      },
    });

    if (!order) {
      throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    try {
      // Verifica se o pedido existe
      const existingOrder = await this.prisma.order.findUnique({
        where: { id },
        include: {
          user: true,
          order_delivery_address: {
            include: { state: true, city: true },
          },
          order_services: {
            include: {
              order_item: {
                include: {
                  product: { include: { product_image: true } },
                },
              },
            },
          },
        },
      });

      if (!existingOrder) {
        throw new HttpException('Pedido não encontrado', HttpStatus.NOT_FOUND);
      }

      // Se houver itens no update
      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        // Deleta os itens antigos
        await this.prisma.order_item.deleteMany({
          where: {
            order_service: {
              order_fk: id,
            },
          },
        });

        const items: any[] = [];

        for (const item of updateOrderDto.items) {
          // Busca o produto
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new HttpException(
              `Produto com ID ${item.productId} não encontrado`,
              HttpStatus.BAD_REQUEST,
            );
          }

          const totalPrice = (product?.price ?? 0) * item.quantity;

          items.push({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            unit_price: product.price ?? 0,
            total_price: totalPrice,
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const total: number = items.reduce(
          (acc, item) => acc + item.total_price,
          0,
        );

        // Atualizar o serviço de pedido com os novos itens
        const orderService = await this.prisma.order_service.findFirst({
          where: { order_fk: id },
        });

        if (orderService) {
          await this.prisma.order_service.update({
            where: { id: orderService.id },
            data: {
              total_amount: total,
              order_item: {
                create: items,
              },
            },
          });
        }
      }

      // Atualiza os outros dados do pedido (opcional)
      const updatedOrder = await this.prisma.order.update({
        where: { id },
        data: {
          notes: updateOrderDto.observation,
          payment_status: updateOrderDto.payment_status,
          updatedAt: new Date(),
        },
        include: {
          order_services: {
            include: {
              order_item: true,
            },
          },
        },
      });

      // Atualizar status do order_service se houver
      if (updateOrderDto.status === 'SOLITED_CANCELLATION') {
        const orderService = await this.prisma.order_service.findMany({
          where: { order_fk: id }
        });

         for(var i of orderService) {
          await this.prisma.order_service.update({
            where: { id: i.id },
            data: { status: updateOrderDto.status },
          });
        }
      } else {
         const orderService = await this.prisma.order_service.findMany({
          where: { order_fk: id }
        });

         for(var i of orderService) {
          await this.prisma.order_service.update({
            where: { id: i.id },
            data: { status: updateOrderDto.status },
          });
        }
      }

      if (updateOrderDto.status === 'SHIPPED') {
        // Buscar os dados completos novamente para enviar email
        const fullOrder = await this.prisma.order.findUnique({
          where: { id },
          include: {
            user: true,
            order_delivery_address: {
              include: { state: true, city: true },
            },
            order_services: {
              include: {
                order_item: {
                  include: {
                    product: { include: { product_image: true } },
                  },
                },
              },
            },
          },
        });

        if (fullOrder?.user) {
          const products = fullOrder.order_services.flatMap((service: any) =>
            service.order_item.map((i: any) => ({
              id: i.product.uid,
              name: i.product.name,
              quantity: i.quantity,
              price: i.total_price,
              imagem: i.product.product_image[0]?.img_url ?? '',
            }))
          );

          await this.emailService.sendEmail(
            fullOrder.user.email ?? '',
            'Pedido enviado',
            'shippingOrder.hbs',
            {
              name_client: fullOrder.user.name,
              id_order: fullOrder.uid,
              total_amount: fullOrder.total_amount,
              payment_method: fullOrder.payment_method,
              address: fullOrder.order_delivery_address?.address,
              number: fullOrder.order_delivery_address?.number,
              neighborhood: fullOrder.order_delivery_address?.neighborhood,
              cep: fullOrder.order_delivery_address?.cep,
              state: fullOrder.order_delivery_address?.state?.name,
              city: fullOrder.order_delivery_address?.city?.name,
              products,
            },
          );
        }
      }

      return updatedOrder;
    } catch (err) {
      console.log(err);
      throw new HttpException(
        err,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.order.delete({ where: { id } });
      return { message: 'Pedido removido com sucesso' };
    } catch (err) {
      console.error(err);
      throw new HttpException('Erro ao remover pedido', HttpStatus.BAD_REQUEST);
    }
  }
}
