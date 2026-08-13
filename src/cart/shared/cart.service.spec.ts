import { CartService } from './cart.service';

describe('CartService.addItem', () => {
  it('cria o perfil customer e o carrinho ausentes antes de adicionar o item', async () => {
    const transaction = {
      customer: {
        upsert: jest.fn().mockResolvedValue({ id: 10, user_fk: 7 }),
      },
      cart: {
        upsert: jest.fn().mockResolvedValue({ id: 20, customer_fk: 10 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
      cartItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 30 }),
        update: jest.fn(),
      },
    };
    const service = new CartService(prisma as never);

    await service.addItem(7, { productId: 1, quantity: 1 });

    expect(transaction.customer.upsert).toHaveBeenCalledWith({
      where: { user_fk: 7 },
      update: {},
      create: { user: { connect: { id: 7 } } },
    });
    expect(transaction.cart.upsert).toHaveBeenCalledWith({
      where: { customer_fk: 10 },
      update: {},
      create: { customer: { connect: { id: 10 } } },
    });
    expect(prisma.cartItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantity: 1 }),
      }),
    );
  });
});
