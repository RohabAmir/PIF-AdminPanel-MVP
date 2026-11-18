import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios, { type AxiosResponse } from 'axios';
import { Play, Send, SquareCode } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { FormField } from '@/lib/types';
import { useSite } from '@/site/SiteProvider';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/data';

/** Public demo keys from the seed (documented in the README). Real sites paste their own key. */
const DEMO_KEYS: Record<string, string> = {
  'tuaja-demo': 'pif_tuajadem_PublicDemoKey-TuajaDemo-2026',
  'dan-demo': 'pif_dandemo1_PublicDemoKey-DanDemo-2026xx',
};
const ENDPOINTS = [
  { id: 'pages', label: 'GET /public/pages', path: () => '/pages' },
  { id: 'page', label: 'GET /public/pages/:slug', path: (p: string) => `/pages/${encodeURIComponent(p || 'home')}`, param: 'Page slug', def: 'home' },
  { id: 'blogs', label: 'GET /public/blogs', path: () => '/blogs' },
  { id: 'blog', label: 'GET /public/blogs/:slug', path: (p: string) => `/blogs/${encodeURIComponent(p)}`, param: 'Post slug', def: '' },
  { id: 'social', label: 'GET /public/social-links', path: () => '/social-links' },
  { id: 'seo', label: 'GET /public/seo/:pageSlug', path: (p: string) => `/seo/${encodeURIComponent(p || 'home')}`, param: 'Page slug', def: 'home' },
  { id: 'form', label: 'GET /public/forms/:key', path: (p: string) => `/forms/${encodeURIComponent(p || 'contact')}`, param: 'Form key', def: 'contact' },
] as const;

const pub = axios.create({ baseURL: '/api/public', timeout: 20_000, withCredentials: false });

