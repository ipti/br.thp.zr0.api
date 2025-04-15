import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtPayload } from './jwt.interface';

export function verifyAdmin(user: JwtPayload) {
  if (user.role !== 'ADMIN') {
    throw new HttpException(
      'O usuário não tem permissão',
      HttpStatus.FORBIDDEN,
    );
  }
}


export function verifyAdminBoolean(user: any) {
  return user.role === 'ADMIN' ? true : false;
}
