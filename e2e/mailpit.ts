const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

interface Summary {
  ID: string;
  To: { Address: string }[];
  Subject: string;
  Created: string;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x3D;/g, '=')
    .replace(/&#x60;/g, '`');

/** Polls the Mailpit API for the newest email to `to` matching `subject`, sent after `since`. */
export async function waitForEmail(to: string, subject: RegExp, since: Date): Promise<{ subject: string; html: string }> {
  for (let i = 0; i < 60; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: Summary[] };
    const hit = list.messages.find(
      (m) => m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase()) && subject.test(m.Subject) && new Date(m.Created).getTime() >= since.getTime() - 1000,
    );
    if (hit) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { HTML: string; Subject: string };
      return { subject: full.Subject, html: full.HTML };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email "${subject}" for ${to}`);
}

export const otpFrom = (subject: string) => subject.match(/\b(\d{6})\b/)![1]!;

export function tempPasswordFrom(html: string): string {
  const m = html.match(/Temporary password:<\/b>\s*<code[^>]*>([^<]+)<\/code>/);
  if (!m) throw new Error('Temporary password not found in welcome email');
  return decode(m[1]!.trim());
}
