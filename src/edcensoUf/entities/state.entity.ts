import { Prisma } from '@prisma/client';

export class State implements Prisma.stateCreateInput {
  id: number;
  acronym: string;
  name: string;
  city?: Prisma.cityCreateNestedManyWithoutStateInput;
  transformation_workshop?:
    | Prisma.transformation_workshopCreateNestedManyWithoutStateInput
    | undefined;
}
