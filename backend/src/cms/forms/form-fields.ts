export const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

/** Validates and normalises a public submission against the form definition. */
export function validateSubmission(
  fields: FormField[],
  input: Record<string, unknown>,
): { values: Record<string, string | string[] | boolean>; errors: { field: string; errors: string[] }[] } {
  const values: Record<string, string | string[] | boolean> = {};
  const errors: { field: string; errors: string[] }[] = [];
  const fail = (f: FormField, msg: string) => errors.push({ field: f.name, errors: [msg] });

  for (const f of fields) {
    const raw = input[f.name];
    if (f.type === 'checkbox') {
      if (f.options?.length) {
        const arr = (Array.isArray(raw) ? raw : raw === undefined || raw === '' ? [] : [raw]).map(String);
        const invalid = arr.filter((v) => !f.options!.includes(v));
        if (invalid.length) fail(f, `${f.label} contains an invalid choice.`);
        else if (f.required && arr.length === 0) fail(f, `${f.label} is required.`);
        else values[f.name] = arr;
      } else {
        const checked = raw === true || raw === 'true' || raw === 'on' || raw === '1';
        if (f.required && !checked) fail(f, `${f.label} must be checked.`);
        else values[f.name] = checked;
      }
      continue;
    }
    const value = typeof raw === 'string' ? raw.trim() : raw === undefined || raw === null ? '' : String(raw).trim();
    if (!value) {
      if (f.required) fail(f, `${f.label} is required.`);
      else values[f.name] = '';
      continue;
    }
    const max = f.maxLength ?? (f.type === 'textarea' ? 5000 : 300);
    if (value.length > max) {
      fail(f, `${f.label} must be at most ${max} characters.`);
      continue;
    }
    if (f.minLength && value.length < f.minLength) {
      fail(f, `${f.label} must be at least ${f.minLength} characters.`);
      continue;
    }
    if (f.type === 'email' && !EMAIL.test(value)) {
      fail(f, `${f.label} must be a valid email address.`);
      continue;
    }
    if (f.type === 'phone' && !PHONE.test(value)) {
      fail(f, `${f.label} must be a valid phone number.`);
      continue;
    }
    if ((f.type === 'select' || f.type === 'radio') && !(f.options ?? []).includes(value)) {
      fail(f, `${f.label} contains an invalid choice.`);
      continue;
    }
    if (f.pattern) {
      try {
        if (!new RegExp(`^(?:${f.pattern})$`).test(value)) {
          fail(f, `${f.label} has an invalid format.`);
          continue;
        }
      } catch {
        /* invalid patterns are rejected when the form is saved */
      }
    }
    values[f.name] = value;
  }
  return { values, errors };
}

/** Picks the contact details used for search and display. */
export function extractContact(fields: FormField[], values: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const byType = (t: FieldType) => str(values[fields.find((f) => f.type === t)?.name ?? '']);
  const named = (...names: string[]) => names.map((n) => str(values[n])).find(Boolean);
  const first = named('first_name', 'firstname');
  const last = named('last_name', 'lastname');
  return {
    name: named('name', 'full_name', 'fullname') ?? ([first, last].filter(Boolean).join(' ') || undefined),
    email: byType('email'),
    phone: byType('phone'),
  };
}
