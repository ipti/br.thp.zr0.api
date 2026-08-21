import axios from 'axios';
import { MeuEnvioShippingStrategy } from './meu-envio-shipping.strategy';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MeuEnvioShippingStrategy', () => {
  let strategy: MeuEnvioShippingStrategy;

  beforeEach(() => {
    strategy = new MeuEnvioShippingStrategy();
    mockedAxios.post.mockReset();
  });

  describe('calculatePrice', () => {
    it('envia as dimensões reais do produto no payload, não a caixa genérica 20x20x20/1', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [
          {
            price: '35.50',
            delivery_time: 4,
            name: 'PAC',
            error: null,
          },
        ],
      });

      await strategy.calculatePrice('01000-000', '02000-000', {
        width: 60,
        height: 40,
        length: 80,
        weight: 12.5,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          package: { height: 40, width: 60, length: 80, weight: 12.5 },
        }),
        expect.anything(),
      );
    });

    it('usa fallback mínimo (sem travar) quando dimensões vêm zeradas', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [
          { price: '10.00', delivery_time: 2, name: 'SEDEX', error: null },
        ],
      });

      await strategy.calculatePrice('01000-000', '02000-000', {
        width: 0,
        height: 0,
        length: 0,
        weight: 0,
      });

      const [, payload] = mockedAxios.post.mock.calls[0] as [
        string,
        {
          package: {
            height: number;
            width: number;
            length: number;
            weight: number;
          };
        },
      ];
      expect(payload.package.width).toBeGreaterThan(0);
      expect(payload.package.height).toBeGreaterThan(0);
      expect(payload.package.length).toBeGreaterThan(0);
      expect(payload.package.weight).toBeGreaterThan(0);
    });

    it('retorna a opção de menor custo entre os serviços válidos', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [
          { price: '50.00', delivery_time: 3, name: 'SEDEX', error: null },
          { price: '20.00', delivery_time: 8, name: 'PAC', error: null },
          {
            price: '5.00',
            delivery_time: 1,
            name: 'Erro',
            error: 'indisponível',
          },
        ],
      });

      const result = await strategy.calculatePrice('01000-000', '02000-000', {
        width: 20,
        height: 20,
        length: 20,
        weight: 1,
      });

      expect(result).toEqual({
        cost: 20,
        deliveryTimeDays: 8,
        service: 'PAC',
      });
    });

    it('retorna custo zero quando nenhum serviço válido é retornado', async () => {
      mockedAxios.post.mockResolvedValue({ data: [] });

      const result = await strategy.calculatePrice('01000-000', '02000-000', {
        width: 20,
        height: 20,
        length: 20,
        weight: 1,
      });

      expect(result).toEqual({
        cost: 0,
        deliveryTimeDays: 0,
        service: 'Unknown',
      });
    });
  });

  describe('calculate', () => {
    it('envia as dimensões reais de cada produto no payload products[]', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [{ price: '15.00', delivery_time: 3, name: 'PAC', error: null }],
      });

      await strategy.calculate({
        originZipCode: '01000-000',
        destinationZipCode: '02000-000',
        products: [
          {
            id: 1,
            width: 30,
            height: 15,
            length: 45,
            weight: 3.2,
            quantity: 2,
          },
        ],
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          products: [
            expect.objectContaining({
              width: 30,
              height: 15,
              length: 45,
              weight: 3.2,
            }),
          ],
        }),
        expect.anything(),
      );
    });

    it('aplica fallback mínimo quando o produto vem com dimensões zeradas', async () => {
      mockedAxios.post.mockResolvedValue({
        data: [{ price: '15.00', delivery_time: 3, name: 'PAC', error: null }],
      });

      await strategy.calculate({
        originZipCode: '01000-000',
        destinationZipCode: '02000-000',
        products: [
          { id: 1, width: 0, height: 0, length: 0, weight: 0, quantity: 1 },
        ],
      });

      const [, payload] = mockedAxios.post.mock.calls[0] as [
        string,
        {
          products: {
            width: number;
            height: number;
            length: number;
            weight: number;
          }[];
        },
      ];
      expect(payload.products[0].width).toBeGreaterThan(0);
      expect(payload.products[0].height).toBeGreaterThan(0);
      expect(payload.products[0].length).toBeGreaterThan(0);
      expect(payload.products[0].weight).toBeGreaterThan(0);
    });
  });
});
