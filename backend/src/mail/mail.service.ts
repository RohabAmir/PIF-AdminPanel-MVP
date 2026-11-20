import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfig } from '../config/app-config.service';
import { GmailApiTransport } from './gmail-api.transport';

const LOGO_FILE = 'email-logo.png';
const LOGO_CID = 'logo@pif-admin';

type TemplateName = 'otp' | 'welcome' | 'reset-password' | 'lead-notification';

/** The subset of a Nodemailer transport the service uses — also met by the Gmail API transport. */
interface MailTransport {
  sendMail(options: nodemailer.SendMailOptions): Promise<unknown>;
  verify(): Promise<true>;
}

/** `"Name" <addr>` from MAIL_FROM's display name and the Gmail address (Gmail rewrites other senders). */
export function gmailFrom(mailFrom: string, gmailUser: string): string {
  const name = /^\s*"?([^"<]+?)"?\s*</.exec(mailFrom)?.[1]?.trim() || 'PIF Admin Panel';
  return `"${name.replace(/"/g, '')}" <${gmailUser}>`;
}

/** Sends branded transactional emails. Returns `false` (never throws) when delivery fails. */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: MailTransport | null = null;
  private from = '';
  private layout!: Handlebars.TemplateDelegate;
  private logo: Buffer | null = null;
  private readonly templates = new Map<TemplateName, Handlebars.TemplateDelegate>();

  constructor(private readonly config: AppConfig) {}

  onModuleInit(): void {
    const dir = join(__dirname, 'templates');
    this.layout = Handlebars.compile(readFileSync(join(dir, 'layout.hbs'), 'utf8'));
    try {
      this.logo = readFileSync(join(dir, LOGO_FILE));
    } catch {
      this.logger.warn(`${LOGO_FILE} not found — emails will link the logo from FRONTEND_URL.`);
    }
    for (const name of ['otp', 'welcome', 'reset-password', 'lead-notification'] as const) {
      this.templates.set(name, Handlebars.compile(readFileSync(join(dir, `${name}.hbs`), 'utf8')));
    }
    this.transporter = this.createTransport();
    if (this.transporter) {
      this.logger.log(`Email delivery via ${this.provider}`);
      // Non-blocking connectivity check so a misconfigured or blocked mail server shows up in the logs at boot.
      if (process.env.NODE_ENV !== 'test') {
        this.transporter
          .verify()
          .catch((err: Error) =>
            this.logger.error(
              `Email provider check failed: ${err.message}.` +
                (this.config.get('MAIL_PROVIDER') === 'gmail-api'
                  ? ''
                  : ' If the host blocks SMTP ports (Render free plan does), use MAIL_PROVIDER=gmail-api.'),
            ),
          );
      }
    } else this.logger.warn('SMTP_HOST is not set — emails will not be delivered.');
  }

  get provider(): string {
    const p = this.config.get('MAIL_PROVIDER');
    return p === 'smtp'
      ? `SMTP ${this.config.get('SMTP_HOST')}`
      : `${p} (${this.config.get('GMAIL_USER')})`;
  }

  private createTransport(): MailTransport | null {
    const provider = this.config.get('MAIL_PROVIDER');
    const mailFrom = this.config.get('MAIL_FROM');
    const timeouts = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000 };
    if (provider === 'gmail') {
      const user = this.config.get('GMAIL_USER');
      this.from = gmailFrom(mailFrom, user);
      return nodemailer.createTransport({
        service: 'gmail', // smtp.gmail.com:465, TLS
        auth: { user, pass: this.config.get('GMAIL_APP_PASSWORD').replace(/\s+/g, '') },
        ...timeouts,
      }) as Transporter as MailTransport;
    }
    if (provider === 'gmail-api') {
      const user = this.config.get('GMAIL_USER');
      this.from = gmailFrom(mailFrom, user);
      return new GmailApiTransport({
        user,
        clientId: this.config.get('GMAIL_CLIENT_ID'),
        clientSecret: this.config.get('GMAIL_CLIENT_SECRET'),
        refreshToken: this.config.get('GMAIL_REFRESH_TOKEN'),
      });
    }
    const host = this.config.get('SMTP_HOST');
    if (!host) return null;
    this.from = mailFrom;
    const user = this.config.get('SMTP_USER');
    return nodemailer.createTransport({
      host,
      port: this.config.get('SMTP_PORT'),
      secure: this.config.get('SMTP_SECURE'),
      auth: user ? { user, pass: this.config.get('SMTP_PASS') } : undefined,
      ...timeouts,
    }) as Transporter as MailTransport;
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  /** Checks the connection/credentials without sending anything. */
  async verify(): Promise<void> {
    if (!this.transporter) throw new Error('Email delivery is not configured.');
    await this.transporter.verify();
  }

  render(template: TemplateName, subject: string, data: Record<string, unknown>): string {
    const body = this.templates.get(template)!(data);
    return this.layout({
      subject,
      body,
      year: new Date().getFullYear(),
      // Embedded as an inline attachment so it shows even when FRONTEND_URL is not public (localhost).
      logoUrl: this.logo
        ? `cid:${LOGO_CID}`
        : `${this.config.get('FRONTEND_URL')}/brand/email-logo.png`,
    });
  }

  async send(
    to: string,
    subject: string,
    template: TemplateName,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html: this.render(template, subject, data),
        attachments: this.logo
          ? [
              {
                filename: LOGO_FILE,
                content: this.logo,
                contentType: 'image/png',
                cid: LOGO_CID,
                contentDisposition: 'inline',
              },
            ]
          : undefined,
      });
      this.logger.log({ template, to: to.replace(/(.{2}).*@/, '$1***@') }, 'Email sent');
      return true;
    } catch (err) {
      this.logger.error({ template, err: (err as Error).message }, 'Email delivery failed');
      return false;
    }
  }
}
