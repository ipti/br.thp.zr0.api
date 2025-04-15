import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  getOrigins(): any {
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://coded-edmundo.thp.org.br',
    ];
  }
}
