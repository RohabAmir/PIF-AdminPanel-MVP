import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { scopeToSite, TenantClient } from './tenant-extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Tenant-scoped client — use this for every CMS query. */
  forSite(siteId: string): TenantClient {
    return scopeToSite(this, siteId);
  }
}
