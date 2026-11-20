/**
 * One-time helper for MAIL_PROVIDER=gmail-api: signs in to Google in the browser and prints the
 * GMAIL_REFRESH_TOKEN. Needed on hosts that block SMTP ports (e.g. Render's free plan).
 *
 *   npm run gmail:auth -- <oauth-client-id> <oauth-client-secret>
 *
 * The OAuth client must be of type "Desktop app" (loopback redirects need no extra configuration).
 */
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { GmailApiTransport } from '../src/mail/gmail-api.transport';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';

async function main() {
  const [clientId, clientSecret] = process.argv.slice(2);
  if (!clientId || !clientSecret) {
    console.error('Usage: npm run gmail:auth -- <oauth-client-id> <oauth-client-secret>');
    process.exit(2);
  }
  const state = randomBytes(16).toString('hex');

  const code = await new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const error = url.searchParams.get('error');
      const got = url.searchParams.get('code');
      if (!got && !error) return void res.writeHead(404).end();
      const ok = !!got && url.searchParams.get('state') === state;
      res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html' });
      res.end(
        ok
          ? '<h2>Done — you can close this tab and return to the terminal.</h2>'
          : `<h2>Sign-in failed: ${error ?? 'state mismatch'}</h2>`,
      );
      server.close();
      if (ok) resolve({ code: got, redirectUri });
      else reject(new Error(`Google sign-in failed: ${error ?? 'state mismatch'}`));
    });
    let redirectUri = '';
    server.listen(0, '127.0.0.1', () => {
      redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      auth.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPE,
        access_type: 'offline',
        prompt: 'consent', // always return a refresh token
        state,
      }).toString();
      console.log('\nOpen this link, sign in with the Gmail account that sends the emails:\n');
      console.log(auth.toString(), '\n');
      const opener =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start ""'
            : 'xdg-open';
      exec(`${opener} "${auth.toString()}"`, () => undefined);
    });
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: code.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const body = (await res.json()) as {
    refresh_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !body.refresh_token) {
    throw new Error(body.error_description ?? body.error ?? 'No refresh token returned');
  }

  // Prove the token works before handing it over.
  await new GmailApiTransport({
    user: 'me',
    clientId,
    clientSecret,
    refreshToken: body.refresh_token,
  }).verify();

  console.log(
    '✔ Gmail API access verified. Set these on the server (e.g. Render → Environment):\n',
  );
  console.log('MAIL_PROVIDER=gmail-api');
  console.log(`GMAIL_CLIENT_ID=${clientId}`);
  console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
  console.log(`GMAIL_REFRESH_TOKEN=${body.refresh_token}`);
  console.log('GMAIL_USER=<the Gmail address you signed in with>\n');
}

main().catch((err: Error) => {
  console.error(`✖ ${err.message}`);
  process.exit(1);
});
