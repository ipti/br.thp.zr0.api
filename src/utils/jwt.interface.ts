import { Role } from "@prisma/client";

export interface JwtPayload {
    id: number;
    name: string;
    email: string;
    role: Role;
}