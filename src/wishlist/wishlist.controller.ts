import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':productUid')
  add(@Req() req: any, @Param('productUid') productUid: string) {
    return this.wishlistService.add(req.user.id, productUid);
  }

  @Delete(':productUid')
  remove(@Req() req: any, @Param('productUid') productUid: string) {
    return this.wishlistService.remove(req.user.id, productUid);
  }

  @Get()
  list(@Req() req: any) {
    return this.wishlistService.list(req.user.id);
  }

  @Get('check/:productUid')
  check(@Req() req: any, @Param('productUid') productUid: string) {
    return this.wishlistService.check(req.user.id, productUid);
  }
}
