import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStockReservationDto } from './create-checkout.dto';

describe('CreateStockReservationDto', () => {
  const validPayload = {
    userId: 3,
    items: [
      {
        productId: 'd1f53e31-6946-4093-823b-2833386e447e',
        workshopId: 1,
        quantity: 2,
      },
    ],
  };

  it('preserva e valida uma solicitação de reserva válida', async () => {
    const dto = plainToInstance(CreateStockReservationDto, validPayload);

    await expect(validate(dto, { whitelist: true })).resolves.toHaveLength(0);
    expect(dto).toMatchObject(validPayload);
  });

  it('rejeita uma lista de itens vazia', async () => {
    const dto = plainToInstance(CreateStockReservationDto, {
      ...validPayload,
      items: [],
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'items' }),
      ]),
    );
  });

  it('rejeita produto, oficina e quantidade inválidos', async () => {
    const dto = plainToInstance(CreateStockReservationDto, {
      userId: 3,
      items: [{ productId: 'produto-invalido', workshopId: 0, quantity: 0 }],
    });

    const errors = await validate(dto, { whitelist: true });

    expect(errors[0]?.children?.[0]?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'productId' }),
        expect.objectContaining({ property: 'workshopId' }),
        expect.objectContaining({ property: 'quantity' }),
      ]),
    );
  });
});
