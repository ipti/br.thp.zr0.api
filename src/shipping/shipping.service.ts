import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { ShippingRequestDto } from './dto/shipping.dto';
import { ShippingCalculationResult } from './entities/shipping-result.entity';
import { ShippingContext } from './entities/shipping-context.entity';

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) {}

  async calculate(dto: ShippingRequestDto) {
    const shipments: {
      workshopId: number;
      result: ShippingCalculationResult;
      quantity: number;
      workshopName: string;
      productId: string;
      productName: string;
    }[] = [];

    for (const orderItems of dto.orderItems) {
      const product = await this.prisma.product.findFirst({
        where: { uid: orderItems.productId },
      });
      const product_tw =
        await this.prisma.transformation_workshop_product.findMany({
          where: { product_fk: product?.id },
        });

      const quantity_tw = product_tw.map((p) => {
        return {
          quantity: p.quantity,
          workshopId: p.transformation_workshop_fk,
        };
      });
      const ordemItens = this.algothmsMoneyShipping(
        orderItems.quantity,
        quantity_tw,
      );

      const array = Object.entries(ordemItens).map(
        ([workshopId, quantity]) => ({
          workshopId,
          quantity,
        }),
      );

      for (const item of array) {
        const workshop = await this.prisma.transformation_workshop.findUnique({
          where: { id: Number(item.workshopId) },
          select: { cep: true, name: true, state: true, city: true },
        });

        if (!workshop) throw new Error(`Workshop ${item.workshopId} not found`);
        const itens = await this.buildShippingContext(
          workshop.cep ?? '',
          [
            {
              product: product,
              quantity: Number(item.quantity),
            },
          ],
          dto.destinationZipCode,
        );
        const result = await this.meuEnvioShippingStrategy.calculate(itens);

        shipments.push({
          result: result,
          workshopId: Number(item.workshopId),
          quantity: Number(item.quantity),
          workshopName: workshop.name,
          productId: product?.uid ?? '',
          productName: product?.name ?? '',
        });
      }
    }
    return shipments;
  }

  private async buildShippingContext(
    workshopCep: string,
    items: {
      quantity: number;
      product: ProductType;
    }[],
    destinationZipCode: string,
  ): Promise<ShippingContext> {
    return {
      originZipCode: workshopCep,
      destinationZipCode,
      products: items.map((item) => ({
        id: item.product?.id.toString() ?? '', // pode ser string ou number, conforme API
        width: item.product?.width ?? 0,
        height: item.product?.height ?? 0,
        length: item.product?.length ?? 0,
        weight: item.product?.weight ?? 0,
        insuranceValue: 0, // opcional, ajustar se precisar baseado no subtotal ou preço
        quantity: item.quantity,
      })),
    };
  }
  private algothmsMoneyShipping(
    quantityTotal: number,
    tw: {
      quantity: number;
      workshopId: number | null;
    }[],
  ) {
    const resultado = {};
    let restante = quantityTotal;
    for (const quantity_tw_max of tw) {
      const qtd =
        quantity_tw_max.quantity === 0
          ? 0
          : Math.ceil(restante / quantity_tw_max.quantity);
      if (qtd > 0) {
        resultado[quantity_tw_max.workshopId!] =
          restante < quantity_tw_max.quantity
            ? restante
            : quantity_tw_max.quantity;
        restante = restante - quantity_tw_max.quantity;
      }
    }

    return resultado;
  }
}

type ProductType = {
  id: number;
  name: string;
  description: string;
  price: number | null;
  createdAt: Date;
  updatedAt: Date;
  category_fk: number;
  weight: number;
  height: number;
  width: number;
  length: number;
} | null;
