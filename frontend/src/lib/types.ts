export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';
export type PageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type BlogStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'WON' | 'LOST';
export type SectionType =
  | 'HERO'
  | 'RICH_TEXT'
  | 'IMAGE_TEXT'
  | 'FEATURE_CARDS'
  | 'STATS'
  | 'TESTIMONIALS'
  | 'FAQ'
  | 'CTA'
  | 'GALLERY';
export type SocialPlatform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'X'
  | 'LINKEDIN'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'SNAPCHAT'
  | 'WHATSAPP';

export interface SiteSummary {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  avatarColor: string;
  lastLoginAt: string | null;
  tempPasswordExpiresAt: string | null;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  sites: SiteSummary[];
}

export interface Me extends User {
  permissions: string[];
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}

export interface Page {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  status: PageStatus;
  parentId: string | null;
  order: number;
  seo: Seo | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parent: { id: string; title: string; slug: string } | null;
  createdBy: { id: string; name: string } | null;
  _count: { sections: number; children: number };
}

export interface Section {
  id: string;
  pageId: string;
  type: SectionType;
  name: string;
  content: Record<string, unknown>;
  order: number;
  isVisible: boolean;
  updatedAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  content?: string;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; name: string } | null;
  tags: string[];
  status: BlogStatus;
  publishedAt: string | null;
  readingTime: number;
  seo: Seo | null;
  createdAt: string;
  updatedAt: string;
}

export type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}
export interface FormDef {
  id: string;
  key: string;
  name: string;
  description: string;
  fields: FormField[];
  successMessage: string;
  notificationEmail: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { leads: number };
}

export interface LeadNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}
export interface Lead {
  id: string;
  formId: string | null;
  formName: string;
  data: Record<string, unknown>;
  name: string | null;
  email: string | null;
  phone: string | null;
  sourcePage: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  notes?: LeadNote[];
  form?: { id: string; name: string; fields: FormField[] } | null;
  _count?: { notes: number };
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  order: number;
  isActive: boolean;
}

export interface SeoSettings {
  id: string;
  titleTemplate: string;
  defaultMetaDescription: string;
  defaultOgImage: string | null;
  robotsTxt: string;
  canonicalBaseUrl: string | null;
  googleVerification: string | null;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  storage: 'local' | 'cloudinary' | 'external';
  filename: string;
  mimeType: string;
  size: number;
  alt: string;
  createdAt: string;
  uploadedBy: { id: string; name: string } | null;
}

export interface Site extends SiteSummary {
  faviconUrl: string | null;
  defaultLanguage: string;
  apiKeyPrefix: string;
  createdAt: string;
  updatedAt: string;
  _count?: { pages: number; blogPosts: number; leads: number; users: number };
}

export interface ActivityLog {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: Role | null;
  siteId: string | null;
  siteName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface PublicConfig {
  demoMode: boolean;
  demoAccounts: { email: string; name: string; role: Role; password: string }[];
  uploadsEnabled: boolean;
  mediaDriver: 'local' | 'cloudinary' | 'url';
  maxUploadMb: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}
