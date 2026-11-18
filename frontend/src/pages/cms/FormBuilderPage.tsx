import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowLeft, ArrowUp, Code2, Plus, Save, Trash2 } from 'lucide-react';
import { api, errorMessage, errorStatus, fieldErrors } from '@/lib/api';
import type { FieldType, FormDef, FormField } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { P } from '@/lib/permissions';
import { useAuth } from '@/auth/AuthProvider';
import { useSiteMutation, useSiteQuery } from '@/hooks/useSiteQuery';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Checkbox, Switch } from '@/components/ui/controls';
import { ErrorState, Skeleton } from '@/components/ui/data';
import { Badge } from '@/components/ui/badge';
import { NotFoundInline } from '@/pages/ErrorPages';

const TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Single choice' },
  { value: 'checkbox', label: 'Checkbox(es)' },
];
const hasOptions = (t: FieldType) => t === 'select' || t === 'radio' || t === 'checkbox';

interface Draft {
  name: string;
  key: string;
  description: string;
  successMessage: string;
  notificationEmail: string;
  isActive: boolean;
  fields: FormField[];
}
const EMPTY: Draft = {
  name: '',
  key: '',
  description: '',
  successMessage: 'Thank you! We will get back to you shortly.',
  notificationEmail: '',
  isActive: true,
  fields: [
    { name: 'name', label: 'Full name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
  ],
};

function Preview({ draft }: { draft: Draft }) {
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()} aria-label="Form preview">
      <h3 className="text-base font-bold">{draft.name || 'Untitled form'}</h3>
      {draft.description && <p className="text-xs text-muted">{draft.description}</p>}
      {draft.fields.map((f) => {
        const label = (
          <span className="mb-1 block text-xs font-semibold">
            {f.label || f.name}
            {f.required && <span className="text-danger"> *</span>}
          </span>
        );
        if (f.type === 'textarea') return <label key={f.name} className="block">{label}<Textarea rows={3} placeholder={f.placeholder} /></label>;
        if (f.type === 'select') return <label key={f.name} className="block">{label}<Select defaultValue=""><option value="" disabled>{f.placeholder || 'Choose…'}</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</Select></label>;
        if (f.type === 'radio' || (f.type === 'checkbox' && f.options?.length))
          return (
            <fieldset key={f.name}>
              <legend>{label}</legend>
              <div className="flex flex-wrap gap-3">{(f.options ?? []).map((o) => <label key={o} className="flex items-center gap-1.5 text-xs"><input type={f.type} name={`pv-${f.name}`} /> {o}</label>)}</div>
            </fieldset>
          );
        if (f.type === 'checkbox') return <label key={f.name} className="flex items-center gap-2 text-xs"><input type="checkbox" /> {f.label}{f.required && <span className="text-danger">*</span>}</label>;
        return <label key={f.name} className="block">{label}<Input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} placeholder={f.placeholder} /></label>;
      })}
      <Button type="submit" variant="brand" className="rounded-full">Submit</Button>
    </form>
  );
}

