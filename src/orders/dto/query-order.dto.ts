import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryOrderDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  @ApiPropertyOptional()
  payment_status?: PaymentStatus;
}
