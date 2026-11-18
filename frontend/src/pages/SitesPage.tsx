import { useEffect, useState } from 'react';
import {
  Copy,
  Globe,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage, fieldErrors } from '@/lib/api';
import type { Paginated, Site } from '@/lib/types';
import { fmtDate, slugify } from '@/lib/utils';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  Pagination,
  SearchInput,
  Table,
  TableSkeleton,
  Td,
  Th,
  Tr,
} from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Switch } from '@/components/ui/controls';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { ImageFieldPlain } from './site-image-field';

interface SiteForm {
  name: string;
  slug: string;
  domain: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  defaultLanguage: string;
  isActive: boolean;
}
const EMPTY: SiteForm = {
  name: '',
  slug: '',
  domain: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#4A4A89',
  defaultLanguage: 'en',
  isActive: true,
};
const LANGS = [
  ['en', 'English'],
  ['ar', 'Arabic'],
  ['fr', 'French'],
  ['es', 'Spanish'],
  ['de', 'German'],
  ['ur', 'Urdu'],
];

function ApiKeyReveal({ apiKey, onClose }: { apiKey: string | null; onClose: () => void }) {
  return (
    <Modal
      open={!!apiKey}
      onOpenChange={(o) => !o && onClose()}
      title="Public API key"
      description="Copy it now — for security it is shown only once."
      footer={<Button onClick={onClose}>I have saved the key</Button>}
    >
      <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-ink">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Anyone with this key can read
        published content and submit forms for this website. Store it in your website's server or build
        configuration.
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          readOnly
          value={apiKey ?? ''}
          className="font-mono text-xs"
          aria-label="API key"
          onFocus={(e) => e.target.select()}
          data-testid="api-key"
        />
        <Button
          variant="outline"
          onClick={() =>
            navigator.clipboard.writeText(apiKey ?? '').then(
              () => toast.success('API key copied.'),
              () => toast.error('Copy failed — select and copy manually.'),
            )
          }
        >
          <Copy className="h-4 w-4" /> Copy
        </Button>
      </div>
    </Modal>
  );
}

function SiteModal({
  open,
  onOpenChange,
  site,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  site: Site | null;
  onCreated: (key: string) => void;
}) {
  const qc = useQueryClient();
  const { reloadUser } = useAuth();
  const [form, setForm] = useState<SiteForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSlugTouched(!!site);
    setForm(
      site
        ? {
            name: site.name,
            slug: site.slug,
            domain: site.domain ?? '',
            logoUrl: site.logoUrl ?? '',
            faviconUrl: site.faviconUrl ?? '',
            primaryColor: site.primaryColor,
            defaultLanguage: site.defaultLanguage,
            isActive: site.isActive,
          }
        : EMPTY,
    );
  }, [open, site]);
  const set = (p: Partial<SiteForm>) => setForm((f) => ({ ...f, ...p }));
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        domain: form.domain || null,
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
        slug: form.slug || undefined,
      };
      return site
        ? { site: (await api.patch<Site>(`/sites/${site.id}`, body)).data, apiKey: undefined }
        : (await api.post<{ site: Site; apiKey: string }>('/sites', body)).data;
    },
    onSuccess: async (res) => {
      toast.success(site ? 'Website updated.' : `Website "${res.site.name}" created.`);
      await qc.invalidateQueries({ queryKey: ['sites'] });
      await reloadUser();
      onOpenChange(false);
      if (res.apiKey) onCreated(res.apiKey);
    },
    onError: (e) => {
      const fe = fieldErrors(e);
      if (fe.length) setErrors(Object.fromEntries(fe.map((f) => [f.field, f.message])));
      else toast.error(errorMessage(e));
    },
  });
  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug))
      e.slug = 'Use lower-case letters, numbers and dashes.';
    if (form.domain && !/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(form.domain))
      e.domain = 'Enter a domain like example.com (no https://).';
    if (!/^#[0-9a-fA-F]{6}$/.test(form.primaryColor)) e.primaryColor = 'Use a hex colour like #4A4A89.';
    setErrors(e);
    return !Object.keys(e).length;
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={site ? `Edit ${site.name}` : 'Create website'}
      description={site ? undefined : 'A new tenant with its own content, users, SEO and public API key.'}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => validate() && save.mutate()}>
            {site ? 'Save changes' : 'Create website'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name}>
          <Input
            value={form.name}
            maxLength={80}
            autoFocus
            onChange={(e) =>
              set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })
            }
          />
        </Field>
        <Field label="Slug" error={errors.slug} hint="Unique identifier">
          <Input
            value={form.slug}
            maxLength={60}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: e.target.value });
            }}
          />
        </Field>
        <Field label="Domain" error={errors.domain}>
          <Input
            value={form.domain}
            placeholder="www.example.com"
            onChange={(e) => set({ domain: e.target.value })}
          />
        </Field>
        <Field label="Default language">
          <Select value={form.defaultLanguage} onChange={(e) => set({ defaultLanguage: e.target.value })}>
            {LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primary colour" error={errors.primaryColor}>
          <div className="flex gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? form.primaryColor : '#4A4A89'}
              onChange={(e) => set({ primaryColor: e.target.value.toUpperCase() })}
              className="h-9 w-12 cursor-pointer rounded-field border border-field"
              aria-label="Pick colour"
            />
            <Input
              value={form.primaryColor}
              maxLength={7}
              onChange={(e) => set({ primaryColor: e.target.value })}
            />
          </div>
        </Field>
        <label className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-[0.8125rem] font-semibold">
          Active
          <Switch
            label="Website active"
            checked={form.isActive}
            onCheckedChange={(v) => set({ isActive: v })}
          />
        </label>
        <ImageFieldPlain
          label="Logo URL"
          value={form.logoUrl}
          onChange={(v) => set({ logoUrl: v })}
          error={errors.logoUrl}
        />
        <ImageFieldPlain
          label="Favicon URL"
          value={form.faviconUrl}
          onChange={(v) => set({ faviconUrl: v })}
          error={errors.faviconUrl}
        />
      </div>
    </Modal>
  );
}

