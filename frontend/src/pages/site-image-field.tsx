import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

/** URL-only image input with thumbnail (used outside a site context, e.g. creating a website). */
export function ImageFieldPlain({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <Field label={label} error={error} hint="https:// image URL">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-body">
          {value && !broken ? <img src={value} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} onLoad={() => setBroken(false)} /> : <ImageIcon className="h-4 w-4 text-muted" aria-hidden />}
        </span>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" aria-label={label} />
      </div>
    </Field>
  );
}
