import { useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Ghost, MessageCircle, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from '@/components/BrandIcons';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import type { SocialLink, SocialPlatform } from '@/lib/types';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/controls';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export const PLATFORMS: Record<SocialPlatform, { label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; hosts: string[]; example: string }> = {
  FACEBOOK: { label: 'Facebook', icon: FacebookIcon, color: '#1877F2', hosts: ['facebook.com', 'fb.com'], example: 'https://facebook.com/yourpage' },
  INSTAGRAM: { label: 'Instagram', icon: InstagramIcon, color: '#E4405F', hosts: ['instagram.com'], example: 'https://instagram.com/yourhandle' },
  X: { label: 'X (Twitter)', icon: XIcon, color: '#111111', hosts: ['x.com', 'twitter.com'], example: 'https://x.com/yourhandle' },
  LINKEDIN: { label: 'LinkedIn', icon: LinkedinIcon, color: '#0A66C2', hosts: ['linkedin.com'], example: 'https://linkedin.com/company/yourcompany' },
  YOUTUBE: { label: 'YouTube', icon: YoutubeIcon, color: '#FF0000', hosts: ['youtube.com', 'youtu.be'], example: 'https://youtube.com/@yourchannel' },
  TIKTOK: { label: 'TikTok', icon: TiktokIcon, color: '#000000', hosts: ['tiktok.com'], example: 'https://tiktok.com/@yourhandle' },
  SNAPCHAT: { label: 'Snapchat', icon: Ghost, color: '#F7C600', hosts: ['snapchat.com'], example: 'https://snapchat.com/add/yourhandle' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, color: '#25D366', hosts: ['wa.me', 'whatsapp.com'], example: 'https://wa.me/971500000000' },
};

export function validateSocialUrl(platform: SocialPlatform, raw: string): string | null {
  let u: URL;
  try { u = new URL(raw); } catch { return 'Enter a full URL starting with https://'; }
  if (u.protocol !== 'https:') return 'Social links must use https://';
  const host = u.hostname.toLowerCase().replace(/^www\.|^m\.|^mobile\.|^api\./, '');
  if (!PLATFORMS[platform].hosts.some((h) => host === h || host.endsWith(`.${h}`))) return `This doesn't look like a ${PLATFORMS[platform].label} URL (expected ${PLATFORMS[platform].hosts.join(' or ')}).`;
  if (u.pathname.length <= 1 && platform !== 'WHATSAPP') return 'Include the profile or page path in the URL.';
  return null;
}