export default function SitesPage() {
  const qc = useQueryClient();
  const { reloadUser } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Site | null | 'new'>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [regen, setRegen] = useState<Site | null>(null);
  const [toDelete, setToDelete] = useState<Site | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const pageSize = 10;
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sites', page, search],
    queryFn: async () =>
      (await api.get<Paginated<Site>>('/sites', { params: { page, pageSize, search: search || undefined } }))
        .data,
    placeholderData: (p) => p,
  });
  const after = async () => {
    await qc.invalidateQueries({ queryKey: ['sites'] });
    await reloadUser();
  };
  const toggle = useMutation({
    mutationFn: async (s: Site) => (await api.patch<Site>(`/sites/${s.id}`, { isActive: !s.isActive })).data,
    onSuccess: async (s) => {
      toast.success(`${s.name} ${s.isActive ? 'activated' : 'deactivated'}.`);
      await after();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const regenerate = useMutation({
    mutationFn: async (s: Site) => (await api.post<{ apiKey: string }>(`/sites/${s.id}/regenerate-key`)).data,
    onSuccess: async (r) => {
      setRegen(null);
      setRevealKey(r.apiKey);
      await after();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (s: Site) => api.delete(`/sites/${s.id}`, { params: { confirm: confirmName } }),
    onSuccess: async () => {
      toast.success('Website deleted.');
      setToDelete(null);
      setConfirmName('');
      await after();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Websites"
        description="Every website (tenant) managed by this panel — add a new one with zero code changes"
        crumbs={[{ label: 'Websites' }]}
      />
      <Card>
        <CardHeader
          title="All Websites"
          description={data ? `${data.meta.total} website${data.meta.total === 1 ? '' : 's'}` : undefined}
          actions={
            <>
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setPage(1);
                }}
                placeholder="Name, slug or domain"
              />
              <Button size="sm" variant="violet" onClick={() => setEditing('new')}>
                <Plus className="h-4 w-4" /> Create website
              </Button>
            </>
          }
        />
        <CardBody>
          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
          ) : !data?.data.length ? (
            <EmptyState
              icon={<Globe />}
              title={search ? 'No websites match' : 'No websites yet'}
              action={
                !search && (
                  <Button onClick={() => setEditing('new')}>
                    <Plus className="h-4 w-4" /> Create website
                  </Button>
                )
              }
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Website</Th>
                  <Th className="hidden md:table-cell">Domain</Th>
                  <Th className="hidden lg:table-cell">API key</Th>
                  <Th className="hidden sm:table-cell">Content</Th>
                  <Th>Status</Th>
                  <Th className="hidden xl:table-cell">Created</Th>
                  <Th className="w-16 text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: s.primaryColor }}
                            aria-hidden
                          >
                            {s.name[0]}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-accent">{s.name}</p>
                          <p className="text-[11px] text-muted">
                            {s.slug} · {s.defaultLanguage.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="hidden text-muted md:table-cell">{s.domain ?? '—'}</Td>
                    <Td className="hidden lg:table-cell">
                      <code className="rounded bg-body px-1.5 py-0.5 text-[11px]">{s.apiKeyPrefix}_••••</code>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="indigo">{s._count?.pages ?? 0} pages</Badge>
                        <Badge tone="violet">{s._count?.leads ?? 0} leads</Badge>
                        <Badge tone="gray">{s._count?.users ?? 0} users</Badge>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={s.isActive ? 'green' : 'gray'} dot>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td className="hidden text-muted xl:table-cell">{fmtDate(s.createdAt)}</Td>
                    <Td className="text-right">
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions for ${s.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem icon={<Pencil />} onSelect={() => setEditing(s)}>
                            Edit
                          </MenuItem>
                          <MenuItem icon={<Power />} onSelect={() => toggle.mutate(s)}>
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </MenuItem>
                          <MenuItem icon={<KeyRound />} onSelect={() => setRegen(s)}>
                            Regenerate API key
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem icon={<Trash2 />} danger onSelect={() => setToDelete(s)}>
                            Delete
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
        {data && data.meta.total > 0 && (
          <CardFooter>
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              pageSize={pageSize}
              onPage={setPage}
              label="websites"
            />
          </CardFooter>
        )}
      </Card>
      <SiteModal
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        site={editing === 'new' ? null : editing}
        onCreated={setRevealKey}
      />
      <ApiKeyReveal apiKey={revealKey} onClose={() => setRevealKey(null)} />
      <ConfirmDialog
        open={!!regen}
        onOpenChange={(o) => !o && setRegen(null)}
        tone="primary"
        title={`Regenerate the API key for ${regen?.name}?`}
        description="The current key stops working immediately. Update the website's configuration with the new key."
        confirmLabel="Regenerate key"
        loading={regenerate.isPending}
        onConfirm={() => regen && regenerate.mutate(regen)}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => {
          if (!o) {
            setToDelete(null);
            setConfirmName('');
          }
        }}
        title={`Delete ${toDelete?.name}?`}
        description="All pages, sections, posts, forms, leads, media and settings of this website are permanently deleted. Users keep their accounts."
        confirmLabel="Delete website"
        loading={remove.isPending}
        confirmDisabled={confirmName !== toDelete?.name}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      >
        <Field
          label={
            <>
              Type <b>{toDelete?.name}</b> to confirm
            </>
          }
        >
          <Input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
        </Field>
      </ConfirmDialog>
    </>
  );
}
