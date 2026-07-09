import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { isEmpty } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserAdminDto, CreateUserDto } from '../dto/create-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    return this.createWithRole(createUserDto, Role.CUSTOMER);
  }

  async createByAdmin(createUserDto: CreateUserAdminDto) {
    return this.createWithRole(createUserDto, createUserDto.role ?? Role.CUSTOMER);
  }

  private async createWithRole(
    createUserDto: CreateUserDto,
    role: Role,
  ) {
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
          data: { ...createUserDto, role, password: hashedPassword },
        });

        if (createdUser.role === 'CUSTOMER') {
          await tx.customer.create({
            data: {
              user: { connect: { id: createdUser.id } },
            },
          });
        }

        return createdUser;
      });

      return transaction;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  } 

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 20, ...rest } = query;
    const skip = (page - 1) * limit;
    const selectInfo = {
      id: true,
      name: true,
      email: true,
      active: true,
      password: false,
    };
    const filters = { deletedAt: null, ...(isEmpty(rest) ? {} : { ...rest }) };

    const [data, total] = await Promise.all([
      this.prisma.users.findMany({
        skip,
        take: limit,
        select: { ...selectInfo, role: true },
        where: filters,
      }),
      this.prisma.users.count({ where: filters }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        active: true,
        deletedAt: true,
        password: false,
        role: true,
        email: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, email: string) {

    try {
      await this.findOne(id);


      const updatedUser = await this.prisma.users.update({
        where: {
          id,
        },
        data: { ...updateUserDto, active: updateUserDto.active },
      });

      return updatedUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOneByEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email: email, deletedAt: null },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async verifyByEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email: email, deletedAt: null },
    });

    return { email: email, exists: user ? true : false };
  }

  async findVerifyEmail(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id: id, deletedAt: null },
    });

    if (!user?.verify_email) {
      throw new HttpException('Unverified email', HttpStatus.UNAUTHORIZED);
    }

    return user;
  }

  async remove(id: string) {
    try {
      const user = await this.findOne(+id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.users.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      });

      return { message: 'User deleted successfully' };
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
