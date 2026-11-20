import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormField, SectionType, SocialPlatform } from '@/lib/types';
import { onContentChange } from './live';
import type { WebsiteConfig } from './registry';

export interface PublicNavPage {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  order: number;
}
export interface PublicSection {
  id: string;
  type: SectionType;
  name: string;
  content: Record<string, unknown>;
  order: number;
}
export interface PublicSeo {
  title: string;
  description: string;
  canonical: string | null;
  robots: string;
  og: { title: string; description: string; image: string | null };
}
export interface PublicPage {
  id: string;
  title: string;
  slug: string;
  sections: PublicSection[];
  seo: PublicSeo;
}
export interface PublicPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  tags: string[];
  readingTime: number;
  publishedAt: string;
  category: { name: string; slug: string } | null;
  author: { name: string } | null;
}
export interface PublicPost extends PublicPostSummary {
  content: string;
  seo: PublicSeo;
}
export interface PublicForm {
  key: string;
  name: string;
  description: string;
  fields: FormField[];
  successMessage: string;
}
export interface PublicSocial {
  platform: SocialPlatform;
  url: string;
}

export class PublicApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details: { field: string; errors: string[] }[] = [],
  ) {
    super(message);
  }
}

async function call<T>(site: WebsiteConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/public${path}`, {
    ...init,
    // Content must reflect dashboard edits immediately, so bypass the HTTP cache.
    cache: 'no-store',
    headers: { 'X-API-Key': site.apiKey, 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    details?: { field: string; errors: string[] }[];
  };
  if (!res.ok) {
    const msg = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    throw new PublicApiError(res.status, msg ?? `Request failed (${res.status})`, body.details);
  }
  return body as T;
}

export const publicApi = {
  pages: (s: WebsiteConfig) => call<{ data: PublicNavPage[] }>(s, '/pages').then((r) => r.data),
  page: (s: WebsiteConfig, slug: string) => call<PublicPage>(s, `/pages/${encodeURIComponent(slug)}`),
  social: (s: WebsiteConfig) => call<{ data: PublicSocial[] }>(s, '/social-links').then((r) => r.data),
  posts: (s: WebsiteConfig, pageSize: number, category?: string) =>
    call<{ data: PublicPostSummary[] }>(
      s,
      `/blogs?pageSize=${pageSize}${category ? `&category=${encodeURIComponent(category)}` : ''}`,
    ).then((r) => r.data),
  post: (s: WebsiteConfig, slug: string) => call<PublicPost>(s, `/blogs/${encodeURIComponent(slug)}`),
  form: (s: WebsiteConfig, key: string) => call<PublicForm>(s, `/forms/${encodeURIComponent(key)}`),
  submit: (s: WebsiteConfig, key: string, data: Record<string, unknown>, sourcePage: string, hp: string) =>
    call<{ success: boolean; message: string }>(s, `/forms/${encodeURIComponent(key)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ data, sourcePage, _hp: hp }),
    }),
};

const LIVE = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: 20_000,
  retry: (n: number, e: unknown) => !(e instanceof PublicApiError && e.status < 500) && n < 2,
} as const;

export const useNav = (s: WebsiteConfig) =>
  useQuery({ queryKey: ['website', s.path, 'nav'], queryFn: () => publicApi.pages(s), ...LIVE });
export const useSocial = (s: WebsiteConfig) =>
  useQuery({ queryKey: ['website', s.path, 'social'], queryFn: () => publicApi.social(s), ...LIVE });
export const usePage = (s: WebsiteConfig, slug: string) =>
  useQuery({ queryKey: ['website', s.path, 'page', slug], queryFn: () => publicApi.page(s, slug), ...LIVE });
export const usePosts = (s: WebsiteConfig, count: number, category?: string) =>
  useQuery({
    queryKey: ['website', s.path, 'posts', count, category ?? ''],
    queryFn: () => publicApi.posts(s, count, category),
    ...LIVE,
  });
export const usePost = (s: WebsiteConfig, slug: string) =>
  useQuery({ queryKey: ['website', s.path, 'post', slug], queryFn: () => publicApi.post(s, slug), ...LIVE });
export const usePublicForm = (s: WebsiteConfig, key: string) =>
  useQuery({
    queryKey: ['website', s.path, 'form', key],
    queryFn: () => publicApi.form(s, key),
    ...LIVE,
    refetchInterval: false,
  });

/** Refetches everything of this website the moment the admin panel saves a change. */
export function useLiveContent(s: WebsiteConfig): void {
  const qc = useQueryClient();
  useEffect(
    () => onContentChange(s.siteSlug, () => void qc.invalidateQueries({ queryKey: ['website', s.path] })),
    [qc, s.path, s.siteSlug],
  );
}

export interface NavItem extends PublicNavPage {
  children: PublicNavPage[];
}

/** Published pages as a two-level menu (home excluded). */
export function navTree(pages: PublicNavPage[]): NavItem[] {
  const ids = new Set(pages.map((p) => p.id));
  // Children of an unpublished parent are promoted to the top level.
  const top = pages.filter((p) => (!p.parentId || !ids.has(p.parentId)) && p.slug !== 'home');
  return top.map((p) => ({ ...p, children: pages.filter((c) => c.parentId === p.id) }));
}
