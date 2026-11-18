import { useRef, useState, type DragEvent } from 'react';
import { Copy, ImageIcon, Link2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import type { MediaAsset, Paginated } from '@/lib/types';
import { cn, fmtDate, formatBytes } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSite } from '@/site/SiteProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, SearchInput, Skeleton } from '@/components/ui/data';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog, Modal } from '@/components/ui/dialog';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function MediaPage() {
  const { site } = useSite();
  const { can } = useAuth();
  const { data: config } = usePublicConfig();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [byUrl, setByUrl] = useState(false);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [toDelete, setToDelete] = useState<MediaAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 24;
  const params = { page, pageSize, search: search || undefined };
  const { data, isLoading, isError, error, refetch } = useSiteQuery(['media', params], async () => (await api.get<Paginated<MediaAsset>>('/media', { params })).data, { placeholderData: (p) => p });
  const inv = [['media']];
  const upload = useSiteMutation(async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return (await api.post<MediaAsset>('/media/upload', fd)).data;
  }, { success: (m) => `Uploaded ${m.filename}.`, invalidate: inv });
  const addUrl = useSiteMutation(async () => (await api.post<MediaAsset>('/media/external', { url: url.trim(), alt: alt.trim() || undefined })).data, { success: 'Image added.', invalidate: inv, onSuccess: () => { setByUrl(false); setUrl(''); setAlt(''); } });
  const updateAlt = useSiteMutation(async (m: MediaAsset) => (await api.patch<MediaAsset>(`/media/${m.id}`, { alt: m.alt })).data, { success: 'Alt text saved.', invalidate: inv, onSuccess: (m) => setSelected(m) });
  const remove = useSiteMutation(async (id: string) => api.delete(`/media/${id}`), { success: 'Image deleted.', invalidate: inv, onSuccess: () => { setToDelete(null); setSelected(null); } });

  const maxMb = config?.maxUploadMb ?? 5;
  const handleFiles = (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type)) { toast.error(`${f.name}: only JPEG, PNG, WebP and GIF images are allowed.`); continue; }
      if (f.size > maxMb * 1024 * 1024) { toast.error(`${f.name}: images must be ${maxMb} MB or smaller.`); continue; }
      upload.mutate(f);
    }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (can(P.CONTENT_WRITE) && config?.uploadsEnabled) handleFiles(e.dataTransfer.files); };
  const copy = (m: MediaAsset) => {
    const abs = m.url.startsWith('/') ? `${window.location.origin}${m.url}` : m.url;
    navigator.clipboard.writeText(abs).then(() => toast.success('Image URL copied.'), () => toast.error('Could not copy to clipboard.'));
  };
  const urlValid = /^https:\/\/\S+$/.test(url.trim());

  return (
    <>
      <PageHeader title="Media Library" description={`Images used across ${site?.name}'s pages, blogs and SEO`} crumbs={[{ label: 'Media Library' }]} />
      <Card onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} className={cn(dragging && 'ring-2 ring-primary')}>
        <CardHeader
          title={`${site?.name} Media`}
          description={data ? `${data.meta.total} image${data.meta.total === 1 ? '' : 's'}` : undefined}
          actions={
            <>
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search file name or alt" />
              {can(P.CONTENT_WRITE) && <Button size="sm" variant="outline" onClick={() => setByUrl(true)}><Link2 className="h-4 w-4" /> Add by URL</Button>}
              {can(P.CONTENT_WRITE) && config?.uploadsEnabled && (
                <>
                  <input ref={fileRef} type="file" accept={ACCEPT.join(',')} multiple className="hidden" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} data-testid="media-file" />
                  <Button size="sm" variant="violet" loading={upload.isPending} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
                </>
              )}
            </>
          }
        />
        {config && !config.uploadsEnabled && (
          <p className="border-x border-accent-border bg-warning/10 px-5 py-2 text-xs text-[#8a6100]">File uploads are disabled in this environment (no storage configured). Add images by URL instead.</p>
        )}
        <CardBody>
          {can(P.CONTENT_WRITE) && config?.uploadsEnabled && (
            <button type="button" onClick={() => fileRef.current?.click()} className={cn('mb-5 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent-border px-4 py-6 text-center transition-colors hover:border-primary hover:bg-primary/5', dragging && 'border-primary bg-primary/5')}>
              <Upload className="mb-2 h-6 w-6 text-primary" aria-hidden />
              <span className="text-[0.8125rem] font-semibold text-accent">Drop images here or click to upload</span>
              <span className="text-[11px] text-muted">JPEG, PNG, WebP or GIF · up to {maxMb} MB each</span>
            </button>
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
          ) : isError ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : !data?.data.length ? (
            <EmptyState icon={<ImageIcon />} title={search ? 'No images match your search' : 'No images yet'} description="Uploaded and linked images appear here." />
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {data.data.map((m) => (
                <li key={m.id} className="group overflow-hidden rounded-xl border border-line bg-white">
                  <button type="button" className="block w-full" onClick={() => setSelected(m)} aria-label={`Details for ${m.filename}`}>
                    <img src={m.url} alt={m.alt || m.filename} loading="lazy" className="aspect-square w-full bg-body object-cover transition-transform group-hover:scale-105" />
                  </button>
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-[11px] text-muted" title={m.filename}>{m.filename}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(m)} aria-label={`Copy URL of ${m.filename}`}><Copy className="h-3.5 w-3.5" /></Button>
                    {can(P.CONTENT_DELETE) && <Button size="icon" variant="danger-ghost" className="h-7 w-7" onClick={() => setToDelete(m)} aria-label={`Delete ${m.filename}`}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
        {data && data.meta.total > pageSize && <CardFooter><Pagination page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={pageSize} onPage={setPage} label="images" /></CardFooter>}
      </Card>

      <Modal open={byUrl} onOpenChange={setByUrl} title="Add image by URL" description="Link an image hosted elsewhere (https only)." footer={<><Button variant="outline" onClick={() => setByUrl(false)}>Cancel</Button><Button loading={addUrl.isPending} disabled={!urlValid} onClick={() => addUrl.mutate(undefined)}>Add image</Button></>}>
        <div className="space-y-4">
          <Field label="Image URL" required error={url && !urlValid ? 'Enter a full https:// URL.' : undefined}><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://images.example.com/photo.jpg" autoFocus /></Field>
          <Field label="Alt text" hint="Describe the image for screen readers and SEO."><Input value={alt} maxLength={160} onChange={(e) => setAlt(e.target.value)} /></Field>
          {urlValid && <img src={url} alt="Preview" className="max-h-48 rounded-lg" />}
        </div>
      </Modal>

      <Modal open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={selected?.filename ?? 'Image'} size="lg">
        {selected && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <img src={selected.url} alt={selected.alt || selected.filename} className="w-full rounded-lg bg-body object-contain" />
            <div className="space-y-3 text-[0.8125rem]">
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-2"><dt className="text-muted">Storage</dt><dd><Badge tone="indigo">{selected.storage}</Badge></dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Size</dt><dd>{formatBytes(selected.size)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted">Added</dt><dd>{fmtDate(selected.createdAt)}{selected.uploadedBy ? ` by ${selected.uploadedBy.name}` : ''}</dd></div>
              </dl>
              <Field label="Alt text"><Input value={selected.alt} disabled={!can(P.CONTENT_WRITE)} maxLength={160} onChange={(e) => setSelected({ ...selected, alt: e.target.value })} /></Field>
              <div className="flex flex-wrap gap-2">
                {can(P.CONTENT_WRITE) && <Button size="sm" loading={updateAlt.isPending} onClick={() => updateAlt.mutate(selected)}>Save alt text</Button>}
                <Button size="sm" variant="outline" onClick={() => copy(selected)}><Copy className="h-4 w-4" /> Copy URL</Button>
                {can(P.CONTENT_DELETE) && <Button size="sm" variant="danger-ghost" onClick={() => setToDelete(selected)}><Trash2 className="h-4 w-4" /> Delete</Button>}
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete ${toDelete?.filename}?`} description="Pages or posts still pointing to this image will show a broken image." confirmLabel="Delete image" loading={remove.isPending} onConfirm={() => toDelete && remove.mutate(toDelete.id)} />
    </>
  );
}
