import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ShippingRequestDto } from './dto/shipping.dto';
import { MeuEnvioShippingStrategy } from './strategies/meu-envio-shipping.strategy';
import { ShippingContext } from './entities/shipping-context.entity';
import { ShippingCalculationResult } from './entities/shipping-result.entity';
@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meuEnvioShippingStrategy: MeuEnvioShippingStrategy,
  ) {}

  async calculate(dto: ShippingRequestDto): Promise<{
    totalCost: number;
    shipments: { workshopId: number; result: ShippingCalculationResult }[];
  }> {
    const products = await this.fetchProductsWithWorkshop(
      dto.orderItems.map((i) => i.productId),
    );
    const itemsGrouped = this.groupItemsByWorkshop(dto, products);

    let totalShippingCost = 0;

    const shipments: {
      workshopId: number;
      result: ShippingCalculationResult;
    }[] = [];

    for (const [workshopId, items] of Object.entries(itemsGrouped)) {
      const context = await this.buildShippingContext(
        Number(workshopId),
        items,
        dto.destinationZipCode,
      );

      const result = await this.meuEnvioShippingStrategy.calculate(context);
      totalShippingCost += result.bestOption.cost;
      shipments.push({ workshopId: Number(workshopId), result });
    }

    return {
      totalCost: totalShippingCost,
      shipments,
    };
  }

  private async fetchProductsWithWorkshop(
    productIds: number[],
  ): Promise<ProductWithWorkshop[]> {
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        weight: true,
        height: true,
        width: true,
        length: true,
        transformation_workshop_product: {
          select: {
            id: true,
            transformation_workshop: {
              select: { id: true, cep: true },
            },
          },
        },
      },
    });
  }

  private groupItemsByWorkshop(
    dto: ShippingRequestDto,
    products: ProductWithWorkshop[],
  ): Record<
    number,
    { productId: number; quantity: number; product: ProductWithWorkshop }[]
  > {
    type GroupedItem = {
      productId: number;
      quantity: number;
      product: ProductWithWorkshop;
    };

    const grouped: Record<number, GroupedItem[]> = {};

    for (const item of dto.orderItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product with ID ${item.productId} not found.`);
      }

      const workshopAssociations =
        product.transformation_workshop_product.filter(
          (tw) => tw.transformation_workshop?.id,
        );

      if (workshopAssociations.length === 0) {
        throw new Error(
          `Product ${item.productId} has no associated workshops.`,
        );
      }

      // Distribui a quantidade igualmente entre os workshops (ou repete a mesma quantidade para todos)
      // Aqui usamos a MESMA quantidade para cada workshop, mas você pode alterar essa lógica
      for (const association of workshopAssociations) {
        const workshopId = association.transformation_workshop!.id;

        if (!grouped[workshopId]) {
          grouped[workshopId] = [];
        }

        grouped[workshopId].push({
          productId: item.productId,
          quantity: item.quantity,
          product,
        });
      }
    }

    return grouped;
  }

  private async buildShippingContext(
    workshopId: number,
    items: {
      productId: number;
      quantity: number;
      product: ProductWithWorkshop;
    }[],
    destinationZipCode: string,
  ): Promise<ShippingContext> {
    const workshop = await this.prisma.transformation_workshop.findUnique({
      where: { id: workshopId },
      select: { cep: true },
    });

    if (!workshop) throw new Error(`Workshop ${workshopId} not found`);

    return {
      originZipCode: workshop.cep ?? '',
      destinationZipCode,
      products: items.map((item) => ({
        id: item.productId.toString(), // pode ser string ou number, conforme API
        width: item.product.width ?? 0,
        height: item.product.height ?? 0,
        length: item.product.length ?? 0,
        weight: item.product.weight ?? 0,
        insuranceValue: 0, // opcional, ajustar se precisar baseado no subtotal ou preço
        quantity: item.quantity,
      })),
    };
  }
}

type ProductWithWorkshop = {
  id: number;
  weight: number | null;
  height: number | null;
  width: number | null;
  length: number | null;
  transformation_workshop_product: {
    id: number;
    transformation_workshop: {
      id: number;
      cep: string | null;
    } | null;
  }[];
};
