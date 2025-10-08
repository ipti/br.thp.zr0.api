import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/shared/users.service';
import { CreateUserBffDto } from '../dto/create-user.dto';
import * as bcrypt from 'bcrypt';

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
      const getUser = await this.prisma.users.findMany({
        where: {
          NOT: {
            role: 'CUSTOMER',
          },
        },
      });

      return getUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async FindUserToken(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
        },

        select: {
          customer: {
            include: {
              billing_address: {
                include: {
                  city: true,
                  state: true,
                },
              },
            },
          },
          password: false,
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
        },
      });
      return user;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async FindUserTokenProfile(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
        },

        select: {
          customer: {
            include: {
              billing_address: {
                include: {
                  city: true,
                  state: true,
                },
              },
            },
          },
          password: false,
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      const profile = await this.prisma.profile.findUnique({
        where: {
          role: user?.role,
        },
        include: {
          menu: true,
          pages: true,
        },
      });
      return profile;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async FindUserTokenAddress(userId: number) {
    try {
      const user = await this.prisma.users.findUnique({
        where: {
          id: userId,
        },
        select: {
          customer: {
            select: {
              address_customer: {
                include: {
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      return user;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async create(createUserDto: CreateUserBffDto) {
    const userRegistered = await this.prisma.users.findMany({
      where: { email: createUserDto.email },
    });

    if (userRegistered.length > 0) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await this.hashPassword(createUserDto.password);

    try {
      const transaction = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.users.create({
          data: {
            email: createUserDto.email,
            name: createUserDto.name,
            password: hashedPassword,
            role: createUserDto.role,
          },
        });

        await tx.transformation_workshop_user.create({
          data: {
            users: { connect: { id: createdUser.id } },
            transformation_workshop: { connect: { id: createUserDto.ot_fk } },
          },
        });

        return createdUser;
      });
      return transaction;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
