import { GmailApiTransport } from './gmail-api.transport';
import { gmailFrom, MailService } from './mail.service';

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe('gmailFrom', () => {
  it('keeps the display name and uses the Gmail address', () => {
    expect(gmailFrom('"PIF Admin Panel" <no-reply@pifdemo.com>', 'me@gmail.com')).toBe(
      '"PIF Admin Panel" <me@gmail.com>',
    );
    expect(gmailFrom('Tuaja CMS <x@y.z>', 'me@gmail.com')).toBe('"Tuaja CMS" <me@gmail.com>');
    expect(gmailFrom('no-reply@pifdemo.com', 'me@gmail.com')).toBe(
      '"PIF Admin Panel" <me@gmail.com>',
    );
  });
});

describe('GmailApiTransport', () => {
  const creds = {
    user: 'me@gmail.com',
    clientId: 'id',
    clientSecret: 'secret',
    refreshToken: 'rt',
  };

  it('refreshes a token once, then posts the base64url MIME message', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(json(200, { access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, { id: 'm1' }))
      .mockResolvedValueOnce(json(200, { id: 'm2' }));
    const t = new GmailApiTransport(creds, fetchMock as unknown as typeof fetch);
    const opts = {
      from: 'me@gmail.com',
      to: 'new.user@gmail.com',
      subject: 'Welcome',
      html: '<b>Hi</b>',
    };
    expect(await t.sendMail(opts)).toEqual({ messageId: 'm1' });
    await t.sendMail(opts);

    expect(fetchMock).toHaveBeenCalledTimes(3); // token cached for the second send
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token');
    expect(String(tokenInit.body)).toContain('grant_type=refresh_token');
    const [sendUrl, sendInit] = fetchMock.mock.calls[1];
    expect(sendUrl).toMatch(/gmail\/v1\/users\/me\/messages\/send$/);
    expect(sendInit.headers.Authorization).toBe('Bearer tok');
    const mime = Buffer.from(JSON.parse(sendInit.body).raw, 'base64url').toString();
    expect(mime).toMatch(/^To: new\.user@gmail\.com$/m);
    expect(mime).toMatch(/^Subject: Welcome$/m);
  });

  it('surfaces OAuth and API errors', async () => {
    const badToken = jest.fn().mockResolvedValue(json(400, { error: 'invalid_grant' }));
    await expect(
      new GmailApiTransport(creds, badToken as unknown as typeof fetch).sendMail({ to: 'a@b.c' }),
    ).rejects.toThrow('invalid_grant');

    const badSend = jest
      .fn()
      .mockResolvedValueOnce(json(200, { access_token: 'tok' }))
      .mockResolvedValueOnce(json(403, { error: { message: 'Insufficient Permission' } }));
    await expect(
      new GmailApiTransport(creds, badSend as unknown as typeof fetch).sendMail({ to: 'a@b.c' }),
    ).rejects.toThrow('Insufficient Permission');
  });
});

describe('MailService logo', () => {
  it('embeds the logo as an inline attachment referenced by cid', async () => {
    const env: Record<string, unknown> = {
      MAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_USER: '',
      MAIL_FROM: 'PIF <a@b.c>',
      FRONTEND_URL: 'http://localhost:5173',
    };
    const svc = new MailService({ get: (k: string) => env[k] } as never);
    svc.onModuleInit();
    const sendMail = jest.fn().mockResolvedValue({});
    (svc as unknown as { transporter: unknown }).transporter = { sendMail, verify: jest.fn() };

    expect(await svc.send('x@y.z', 'Hi', 'otp', { code: '123456', minutes: 10 })).toBe(true);
    const opts = sendMail.mock.calls[0][0];
    expect(opts.html).toContain('src="cid:logo@pif-admin"');
    expect(opts.html).not.toContain('localhost');
    expect(opts.attachments[0]).toMatchObject({ cid: 'logo@pif-admin', contentType: 'image/png' });
    expect(opts.attachments[0].content.length).toBeGreaterThan(1000);
  });
});
