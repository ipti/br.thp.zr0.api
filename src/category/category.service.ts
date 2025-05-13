import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const createdCategory = await this.prisma.category.create({
        data: {
          name: createCategoryDto.name,
        },
      });

      return createdCategory;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findAll() {
    try {
      const findAllCategory = await this.prisma.category.findMany();

      return findAllCategory;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(id: number) {
    try {
      const findOneCategory = await this.prisma.category.findUnique({
        where: {
          id: id,
        },
      });

      return findOneCategory;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try {
      const updateCategory = await this.prisma.category.update({
        where: { id },
        data: {
          name: updateCategoryDto.name,
        },
      });

      return updateCategory;
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: number) {
    try {
      const category = await this.findOne(+id);
      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      await this.prisma.category.delete({
        where: { id: category.id },
      });

      return { message: 'Category deleted successfully' };
    } catch (err) {
      console.log(err);
      throw new HttpException(err, HttpStatus.BAD_REQUEST);
    }
  }
}
