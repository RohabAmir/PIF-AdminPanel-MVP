import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, mergeMap } from 'rxjs';
import { AUDIT, AuditMeta } from '../common/decorators';
import { getRequestContext } from '../common/context/request-context';
import type { AuthedRequest } from '../common/types';
import { AuditService } from './audit.service';

const VERBS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  published: 'published',
  unpublished: 'unpublished',
  archived: 'archived',
  duplicated: 'duplicated',
  reordered: 'reordered',
  uploaded: 'uploaded',
  exported: 'exported',
};

function labelOf(obj: unknown): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  const v = o.title ?? o.name ?? o.email ?? o.key ?? o.filename ?? o.platform;
  return typeof v === 'string' ? v : undefined;
}

/**
 * Global interceptor behind the `@Audit(action, entity)` decorator. Runs after the handler
 * succeeds, so failed requests never produce misleading log rows. Services can enrich the
 * entry (before-state for diffs, custom summary) through `setAuditHints()`.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT, context.getHandler());
    if (!meta) return next.handle();
    const req = context.switchToHttp().getRequest<AuthedRequest>();

    return next.handle().pipe(
      mergeMap((result) =>
        from(
          (async () => {
            const hints = getRequestContext()?.audit ?? {};
            if (hints.skip) return result;
            const after = hints.after !== undefined ? hints.after : result;
            const entity = meta.entity ?? meta.action.split('.')[0];
            const verbKey = meta.action.split('.').pop() ?? '';
            const verb = VERBS[verbKey] ?? verbKey.replace(/_/g, ' ');
            const label = labelOf(after) ?? labelOf(hints.before);
            const entityId =
              hints.entityId ??
              (after && typeof after === 'object' && 'id' in after
                ? String((after as { id: unknown }).id)
                : typeof req.params?.id === 'string'
                  ? req.params.id
                  : undefined);
            await this.audit.log({
              action: meta.action,
              entityType: entity,
              entityId,
              summary:
                hints.summary ??
                `${req.user?.name ?? 'System'} ${verb} ${entity.replace(/_/g, ' ')}${label ? ` "${label}"` : ''}`,
              before: hints.before ?? null,
              after: verbKey === 'deleted' ? null : after,
            });
            return result;
          })(),
        ),
      ),
    );
  }
}
