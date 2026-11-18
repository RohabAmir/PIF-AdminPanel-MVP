import type { Request } from 'express';
import type { Role, Site, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  tokenVersion: number;
  siteIds: string[];
}

export interface AuthedRequest extends Request {
  user: AuthUser;
  site?: Site;
}
