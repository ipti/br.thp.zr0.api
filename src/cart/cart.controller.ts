import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse
} from '@nestjs/swagger';
import { CartService } from './shared/cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { QueryCartDto } from './dto/query-cart.dto';
import { CartResponse } from './doc/cart.response';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Post()
  @ApiCreatedResponse({ type: CartResponse })
  async create(@Body() createCartDto: CreateCartDto) {
    return this.cartService.create(createCartDto);
  }

  @Get()
  @ApiOkResponse({ type: [CartResponse] })
  async findAll(@Query() query: QueryCartDto) {
    return this.cartService.findAll(query);
  }

  @Get('me/items')
  async findMyCart(@Req() req: any) {
    return this.cartService.getMyCart(req.user.id);
  }

  @Post('items')
  async addItem(@Req() req: any, @Body() body: CreateCartItemDto) {
    return this.cartService.addItem(req.user.id, body);
  }

  @Patch('items/:id')
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() body: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user.id, +id, body);
  }

  @Delete('items/:id')
  async removeItem(@Req() req: any, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.id, +id);
  }

  @Get(':id')
  @ApiOkResponse({ type: [CartResponse] })
  async findOne(@Param('id') id: string) {
    return this.cartService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CartResponse })
  async update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.update(+id, updateCartDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.cartService.remove(+id);
  }
}