export default function FormBuilderPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { can } = useAuth();
  const canWrite = can(P.CONTENT_WRITE);
  const formQ = useSiteQuery(['forms', 'detail', id], async () => (await api.get<FormDef>(`/forms/${id}`)).data, { enabled: !isNew, retry: false });
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [initial, setInitial] = useState<Draft>(EMPTY);
  const [keyTouched, setKeyTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [optionDrafts, setOptionDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (formQ.data) {
      const f = formQ.data;
      const d: Draft = { name: f.name, key: f.key, description: f.description, successMessage: f.successMessage, notificationEmail: f.notificationEmail ?? '', isActive: f.isActive, fields: f.fields };
      setDraft(d);
      setInitial(d);
    }
  }, [formQ.data]);
  useEffect(() => setOptionDrafts(Object.fromEntries(draft.fields.map((f, i) => [i, (f.options ?? []).join('\n')]))), [draft.fields.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const blocker = useUnsavedChanges(dirty);
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const setField = (i: number, p: Partial<FormField>) => setDraft((d) => ({ ...d, fields: d.fields.map((f, j) => (j === i ? { ...f, ...p } : f)) }));
  const move = (i: number, dir: -1 | 1) => setDraft((d) => {
    const fields = [...d.fields];
    [fields[i], fields[i + dir]] = [fields[i + dir]!, fields[i]!];
    return { ...d, fields };
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = 'Form name is required.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.key)) e.key = 'Use lower-case letters, numbers and dashes.';
    if (draft.notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.notificationEmail)) e.notificationEmail = 'Enter a valid email.';
    if (!draft.fields.length) e.fields = 'Add at least one field.';
    const seen = new Set<string>();
    draft.fields.forEach((f, i) => {
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(f.name)) e[`fields.${i}.name`] = 'Start with a letter; use a-z, 0-9 or _.';
      else if (seen.has(f.name)) e[`fields.${i}.name`] = 'Duplicate key.';
      seen.add(f.name);
      if (!f.label.trim()) e[`fields.${i}.label`] = 'Label is required.';
      if ((f.type === 'select' || f.type === 'radio') && !f.options?.length) e[`fields.${i}.options`] = 'Add at least one option.';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useSiteMutation(
    async () => {
      const body = {
        ...draft,
        notificationEmail: draft.notificationEmail || null,
        fields: draft.fields.map((f) => ({ ...f, options: hasOptions(f.type) && f.options?.length ? f.options : undefined, placeholder: f.placeholder || undefined, pattern: f.pattern || undefined })),
      };
      return isNew ? (await api.post<FormDef>('/forms', body)).data : (await api.patch<FormDef>(`/forms/${id}`, body)).data;
    },
    {
      success: isNew ? 'Form created.' : 'Form saved.',
      invalidate: [['forms']],
      onSuccess: (f) => {
        const d: Draft = { name: f.name, key: f.key, description: f.description, successMessage: f.successMessage, notificationEmail: f.notificationEmail ?? '', isActive: f.isActive, fields: f.fields };
        setDraft(d);
        setInitial(d);
        if (isNew) setTimeout(() => navigate(`/forms/${f.id}`, { replace: true }), 0);
      },
      onError: (err) => {
        const fe = fieldErrors(err);
        if (fe.length) { setErrors(Object.fromEntries(fe.map((x) => [x.field, x.message]))); toast.error('Please fix the highlighted fields.'); }
        else toast.error(errorMessage(err));
      },
    },
  );

  if (!isNew && formQ.isError && errorStatus(formQ.error) === 404) return <NotFoundInline />;
  if (!isNew && formQ.isError) return <Card><ErrorState message={errorMessage(formQ.error)} onRetry={() => formQ.refetch()} /></Card>;
  if (!isNew && !formQ.data) return <div className="space-y-4" role="status" aria-label="Loading"><Skeleton className="h-20 rounded-card" /><Skeleton className="h-96 rounded-card" /></div>;

  const snippet = `fetch('${window.location.origin}/api/public/forms/${draft.key || 'your-form'}/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': '<your site API key>' },
  body: JSON.stringify({ data: { ${draft.fields.map((f) => `${f.name}: '…'`).join(', ')} }, sourcePage: location.pathname })
});`;

  return (
    <div className="space-y-5">
      {blocker}
      <div className="card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Back to forms"><Link to="/forms"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-xl font-bold">{isNew ? 'New form' : draft.name || 'Form'}</h1>
            <p className="text-xs text-muted">{draft.fields.length} fields {dirty && <span className="font-medium text-warning">· Unsaved changes</span>}</p>
          </div>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={!dirty} onClick={() => { setDraft(initial); setErrors({}); }}>Discard</Button>
            <Button loading={save.isPending} disabled={!dirty && !isNew} onClick={() => validate() ? save.mutate(undefined) : toast.error('Please fix the highlighted fields.')}><Save className="h-4 w-4" /> Save form</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Settings" />
            <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Form name" required error={errors.name}>
                <Input value={draft.name} disabled={!canWrite} maxLength={100} onChange={(e) => set({ name: e.target.value, ...(keyTouched ? {} : { key: slugify(e.target.value) }) })} />
              </Field>
              <Field label="Form key" required error={errors.key} hint="Used in the public API URL. Unique per website.">
                <Input value={draft.key} disabled={!canWrite} maxLength={60} onChange={(e) => { setKeyTouched(true); set({ key: e.target.value }); }} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <Input value={draft.description} disabled={!canWrite} maxLength={500} onChange={(e) => set({ description: e.target.value })} />
              </Field>
              <Field label="Success message" error={errors.successMessage}>
                <Input value={draft.successMessage} disabled={!canWrite} maxLength={300} onChange={(e) => set({ successMessage: e.target.value })} />
              </Field>
              <Field label="Notification email" error={errors.notificationEmail} hint="Gets an email for every new lead.">
                <Input type="email" value={draft.notificationEmail} disabled={!canWrite} onChange={(e) => set({ notificationEmail: e.target.value })} placeholder="team@example.com" />
              </Field>
              <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3 md:col-span-2">
                <div><p className="text-[0.8125rem] font-semibold">Accepting submissions</p><p className="text-[11px] text-muted">Paused forms reject new submissions from the public API.</p></div>
                <Switch label="Accepting submissions" checked={draft.isActive} disabled={!canWrite} onCheckedChange={(v) => set({ isActive: v })} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fields" description="Order here is the order on the website" actions={canWrite && draft.fields.length < 40 && (
              <Button size="sm" variant="violet" onClick={() => set({ fields: [...draft.fields, { name: `field_${draft.fields.length + 1}`, label: 'New field', type: 'text', required: false }] })}><Plus className="h-4 w-4" /> Add field</Button>
            )} />
            <CardBody className="space-y-3">
              {errors.fields && <p role="alert" className="text-xs text-danger">{errors.fields}</p>}
              {draft.fields.map((f, i) => (
                <fieldset key={i} className="rounded-xl border border-line p-4">
                  <legend className="sr-only">Field {i + 1}: {f.label}</legend>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge tone="indigo">{i + 1}</Badge>
                    <span className="flex-1 truncate text-[0.8125rem] font-semibold">{f.label || 'Untitled field'}</span>
                    {canWrite && (
                      <>
                        <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.label} up`}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" disabled={i === draft.fields.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.label} down`}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="danger-ghost" disabled={draft.fields.length <= 1} onClick={() => set({ fields: draft.fields.filter((_, j) => j !== i) })} aria-label={`Remove ${f.label}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Label" error={errors[`fields.${i}.label`]}><Input value={f.label} disabled={!canWrite} maxLength={80} onChange={(e) => setField(i, { label: e.target.value })} /></Field>
                    <Field label="Key" error={errors[`fields.${i}.name`]}><Input value={f.name} disabled={!canWrite} maxLength={40} onChange={(e) => setField(i, { name: e.target.value })} /></Field>
                    <Field label="Type"><Select value={f.type} disabled={!canWrite} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
                    {f.type !== 'checkbox' && f.type !== 'radio' && <Field label="Placeholder"><Input value={f.placeholder ?? ''} disabled={!canWrite} maxLength={120} onChange={(e) => setField(i, { placeholder: e.target.value })} /></Field>}
                    {(f.type === 'text' || f.type === 'textarea') && (
                      <>
                        <Field label="Min length"><Input type="number" min={0} max={5000} value={f.minLength ?? ''} disabled={!canWrite} onChange={(e) => setField(i, { minLength: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                        <Field label="Max length" error={errors[`fields.${i}.minLength`]}><Input type="number" min={1} max={5000} value={f.maxLength ?? ''} disabled={!canWrite} onChange={(e) => setField(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                      </>
                    )}
                    {f.type === 'text' && <Field label="Pattern (regex)" error={errors[`fields.${i}.pattern`]} className="sm:col-span-3"><Input value={f.pattern ?? ''} disabled={!canWrite} maxLength={200} placeholder="optional, e.g. [A-Z]{3}[0-9]{4}" onChange={(e) => setField(i, { pattern: e.target.value })} /></Field>}
                    {hasOptions(f.type) && (
                      <Field label="Options (one per line)" className="sm:col-span-3" error={errors[`fields.${i}.options`]} hint={f.type === 'checkbox' ? 'Leave empty for a single consent checkbox.' : undefined}>
                        <Textarea rows={3} disabled={!canWrite} value={optionDrafts[i] ?? (f.options ?? []).join('\n')} onChange={(e) => {
                          setOptionDrafts((o) => ({ ...o, [i]: e.target.value }));
                          setField(i, { options: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) });
                        }} />
                      </Field>
                    )}
                  </div>
                  <label className="mt-3 flex w-fit items-center gap-2 text-xs font-medium">
                    <Checkbox checked={f.required} disabled={!canWrite} onCheckedChange={(v) => setField(i, { required: v })} label={`${f.label} required`} /> Required
                  </label>
                </fieldset>
              ))}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Live preview" />
            <CardBody><Preview draft={draft} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Use it on a website" description="Submissions create leads instantly" actions={<Code2 className="h-4 w-4 text-muted" aria-hidden />} />
            <CardBody>
              <pre className="scrollbar-thin overflow-x-auto rounded-lg bg-sidebar p-3 text-[10.5px] leading-relaxed text-[#C9D1F5]">{snippet}</pre>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => navigator.clipboard.writeText(snippet).then(() => toast.success('Snippet copied.'), () => toast.error('Copy failed.'))}>Copy snippet</Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
