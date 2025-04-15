import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import 'dotenv/config';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../jwt.interface';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {

      try {
        const decodedToken = jwt.verify(
          token,
          process.env.SECRET ?? "",
        ) as JwtPayload;

        req.user = decodedToken;
      } catch (error) {
        console.log(error)
        throw new HttpException(error, 401);
      }
    }
    next();
  }
}
