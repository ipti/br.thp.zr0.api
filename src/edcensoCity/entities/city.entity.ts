import { Prisma } from '@prisma/client';

export class City implements Prisma.cityCreateInput {
  id: number;
  name: string;
  cep_initial?: string;
  cep_final?: string;
  ddd1?: number;
  ddd2?: number;
  transformation_workshop?: Prisma.transformation_workshopCreateNestedManyWithoutCityInput | undefined;
  state: Prisma.stateCreateNestedOneWithoutCityInput;
}
