import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { FormDef, SectionType } from '@/lib/types';
import { api } from '@/lib/api';
import { useSiteQuery } from '@/hooks/useSiteQuery';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ImageField } from './ImageField';
import { RichTextEditor } from './RichTextEditor';
import { BLOCKS, type FieldDef } from './section-config';

type Obj = Record<string, unknown>;

/** Picks one of the active website's forms by key. */
function FormPicker({
  value,
  onChange,
  disabled,
  label,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  label: string;
  error?: string;
}) {
  const forms = useSiteQuery(['forms'], async () => (await api.get<FormDef[]>('/forms')).data);
  const known = forms.data?.some((f) => f.key === value);
  return (
    <Field label={label} required error={error} hint="Submissions are stored in Leads for this website.">
      <Select value={value} disabled={disabled || forms.isLoading} onChange={(e) => onChange(e.target.value)}>
        {!value && <option value="">Choose a form…</option>}
        {value && !known && <option value={value}>{forms.isLoading ? value : `${value} (not found)`}</option>}
        {forms.data?.map((f) => (
          <option key={f.id} value={f.key}>
            {f.name} ({f.key}){f.isActive ? '' : ' — inactive'}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function FieldInput({
  def,
  value,
  onChange,
  error,
  disabled,
}: {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  disabled?: boolean;
}) {
  const s = typeof value === 'string' ? value : '';
  switch (def.kind) {
    case 'text':
    case 'url':
      return (
        <Field
          label={def.label}
          required={def.required}
          error={error}
          hint={def.hint}
          counter={def.kind === 'text' && def.max ? { value: s.length, max: def.max } : undefined}
        >
          <Input
            value={s}
            disabled={disabled}
            maxLength={def.kind === 'text' ? def.max : 1000}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case 'textarea':
      return (
        <Field
          label={def.label}
          required={def.required}
          error={error}
          counter={def.max ? { value: s.length, max: def.max } : undefined}
        >
          <Textarea
            value={s}
            disabled={disabled}
            rows={3}
            maxLength={def.max}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );
    case 'image':
      return <ImageField label={def.label} value={s} onChange={onChange} disabled={disabled} error={error} />;
    case 'color':
      return (
        <Field label={def.label} error={error} hint={def.hint}>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${def.label} picker`}
              className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-line bg-white p-1 disabled:cursor-not-allowed"
              value={/^#[0-9a-fA-F]{6}$/.test(s) ? s : '#000000'}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
            <Input
              value={s}
              disabled={disabled}
              maxLength={7}
              placeholder="#67B93F"
              onChange={(e) => onChange(e.target.value.trim())}
            />
          </div>
        </Field>
      );
    case 'form':
      return <FormPicker label={def.label} value={s} onChange={onChange} disabled={disabled} error={error} />;
    case 'richtext':
      return (
        <Field label={def.label} error={error}>
          <div>
            <RichTextEditor value={s} onChange={onChange} disabled={disabled} label={def.label} />
          </div>
        </Field>
      );
    case 'select':
      return (
        <Field label={def.label} error={error}>
          <Select
            value={typeof value === 'number' ? String(value) : s}
            disabled={disabled}
            onChange={(e) => onChange(def.numeric ? Number(e.target.value) : e.target.value)}
          >
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      );
    case 'list': {
      const items = Array.isArray(value) ? (value as Obj[]) : [];
      const update = (next: Obj[]) => onChange(next);
      return (
        <fieldset className="rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-semibold text-ink/80">
            {def.label}{' '}
            <span className="font-normal text-muted">
              ({items.length}/{def.max})
            </span>
          </legend>
          {error && (
            <p role="alert" className="mb-2 text-[11px] font-medium text-danger-ink">
              {error}
            </p>
          )}
          <ol className="space-y-3">
            {items.map((item, i) => (
              <li key={i} className="rounded-lg bg-body/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {def.itemLabel} {i + 1}
                  </span>
                  {!disabled && (
                    <div className="flex gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={i === 0}
                        aria-label={`Move ${def.itemLabel} ${i + 1} up`}
                        onClick={() =>
                          update(items.map((x, j) => (j === i - 1 ? items[i]! : j === i ? items[i - 1]! : x)))
                        }
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={i === items.length - 1}
                        aria-label={`Move ${def.itemLabel} ${i + 1} down`}
                        onClick={() =>
                          update(items.map((x, j) => (j === i + 1 ? items[i]! : j === i ? items[i + 1]! : x)))
                        }
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="danger-ghost"
                        disabled={items.length <= def.min}
                        aria-label={`Remove ${def.itemLabel} ${i + 1}`}
                        onClick={() => update(items.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {def.itemFields.map((f) => (
                    <FieldInput
                      key={f.key}
                      def={f}
                      value={item[f.key]}
                      disabled={disabled}
                      error={undefined}
                      onChange={(v) => update(items.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {!disabled && items.length < def.max && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => update([...items, { ...def.newItem }])}
            >
              <Plus className="h-4 w-4" /> Add {def.itemLabel.toLowerCase()}
            </Button>
          )}
        </fieldset>
      );
    }
  }
}

/** Typed editor for a section's JSON content, generated from the block schema. */
export function SectionEditor({
  type,
  content,
  onChange,
  errors,
  disabled,
}: {
  type: SectionType;
  content: Obj;
  onChange: (c: Obj) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {BLOCKS[type].fields.map((f) => {
        const nested = Object.entries(errors).find(([k]) => k.startsWith(`${f.key}.`));
        return (
          <FieldInput
            key={f.key}
            def={f}
            value={content[f.key]}
            disabled={disabled}
            error={
              errors[f.key] ??
              (nested ? `${nested[1]} (item ${Number(nested[0].split('.')[1]) + 1})` : undefined)
            }
            onChange={(v) => onChange({ ...content, [f.key]: v })}
          />
        );
      })}
    </div>
  );
}
