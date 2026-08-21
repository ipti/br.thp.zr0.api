import { HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AzureProviderService } from 'src/utils/middleware/azure.provider';
import { ProductsService } from './product.service';

describe('ProductsService.createReview', () => {
  const productFindFirst = jest.fn();
  const orderItemFindFirst = jest.fn();
  const reviewUpsert = jest.fn();

  const prisma = {
    product: { findFirst: productFindFirst },
    order_item: { findFirst: orderItemFindFirst },
    product_review: { upsert: reviewUpsert },
  } as unknown as PrismaService;

  const service = new ProductsService(
    prisma,
    {} as AzureProviderService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    productFindFirst.mockResolvedValue({ id: 7 });
  });

  it('exige pedido pago e entrega concluída', async () => {
    orderItemFindFirst.mockResolvedValue(null);

    await expect(
      service.createReview('produto-uid', 12, 5, 'Ótimo produto'),
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });

    expect(orderItemFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          product_fk: 7,
          order_service: {
            status: 'COMPLETED',
            order: {
              user_fk: 12,
              payment_status: 'PAID',
            },
          },
        },
      }),
    );
    expect(reviewUpsert).not.toHaveBeenCalled();
  });

  it('publica a avaliação de uma compra recebida', async () => {
    orderItemFindFirst.mockResolvedValue({ id: 30 });
    reviewUpsert.mockResolvedValue({ id: 40 });

    await service.createReview('produto-uid', 12, 4, '  Bom acabamento  ');

    expect(reviewUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { rating: 4, comment: 'Bom acabamento' },
        create: expect.objectContaining({
          rating: 4,
          comment: 'Bom acabamento',
        }),
      }),
    );
  });
});
