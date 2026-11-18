import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './field';
import { Input } from './input';
import { Button } from './button';
import { Pagination } from './data';
import { PasswordChecklist, PasswordInput } from '@/components/PasswordInput';
import { SearchPreview, seoHints } from '@/components/cms/SeoEditor';

describe('Field', () => {
  it('wires label, error and aria attributes', () => {
    render(
      <Field label="Email" error="Enter a valid email address.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(input.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
  });
});

describe('Button', () => {
  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('shows the range and pages', async () => {
    const onPage = vi.fn();
    const { container } = render(
      <Pagination page={2} totalPages={3} total={25} pageSize={10} onPage={onPage} />,
    );
    expect(container.querySelector('p')?.textContent).toMatch(/Showing 11–20 of 25 entries/);
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
});

describe('PasswordInput', () => {
  it('toggles visibility', async () => {
    render(<PasswordInput aria-label="Password" defaultValue="secret" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
  it('lists unmet requirements', () => {
    render(<PasswordChecklist value="abc" />);
    expect(screen.getByText('At least 8 characters')).toHaveTextContent('(not met)');
    expect(screen.getByText('One lower-case letter')).toHaveTextContent('(met)');
  });
});

describe('SEO helpers', () => {
  it('previews like a search result and gives length hints', () => {
    render(<SearchPreview title="Home | Tuaja" description="A description" url="https://example.com" />);
    expect(screen.getByText('Home | Tuaja')).toBeInTheDocument();
    expect(seoHints('', '').every((h) => !h.ok)).toBe(true);
    expect(seoHints('A meta title that is comfortably long', 'x'.repeat(100)).every((h) => h.ok)).toBe(true);
  });
});
