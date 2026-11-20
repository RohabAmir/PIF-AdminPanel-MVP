import * as nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

export interface GmailApiCredentials {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const PROFILE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';

/**
 * Sends mail through the Gmail REST API (HTTPS, port 443) instead of SMTP — for hosts such
 * as free cloud tiers that block outbound SMTP ports. Nodemailer composes the MIME message;
 * an OAuth2 refresh token (scope gmail.send) is exchanged for short-lived access tokens.
 */
export class GmailApiTransport {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private readonly composer = nodemailer.createTransport({ streamTransport: true, buffer: true });

  constructor(
    private readonly creds: GmailApiCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt - 60_000) return this.accessToken;
    const res = await this.fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.creds.clientId,
        client_secret: this.creds.clientSecret,
        refresh_token: this.creds.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new Error(
        `Gmail OAuth token refresh failed: ${body.error_description ?? body.error ?? res.status}`,
      );
    }
    this.accessToken = body.access_token;
    this.expiresAt = Date.now() + (body.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }

  async sendMail(options: SendMailOptions): Promise<{ messageId: string }> {
    const composed = await this.composer.sendMail(options);
    const raw = Buffer.from(composed.message as Buffer).toString('base64url');
    const res = await this.fetchImpl(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`Gmail API send failed: ${body.error?.message ?? res.status}`);
    return { messageId: body.id ?? '' };
  }

  /** Confirms the credentials work and belong to the configured mailbox. */
  async verify(): Promise<true> {
    const res = await this.fetchImpl(PROFILE_URL, {
      headers: { Authorization: `Bearer ${await this.token()}` },
      signal: AbortSignal.timeout(10_000),
    });
    // gmail.send-only tokens may not read the profile; a 403 still proves the token is valid.
    if (res.status === 403) return true;
    if (!res.ok) throw new Error(`Gmail API verification failed: ${res.status}`);
    return true;
  }
}
