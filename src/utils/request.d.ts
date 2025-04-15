import { JwtPayload } from './jwt.interface';

declare module 'express' {
  interface Request {
    user?: JwtPayload;
  }
}
