import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';

@Injectable()
export class OrdersBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) { }

  async ordersFromWorkshopTransformation(twId: number) {
    try {
      const tw = this.prisma.order.findMany({
        where: {
          workshop_fk: twId,
        },
      })

      return tw

    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }


}
