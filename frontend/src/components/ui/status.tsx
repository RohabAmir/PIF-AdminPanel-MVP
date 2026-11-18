import type { BlogStatus, LeadStatus, PageStatus, Role, UserStatus } from '@/lib/types';
import { ROLE_LABEL } from '@/lib/permissions';
import { Badge, type BadgeTone } from './badge';

const ROLE_TONE: Record<Role, BadgeTone> = { SUPER_ADMIN: 'red', ADMIN: 'violet', EDITOR: 'blue', VIEWER: 'gray' };
export const RoleBadge = ({ role }: { role: Role }) => <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>;

const USER_STATUS: Record<UserStatus, [string, BadgeTone]> = {
  ACTIVE: ['Active', 'green'],
  PENDING: ['Pending first login', 'amber'],
  INACTIVE: ['Inactive', 'gray'],
};
export const UserStatusBadge = ({ status }: { status: UserStatus }) => (
  <Badge tone={USER_STATUS[status][1]} dot>
    {USER_STATUS[status][0]}
  </Badge>
);

const CONTENT_STATUS: Record<PageStatus | BlogStatus, [string, BadgeTone]> = {
  DRAFT: ['Draft', 'gray'],
  PUBLISHED: ['Published', 'green'],
  ARCHIVED: ['Archived', 'brown'],
  SCHEDULED: ['Scheduled', 'blue'],
};
export const ContentStatusBadge = ({ status }: { status: PageStatus | BlogStatus }) => (
  <Badge tone={CONTENT_STATUS[status][1]} dot>
    {CONTENT_STATUS[status][0]}
  </Badge>
);

export const LEAD_STATUS: Record<LeadStatus, { label: string; tone: BadgeTone; color: string }> = {
  NEW: { label: 'New', tone: 'violet', color: '#845ADF' },
  CONTACTED: { label: 'Contacted', tone: 'blue', color: '#49B6F5' },
  QUALIFIED: { label: 'Qualified', tone: 'amber', color: '#F5B849' },
  WON: { label: 'Won', tone: 'green', color: '#26BF94' },
  LOST: { label: 'Lost', tone: 'red', color: '#E6533C' },
};
export const LeadStatusBadge = ({ status }: { status: LeadStatus }) => (
  <Badge tone={LEAD_STATUS[status].tone} dot>
    {LEAD_STATUS[status].label}
  </Badge>
);
