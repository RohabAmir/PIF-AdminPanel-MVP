import { useRef, useState } from 'react';
import { ImageIcon, ImagePlus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { MediaAsset, Paginated } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { EmptyState, SearchInput, Skeleton } from '@/components/ui/data';

export function MediaPicker({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (url: string, alt: string) => void }) {
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: config } = usePublicConfig();
  const { data, isLoading } = useSiteQuery(['media', 'picker', search], async () => (await api.get<Paginated<MediaAsset>>('/media', { params: { pageSize: 48, search: search || undefined } })).data, { enabled: open });
  const upload = useSiteMutation(
    async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return (await api.post<MediaAsset>('/media/upload', fd)).data;
    },
    { success: 'Image uploaded.', invalidate: [['media']], onSuccess: (a) => onPick(a.url, a.alt) },
  );
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Choose an image" description="Pick from the media library or upload a new image." size="xl">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search images" />
        {config?.uploadsEnabled && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                if (f.size > (config.maxUploadMb ?? 5) * 1024 * 1024) return void toast.error(`Images must be ${config.maxUploadMb} MB or smaller.`);
                upload.mutate(f);
              }}
            />
            <Button variant="violet" size="sm" loading={upload.isPending} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload new
            </Button>
          </>
        )}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-video" />)}</div>
      ) : !data?.data.length ? (
        <EmptyState icon={<ImageIcon />} title="No images yet" description="Upload an image or add one by URL in the Media Library." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.data.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onPick(m.url, m.alt)}
                className="group block w-full overflow-hidden rounded-lg border border-line text-left focus:ring-2 focus:ring-primary"
              >
                <img src={m.url} alt={m.alt || m.filename} loading="lazy" className="aspect-video w-full object-cover transition-transform group-hover:scale-105" />
                <span className="block truncate px-2 py-1 text-[11px] text-muted">{m.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** URL field with thumbnail preview and a media-library picker. Works without uploads (URL-only mode). */
export function ImageField({ label, value, onChange, disabled, error, hint }: { label: string; value: string; onChange: (url: string) => void; disabled?: boolean; error?: string; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const { data: config } = usePublicConfig();
  return (
    <Field label={label} error={error} hint={hint ?? (config && !config.uploadsEnabled ? 'Uploads are disabled in this environment — paste an image URL.' : undefined)}>
      <div>
      <div className="flex gap-3">
        <div className={cn('flex h-[70px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-body', !value && 'border-dashed')}>
          {value && !broken ? <img src={value} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} onLoad={() => setBroken(false)} /> : <ImageIcon className="h-6 w-6 text-muted" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <Input value={value} disabled={disabled} placeholder="https://… or choose from library" onChange={(e) => onChange(e.target.value)} aria-label={`${label} URL`} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
              <ImagePlus className="h-4 w-4" /> Library
            </Button>
            {value && (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onChange('')}>
                <X className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      <MediaPicker
        open={open}
        onOpenChange={setOpen}
        onPick={(url) => {
          onChange(url);
          setOpen(false);
        }}
      />
      </div>
    </Field>
  );
}

