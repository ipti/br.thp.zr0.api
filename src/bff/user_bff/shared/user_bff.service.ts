import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';

@Injectable()
export class UserBffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async FindUserTranformationWorkshop(userId: number) {
    try {
      const user = await this.usersService.findOne(userId);
      if (user.role === 'ADMIN') {
        const getUser = await this.usersService.findAll({});
        return getUser;
      }
      const getUser = await this.prisma.$queryRaw`SELECT *
              FROM zr0.users_in_same_workshops
              WHERE reference_user_id = ${userId}
          `;

      return getUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
