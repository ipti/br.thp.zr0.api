import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAddressCustomerDto } from './create-address_customer.dto';

const validAddress = {
  name: 'Jonny Walker',
  phone: '(79) 9 8836-4271',
  cep: '49039-022',
  address: 'Rua São Vicente',
  number: '333',
  complement: '',
  neighborhood: 'Marivan',
  stateId: 28,
  cityId: 2800308,
  customerId: 15,
};

describe('CreateAddressCustomerDto', () => {
  it('remove a máscara do CEP antes da validação', async () => {
    const dto = plainToInstance(CreateAddressCustomerDto, validAddress);

    expect(dto.cep).toBe('49039022');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('continua rejeitando um CEP que não tenha oito dígitos', async () => {
    const dto = plainToInstance(CreateAddressCustomerDto, {
      ...validAddress,
      cep: '4903-022',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'cep')).toBe(true);
  });
});
