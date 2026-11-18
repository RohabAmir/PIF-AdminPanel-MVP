/**
 * Minimal Mailpit-compatible mail catcher used when Docker is unavailable.
 * Implements the subset of the Mailpit HTTP API the project uses:
 *   GET    /api/v1/messages          -> { total, messages: [{ ID, From, To, Subject, Created, Snippet }] }
 *   GET    /api/v1/message/:id       -> { ID, From, To, Subject, Date, HTML, Text }
 *   DELETE /api/v1/messages          -> clears inbox
 *   GET    /                         -> inbox UI
 */
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function startMailCatcher({ smtpPort = 1025, httpPort = 8025 } = {}) {
  const messages = [];
  const addr = (a) => (a?.value ?? []).map((v) => ({ Name: v.name ?? '', Address: v.address ?? '' }));

  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onAuth: (_auth, _session, cb) => cb(null, { user: 'any' }),
    onData(stream, _session, cb) {
      simpleParser(stream)
        .then((m) => {
          messages.unshift({
            ID: randomUUID(),
            From: addr(m.from)[0] ?? { Name: '', Address: '' },
            To: addr(m.to),
            Subject: m.subject ?? '',
            Created: (m.date ?? new Date()).toISOString(),
            HTML: typeof m.html === 'string' ? m.html : '',
            Text: m.text ?? '',
          });
          if (messages.length > 500) messages.pop();
          cb();
        })
        .catch(cb);
    },
  });
  await new Promise((res) => smtp.listen(smtpPort, '127.0.0.1', res));

  const http = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/api/v1/messages' && req.method === 'GET') {
      return json(200, {
        total: messages.length,
        messages: messages.map(({ HTML, Text, ...rest }) => ({ ...rest, Snippet: Text.slice(0, 140) })),
      });
    }
    if (url.pathname === '/api/v1/messages' && req.method === 'DELETE') {
      messages.length = 0;
      return json(200, { ok: true });
    }
    const m = url.pathname.match(/^\/api\/v1\/message\/([\w-]+)$/);
    if (m) {
      const msg = messages.find((x) => x.ID === m[1]);
      return msg ? json(200, { ...msg, Date: msg.Created }) : json(404, { error: 'not found' });
    }
    const view = url.pathname.match(/^\/view\/([\w-]+)$/);
    if (view) {
      const msg = messages.find((x) => x.ID === view[1]);
      res.writeHead(msg ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(msg ? msg.HTML || `<pre>${esc(msg.Text)}</pre>` : 'Not found');
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Local Inbox</title>
<meta http-equiv="refresh" content="10">
<style>body{font-family:Inter,system-ui,sans-serif;margin:0;background:#f0f1f7;color:#333335}
header{background:#1e1e2d;color:#fff;padding:14px 24px;font-weight:600}
main{display:grid;grid-template-columns:380px 1fr;height:calc(100vh - 48px)}
ul{list-style:none;margin:0;padding:0;overflow:auto;border-right:1px solid #e5e7eb;background:#fff}
li a{display:block;padding:12px 16px;border-bottom:1px solid #f3f3f3;color:inherit;text-decoration:none}
li a:hover{background:#f5f6f7} small{color:#8c9097} iframe{width:100%;height:100%;border:0;background:#fff}</style></head>
<body><header>Local Inbox (Mailpit-compatible) — ${messages.length} message(s)</header><main><ul>
${messages.map((x) => `<li><a href="/view/${x.ID}" target="msg"><b>${esc(x.Subject)}</b><br><small>To: ${esc(x.To.map((t) => t.Address).join(', '))} · ${new Date(x.Created).toLocaleString()}</small></a></li>`).join('') || '<li style="padding:16px">No messages yet</li>'}
</ul><iframe name="msg" title="message"></iframe></main></body></html>`);
  });
  await new Promise((res) => http.listen(httpPort, '127.0.0.1', res));

  return {
    close: () => Promise.all([new Promise((r) => smtp.close(r)), new Promise((r) => http.close(r))]),
  };
}
