import { BookOpenText, ClipboardList, FileStack, Fingerprint, Globe, Image, LayoutDashboard, Search, Share2, SquareCode, UserCircle, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { P, type Permission } from '@/lib/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: Permission;
}
export interface NavGroup {
  label: string | null;
  siteScoped?: boolean;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  { label: null, items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, permission: P.CONTENT_READ }] },
  {
    label: 'Website content',
    siteScoped: true,
    items: [
      { label: 'Pages', to: '/pages', icon: FileStack, permission: P.CONTENT_READ },
      { label: 'Blogs', to: '/blogs', icon: BookOpenText, permission: P.CONTENT_READ },
      { label: 'Forms', to: '/forms', icon: ClipboardList, permission: P.CONTENT_READ },
      { label: 'Leads', to: '/leads', icon: Users, permission: P.CONTENT_READ },
      { label: 'Media Library', to: '/media', icon: Image, permission: P.CONTENT_READ },
      { label: 'Social Media', to: '/social', icon: Share2, permission: P.CONTENT_READ },
      { label: 'SEO Settings', to: '/seo', icon: Search, permission: P.CONTENT_READ },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Websites', to: '/sites', icon: Globe, permission: P.SITES_MANAGE },
      { label: 'Admins & Users', to: '/users', icon: UserCircle, permission: P.USERS_MANAGE },
      { label: 'Activity Logs', to: '/activity-logs', icon: Fingerprint, permission: P.LOGS_VIEW },
      { label: 'API Playground', to: '/api-playground', icon: SquareCode, permission: P.SETTINGS_MANAGE },
    ],
  },
];
