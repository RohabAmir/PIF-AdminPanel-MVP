import { Prisma, PrismaClient } from '@prisma/client';

/** Models that belong to a tenant (website). Every query on them is forced to the active site. */
export const TENANT_MODELS = new Set<string>([
  'Page',
  'Section',
  'BlogPost',
  'BlogCategory',
  'Form',
  'Lead',
  'LeadNote',
  'SocialLink',
  'SeoSetting',
  'MediaAsset',
]);

const WHERE_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

type Args = Record<string, unknown> & {
  where?: Record<string, unknown>;
  data?: unknown;
  create?: Record<string, unknown>;
};

/**
 * Returns a Prisma client bound to one site. It injects `siteId` into every `where`
 * (including unique lookups, via Prisma's extended where-unique) and into every `create`,
 * so a service cannot accidentally read or write another tenant's rows — even when an
 * attacker guesses a valid record id.
 */
export function scopeToSite(client: PrismaClient, siteId: string) {
  return client.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) return query(args);
          const a = (args ?? {}) as Args;
          if (WHERE_OPS.has(operation)) {
            a.where = { ...(a.where ?? {}), siteId };
          }
          if (operation === 'create') {
            a.data = { ...(a.data as Record<string, unknown>), siteId };
          }
          if (operation === 'createMany' || operation === 'createManyAndReturn') {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            a.data = rows.map((r) => ({ ...(r as Record<string, unknown>), siteId }));
          }
          if (operation === 'upsert') {
            a.create = { ...(a.create ?? {}), siteId };
          }
          if ((operation === 'update' || operation === 'updateMany') && a.data) {
            // Never allow moving a row to another tenant.
            const d = a.data as Record<string, unknown>;
            if ('siteId' in d) delete d.siteId;
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

export type TenantClient = ReturnType<typeof scopeToSite>;
export type JsonValue = Prisma.InputJsonValue;
