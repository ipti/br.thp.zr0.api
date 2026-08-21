/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaService } from 'src/prisma/prisma.service';
import { TransformationWorkshopProductBffService } from './transformation_workshop_bff.service';

describe('TransformationWorkshopProductBffService', () => {
  function setup() {
    const transaction = {
      transformation_workshop_product: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 15,
          product_fk: 3,
          transformation_workshop_fk: 7,
          quantity: 0,
        }),
      },
      inventory: { create: jest.fn().mockResolvedValue({}) },
      inventory_entry: { create: jest.fn().mockResolvedValue({}) },
      production_capacity: { upsert: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      inventory: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (client: typeof transaction) => unknown) =>
            callback(transaction),
        ),
    };

    return {
      service: new TransformationWorkshopProductBffService(
        prisma as unknown as PrismaService,
      ),
      transaction,
    };
  }

  it('salva o estoque inicial e registra a entrada no ledger', async () => {
    const { service, transaction } = setup();

    await service.addProductTransformationWorkshop({
      product_fk: 3,
      tw_fk: 7,
      quantity: 12,
    });

    expect(transaction.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: 12 }),
    });
    expect(transaction.inventory_entry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: 12 }),
    });
  });

  it('permite vínculo com estoque inicial zero sem criar entrada vazia', async () => {
    const { service, transaction } = setup();

    await service.addProductTransformationWorkshop({
      product_fk: 3,
      tw_fk: 7,
      quantity: 0,
    });

    expect(transaction.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantity: 0 }),
    });
    expect(transaction.inventory_entry.create).not.toHaveBeenCalled();
  });
});
