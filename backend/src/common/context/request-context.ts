import { AsyncLocalStorage } from 'node:async_hooks';
import type { Role } from '@prisma/client';

export interface ContextActor {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ContextSite {
  id: string;
  name: string;
}

export interface RequestContextStore {
  requestId: string;
  ip?: string;
  userAgent?: string;
  actor?: ContextActor;
  site?: ContextSite;
  audit?: AuditHints;
}

/** Per-request context (request id, client info, actor, active site) via AsyncLocalStorage. */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContext.getStore();
}

/** Data a service can attach for the audit interceptor (before-state, custom summary, …). */
export interface AuditHints {
  before?: unknown;
  after?: unknown;
  entityId?: string;
  summary?: string;
  skip?: boolean;
}

export function setAuditHints(hints: AuditHints): void {
  const store = requestContext.getStore();
  if (store) store.audit = { ...(store.audit ?? {}), ...hints };
}