export default function PlaygroundPage() {
  const { site } = useSite();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState(() => (site ? DEMO_KEYS[site.slug] ?? '' : ''));
  const [endpoint, setEndpoint] = useState<(typeof ENDPOINTS)[number]['id']>('pages');
  const ep = ENDPOINTS.find((e) => e.id === endpoint)!;
  const [param, setParam] = useState('');
  const [res, setRes] = useState<{ status: number; ms: number; body: unknown } | null>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState('contact');
  const [formDef, setFormDef] = useState<{ name: string; fields: FormField[]; successMessage: string } | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const keyOk = /^pif_[a-z0-9]{8}_[\w-]{20,}$/i.test(apiKey.trim());

  const call = async <T,>(fn: () => Promise<AxiosResponse<T>>): Promise<{ data: T | null; error: unknown }> => {
    const t = performance.now();
    try {
      const r = await fn();
      setRes({ status: r.status, ms: Math.round(performance.now() - t), body: r.data });
      return { data: r.data, error: null };
    } catch (e) {
      const body = axios.isAxiosError(e) ? (e.response?.data ?? { message: 'Network error' }) : { message: 'Unexpected error' };
      setRes({ status: axios.isAxiosError(e) ? (e.response?.status ?? 0) : 0, ms: Math.round(performance.now() - t), body });
      return { data: null, error: body };
    }
  };
  const send = async () => { setLoading(true); await call(() => pub.get(ep.path('param' in ep ? param || ep.def : ''), { headers: { 'X-API-Key': apiKey.trim() } })); setLoading(false); };
  const loadForm = async () => {
    setLoading(true);
    const { data: d } = await call(() => pub.get<{ name: string; fields: FormField[]; successMessage: string }>(`/forms/${encodeURIComponent(formKey)}`, { headers: { 'X-API-Key': apiKey.trim() } }));
    setFormDef(d);
    setValues({});
    setFormErrors({});
    setLoading(false);
  };
  const submit = async () => {
    setSubmitting(true);
    setFormErrors({});
    const { data: d, error } = await call(() => pub.post(`/forms/${encodeURIComponent(formKey)}/submit`, { data: values, sourcePage: '/api-playground' }, { headers: { 'X-API-Key': apiKey.trim() } }));
    setSubmitting(false);
    if (d) {
      toast.success('Submitted! A new lead was created.', { action: { label: 'View leads', onClick: () => navigate('/leads') } });
      setValues({});
      await qc.invalidateQueries({ queryKey: ['site'] });
      return;
    }
    const details = (error as { details?: { field: string; errors: string[] }[] } | null)?.details;
    if (Array.isArray(details)) setFormErrors(Object.fromEntries(details.map((x) => [x.field, x.errors[0] ?? ''])));
  };
  const curl = useMemo(() => `curl ${window.location.origin}/api/public${ep.path('param' in ep ? param || ep.def : '')} \\\n  -H "X-API-Key: ${apiKey || '<your key>'}"`, [apiKey, ep, param]);

  return (
    <>
      <PageHeader title="Public API Playground" description={`Call ${site?.name}'s read-only content API exactly as a real website would`} crumbs={[{ label: 'API Playground' }]} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Authentication" />
            <CardBody className="space-y-2">
              <Field label="X-API-Key" hint={DEMO_KEYS[site?.slug ?? ''] ? 'Pre-filled with the public demo key of this seeded website.' : 'Paste the key shown when the website was created (Super Admins can regenerate it under Websites).'} error={apiKey && !keyOk ? 'Keys look like pif_xxxxxxxx_…' : undefined}>
                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="font-mono text-xs" placeholder="pif_xxxxxxxx_…" />
              </Field>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Read content" />
            <CardBody className="space-y-3">
              <Field label="Endpoint"><Select value={endpoint} onChange={(e) => { setEndpoint(e.target.value as typeof endpoint); setParam(''); }}>{ENDPOINTS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</Select></Field>
              {'param' in ep && <Field label={ep.param}><Input value={param} placeholder={ep.def} onChange={(e) => setParam(e.target.value)} /></Field>}
              <pre className="overflow-x-auto rounded-lg bg-body px-3 py-2 text-[11px]">{curl}</pre>
              <Button loading={loading} disabled={!keyOk} onClick={send}><Play className="h-4 w-4" /> Send request</Button>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Submit a form → create a lead" description="Watch it appear on the Leads page and dashboard" />
            <CardBody className="space-y-3">
              <div className="flex gap-2">
                <Input aria-label="Form key" value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder="contact" />
                <Button variant="outline" disabled={!keyOk || !formKey} loading={loading && !formDef} onClick={loadForm}>Load form</Button>
              </div>
              {formDef && (
                <form className="space-y-3 rounded-xl border border-line p-4" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
                  <p className="font-semibold text-accent">{formDef.name}</p>
                  {formDef.fields.map((f) => {
                    const v = values[f.name];
                    const setV = (x: string | boolean | string[]) => setValues((s) => ({ ...s, [f.name]: x }));
                    if (f.type === 'checkbox' && !f.options?.length) return <Field key={f.name} error={formErrors[f.name]}><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v === true} onChange={(e) => setV(e.target.checked)} /> {f.label}{f.required && ' *'}</label></Field>;
                    if (f.type === 'checkbox' || f.type === 'radio') return (
                      <fieldset key={f.name}><legend className="mb-1 text-xs font-semibold">{f.label}{f.required && ' *'}</legend><div className="flex flex-wrap gap-3">{(f.options ?? []).map((o) => (
                        <label key={o} className="flex items-center gap-1.5 text-xs"><input type={f.type} name={`pg-${f.name}`} checked={f.type === 'radio' ? v === o : Array.isArray(v) && v.includes(o)} onChange={(e) => f.type === 'radio' ? setV(o) : setV(e.target.checked ? [...(Array.isArray(v) ? v : []), o] : (Array.isArray(v) ? v : []).filter((x) => x !== o))} /> {o}</label>
                      ))}</div>{formErrors[f.name] && <p className="mt-1 text-[11px] text-danger">{formErrors[f.name]}</p>}</fieldset>
                    );
                    return (
                      <Field key={f.name} label={f.label} required={f.required} error={formErrors[f.name]}>
                        {f.type === 'textarea' ? <Textarea rows={3} value={String(v ?? '')} placeholder={f.placeholder} onChange={(e) => setV(e.target.value)} />
                          : f.type === 'select' ? <Select value={String(v ?? '')} onChange={(e) => setV(e.target.value)}><option value="">Choose…</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</Select>
                          : <Input type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'} value={String(v ?? '')} placeholder={f.placeholder} onChange={(e) => setV(e.target.value)} />}
                      </Field>
                    );
                  })}
                  <Button type="submit" variant="brand" loading={submitting}><Send className="h-4 w-4" /> Submit</Button>
                </form>
              )}
            </CardBody>
          </Card>
        </div>
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader title="Response" actions={res && <><Badge tone={res.status >= 200 && res.status < 300 ? 'green' : 'red'}>{res.status || 'ERR'}</Badge><Badge tone="gray">{res.ms} ms</Badge></>} />
          <CardBody>
            {res ? <pre className="scrollbar-thin max-h-[640px] overflow-auto rounded-lg bg-sidebar p-4 text-[11px] leading-relaxed text-[#C9D1F5]">{JSON.stringify(res.body, null, 2)}</pre>
              : <EmptyState icon={<SquareCode />} title="No request yet" description={<>Send a request to see the JSON a website receives. Try <Link className="text-primary underline" to="/leads">Leads</Link> after submitting a form.</>} />}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