function LinkModal({ open, onOpenChange, link, used }: { open: boolean; onOpenChange: (o: boolean) => void; link: SocialLink | null; used: SocialPlatform[] }) {
  const available = (Object.keys(PLATFORMS) as SocialPlatform[]).filter((p) => p === link?.platform || !used.includes(p));
  const [platform, setPlatform] = useState<SocialPlatform>(link?.platform ?? available[0] ?? 'FACEBOOK');
  const [url, setUrl] = useState(link?.url ?? '');
  const [active, setActive] = useState(link?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  useEffect(() => {
    if (open) { setPlatform(link?.platform ?? available[0] ?? 'FACEBOOK'); setUrl(link?.url ?? ''); setActive(link?.isActive ?? true); setTouched(false); setServerError(null); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const error = touched ? validateSocialUrl(platform, url.trim()) : null;
  const save = useSiteMutation(async () => (link ? api.patch(`/social-links/${link.id}`, { url: url.trim(), isActive: active }) : api.post('/social-links', { platform, url: url.trim(), isActive: active })), {
    success: link ? 'Social link updated.' : 'Social link added.',
    invalidate: [['social']],
    onSuccess: () => onOpenChange(false),
    onError: (e) => setServerError(fieldErrors(e)[0]?.message ?? errorMessage(e)),
  });
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={link ? `Edit ${PLATFORMS[link.platform].label}` : 'Add social link'} footer={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button loading={save.isPending} onClick={() => { setTouched(true); if (!validateSocialUrl(platform, url.trim())) save.mutate(undefined); }}>{link ? 'Save' : 'Add link'}</Button></>}>
      <div className="space-y-4">
        <Field label="Platform">
          <Select value={platform} disabled={!!link} onChange={(e) => setPlatform(e.target.value as SocialPlatform)}>
            {available.map((p) => <option key={p} value={p}>{PLATFORMS[p].label}</option>)}
          </Select>
        </Field>
        <Field label="Profile URL" required error={error ?? serverError ?? undefined} hint={`e.g. ${PLATFORMS[platform].example}`}>
          <Input value={url} onChange={(e) => { setUrl(e.target.value); setServerError(null); }} onBlur={() => setTouched(true)} placeholder={PLATFORMS[platform].example} autoFocus />
        </Field>
        <label className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-[0.8125rem] font-semibold">
          Show on website
          <Switch label="Show on website" checked={active} onCheckedChange={setActive} />
        </label>
      </div>
    </Modal>
  );
}

export default function SocialPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const canManage = can(P.SETTINGS_MANAGE);
  const [editing, setEditing] = useState<SocialLink | null | 'new'>(null);
  const [toDelete, setToDelete] = useState<SocialLink | null>(null);
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['social'], async () => (await api.get<SocialLink[]>('/social-links')).data);
  const inv = [['social']];
  const toggle = useSiteMutation(async (l: SocialLink) => api.patch(`/social-links/${l.id}`, { isActive: !l.isActive }), { success: (_d, l) => `${PLATFORMS[l.platform].label} ${l.isActive ? 'hidden' : 'shown'} on the website.`, invalidate: inv });
  const reorder = useSiteMutation(async (ids: string[]) => api.put('/social-links/order', { ids }), { success: 'Order saved.', invalidate: inv });
  const remove = useSiteMutation(async (id: string) => api.delete(`/social-links/${id}`), { success: 'Social link removed.', invalidate: inv, onSuccess: () => setToDelete(null) });
  const used = (data ?? []).map((l) => l.platform);
  const move = (i: number, d: -1 | 1) => {
    if (!data) return;
    const ids = data.map((l) => l.id);
    [ids[i], ids[i + d]] = [ids[i + d]!, ids[i]!];
    reorder.mutate(ids);
  };

  return (
    <>
      <PageHeader title="Social Media" description={`Manage the social profiles linked from ${site?.name}`} crumbs={[{ label: 'Social Media' }]} />
      <Card>
        <CardHeader
          title={`${site?.name} Social Links`}
          description={canManage ? 'Order here is the order in the website footer' : 'Read-only — only Admins can change social settings'}
          actions={canManage && used.length < 8 && <Button size="sm" variant="violet" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add link</Button>}
        />
        <CardBody>
          {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.length ? (
            <EmptyState icon={<Share2 />} title="No social links yet" description="Add your Instagram, LinkedIn and other profiles." action={canManage && <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add link</Button>} />
          ) : (
            <ul className="space-y-3">
              {data.map((l, i) => {
                const meta = PLATFORMS[l.platform];
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 sm:flex-nowrap">
                    {canManage && (
                      <span className="flex flex-col">
                        <button type="button" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} className="text-muted hover:text-accent disabled:opacity-20" aria-label={`Move ${meta.label} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" disabled={i === data.length - 1 || reorder.isPending} onClick={() => move(i, 1)} className="text-muted hover:text-accent disabled:opacity-20" aria-label={`Move ${meta.label} down`}><ArrowDown className="h-3.5 w-3.5" /></button>
                      </span>
                    )}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: meta.color }}><meta.icon className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-accent">{meta.label}</p>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 truncate text-xs text-muted hover:text-primary">{l.url}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden /></a>
                    </div>
                    <Badge tone={l.isActive ? 'green' : 'gray'} dot>{l.isActive ? 'Visible' : 'Hidden'}</Badge>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Switch label={`Show ${meta.label} on website`} checked={l.isActive} onCheckedChange={() => toggle.mutate(l)} />
                        <Button size="icon" variant="ghost" onClick={() => setEditing(l)} aria-label={`Edit ${meta.label}`}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="danger-ghost" onClick={() => setToDelete(l)} aria-label={`Remove ${meta.label}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
      <LinkModal open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} link={editing === 'new' ? null : editing} used={used} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Remove ${toDelete ? PLATFORMS[toDelete.platform].label : ''}?`} description="The link disappears from the website immediately." confirmLabel="Remove" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} />
    </>
  );
}
