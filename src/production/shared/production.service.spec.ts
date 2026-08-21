import { HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductionQueueService } from './production-queue.service';
import { ProductionService } from './production.service';

describe('ProductionService - progresso da produção', () => {
  const productionRecord = {
    id: 9,
    quantity: 10,
    produced_quantity: 2,
    production_status: 'IN_PROGRESS',
    product_fk: 3,
    transformation_workshop_fk: 7,
    product: { id: 3, name: 'Cadeira' },
    transformation_workshop: { id: 7, name: 'OT Centro' },
    order_item: { order_service: { id: 12 } },
  };

  function setup() {
    const prismaMock = {
      production: {
        findUnique: jest.fn().mockResolvedValue(productionRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...productionRecord, ...data }),
          ),
      },
      order_service: { update: jest.fn().mockResolvedValue({}) },
    };
    const queueMock = { finishDateFor: jest.fn() };
    const service = new ProductionService(
      prismaMock as unknown as PrismaService,
      queueMock as unknown as ProductionQueueService,
    );
    return { service, prismaMock };
  }

  it('conclui automaticamente ao produzir a quantidade planejada', async () => {
    const { service, prismaMock } = setup();

    await service.update(9, { producedQuantity: 10 });

    expect(prismaMock.production.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          produced_quantity: 10,
          production_status: 'DONE',
        }),
      }),
    );
    expect(prismaMock.order_service.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: 'IN_PRODUCTION' },
    });
  });

  it('impede progresso maior que o total planejado', async () => {
    const { service, prismaMock } = setup();

    await expect(
      service.update(9, { producedQuantity: 11 }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(prismaMock.production.update).not.toHaveBeenCalled();
  });

  it('normaliza o id da oficina recebido como query string antes do Prisma', async () => {
    const { service, prismaMock } = setup();

    await service.findAll({
      page: 1,
      limit: 100,
      idTransformationWorkshop: '1' as unknown as number,
    });

    expect(prismaMock.production.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ transformation_workshop_fk: 1 }),
      }),
    );
  });

  it('lista somente pedidos pagos e com remessas ativas, preservando produções internas', async () => {
    const { service, prismaMock } = setup();

    await service.findAll({ page: 1, limit: 100 });

    expect(prismaMock.production.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { production_status: null },
                { production_status: { not: 'CANCELLED' } },
              ],
            },
            {
              OR: [
                { order_item_fk: null },
                {
                  order_item: {
                    is: {
                      order_service: {
                        is: {
                          status: {
                            notIn: ['CANCELLED', 'SOLITED_CANCELLATION'],
                          },
                          order: { is: { payment_status: 'PAID' } },
                        },
                      },
                    },
                  },
                },
              ],
            },
          ],
        }),
      }),
    );
  });
});
