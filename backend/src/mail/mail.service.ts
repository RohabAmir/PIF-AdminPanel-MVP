import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfig } from '../config/app-config.service';

type TemplateName = 'otp' | 'welcome' | 'reset-password' | 'lead-notification';

/** Sends branded transactional emails. Returns `false` (never throws) when delivery fails. */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private layout!: Handlebars.TemplateDelegate;
  private readonly templates = new Map<TemplateName, Handlebars.TemplateDelegate>();

  constructor(private readonly config: AppConfig) {}

  onModuleInit(): void {
    const dir = join(__dirname, 'templates');
    this.layout = Handlebars.compile(readFileSync(join(dir, 'layout.hbs'), 'utf8'));
    for (const name of ['otp', 'welcome', 'reset-password', 'lead-notification'] as const) {
      this.templates.set(name, Handlebars.compile(readFileSync(join(dir, `${name}.hbs`), 'utf8')));
    }
    const host = this.config.get('SMTP_HOST');
    if (host) {
      const user = this.config.get('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get('SMTP_PORT'),
        secure: this.config.get('SMTP_SECURE'),
        auth: user ? { user, pass: this.config.get('SMTP_PASS') } : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
      });
    } else {
      this.logger.warn('SMTP_HOST is not set — emails will not be delivered.');
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  render(template: TemplateName, subject: string, data: Record<string, unknown>): string {
    const body = this.templates.get(template)!(data);
    return this.layout({
      subject,
      body,
      year: new Date().getFullYear(),
      logoUrl: `${this.config.get('FRONTEND_URL')}/brand/email-logo.png`,
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
        from: this.config.get('MAIL_FROM'),
        to,
        subject,
        html: this.render(template, subject, data),
      });
      this.logger.log({ template, to: to.replace(/(.{2}).*@/, '$1***@') }, 'Email sent');
      return true;
    } catch (err) {
      this.logger.error({ template, err: (err as Error).message }, 'Email delivery failed');
      return false;
    }
  }
}
