import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { isEmpty } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { QueryUserDto } from '../dto/query-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const userRegistered = await this.prisma.users.findMany({
      where: { email: createUserDto.email },
    });

    if (userRegistered.length > 0) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await this.hashPassword(createUserDto.password);

    try {
      const createdUser = await this.prisma.users.create({
        data: { ...createUserDto, password: hashedPassword },
      });

      return createdUser;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(query: QueryUserDto) {
    const selectInfo = {
      id: true,
      name: true,
      email: true,
      active: true,
      password: false,
    };
    const filters = isEmpty(query) ? {} : { ...query };

    return this.prisma.users.findMany({
      select: { ...selectInfo, role: true },
      where: filters,
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        active: true,
        password: false,
        role: true,
        email: true,
      },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto, email: string) {
    try {
      const user = await this.findOne(id);
      const updatedUser = await this.prisma.users.update({
        where: {
          id,
        },
        data: { ...user, active: updateUserDto.active },
      });

      return updatedUser;
    } catch (err) {
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOneByEmail(email: string) {
    const user = await this.prisma.users.findFirst({
      where: { email: email },
    });

    return user;
  }

  async findVerifyEmail(id: number) {
    const user = await this.prisma.users.findFirst({
      where: { id: id },
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

      await this.prisma.users.delete({
        where: { id: user.id },
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
