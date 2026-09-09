import {createServer, type Server, type ServerResponse} from 'node:http';
import type {SyncSummary} from './couchdb.js';

export type SourceRunState = 'idle' | 'running' | 'success' | 'error';

export interface SourceRuntimeStatus {
  id: string;
  adapter: string;
  enabled: boolean;
  runOnStart: boolean;
  schedule: string;
  state: SourceRunState;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  lastSummary?: SyncSummary;
  lastError?: string;
}

export interface IngesterRuntimeStatus {
  startedAt: string;
  ready: boolean;
  projectRoot: string;
  timezone: string;
  sources: SourceRuntimeStatus[];
}

type StatusProvider = () => IngesterRuntimeStatus;

/**
 * Ingester状態をJSONと単一HTML pageで公開するHTTP serverを開始する。
 * @param port listenするTCP port。0を指定すると空きportを自動選択する。
 * @param getStatus request時点のIngester状態を返す関数。
 * @returns listen済みのHTTP server。
 * @throws TCP portをlistenできない場合。
 * @sideeffect すべてのinterfaceでHTTP serverをlistenする。
 */
export async function startStatusServer(port: number, getStatus: StatusProvider): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.method !== 'GET') {
      send(response, 405, 'text/plain; charset=utf-8', 'Method Not Allowed\n');
      return;
    }
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname === '/health') {
      send(response, 200, 'text/plain; charset=utf-8', 'ok\n');
      return;
    }
    if (pathname === '/api/status') {
      send(response, 200, 'application/json; charset=utf-8', `${JSON.stringify(getStatus())}\n`);
      return;
    }
    if (pathname === '/') {
      send(response, 200, 'text/html; charset=utf-8', renderStatusPage(getStatus()));
      return;
    }
    send(response, 404, 'text/plain; charset=utf-8', 'Not Found\n');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}

/**
 * HTTP応答へsecurity headerと本文を書き込む。
 * @param response 書込対象のHTTP応答。
 * @param statusCode HTTP status code。
 * @param contentType 応答本文のMIME type。
 * @param body 送信する本文。
 * @returns 戻り値はない。
 * @sideeffect HTTP応答を完了する。
 */
function send(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  body: string,
): void {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
  });
  response.end(body);
}

/**
 * 現在のIngester状態を自動更新するHTMLへ変換する。
 * @param status 表示するIngester状態。
 * @returns browserへ返す完全なHTML document。
 */
function renderStatusPage(status: IngesterRuntimeStatus): string {
  const rows = status.sources.map(renderSourceRow).join('');
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="10">
  <title>Sage Wiki Ingester</title>
  <style>
    :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
    body{max-width:1100px;margin:0 auto;padding:32px 20px}h1{margin:0 0 4px;font-size:24px}
    .muted{color:#94a3b8}.ok{color:#34d399}.error{color:#fb7185}.running{color:#60a5fa}
    table{width:100%;margin-top:24px;border-collapse:collapse;background:#172033;border:1px solid #334155}
    th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #334155}th{color:#94a3b8}
    code{font-family:ui-monospace,monospace}footer{margin-top:16px;font-size:13px;color:#64748b}
  </style>
</head>
<body>
  <h1>Sage Wiki Ingester</h1>
  <div class="${status.ready ? 'ok' : 'running'}">${status.ready ? 'Ready' : 'Starting'}</div>
  <p class="muted">Project: <code>${escapeHtml(status.projectRoot)}</code> · Timezone: ${escapeHtml(status.timezone)} · Started: ${escapeHtml(status.startedAt)}</p>
  <table>
    <thead><tr><th>Source</th><th>Status</th><th>Schedule</th><th>Last result</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <footer>10秒ごとに自動更新 · JSON: <code>/api/status</code></footer>
</body>
</html>`;
}

/**
 * 1つのsource状態をHTML table rowへ変換する。
 * @param source 表示するsource状態。
 * @returns escape済みのHTML table row。
 */
function renderSourceRow(source: SourceRuntimeStatus): string {
  const stateClass = source.state === 'error' ? 'error' : source.state === 'running' ? 'running' : 'ok';
  const result = source.lastSummary
    ? `${source.lastSummary.documents} docs · +${source.lastSummary.created} / ~${source.lastSummary.updated} / =${source.lastSummary.unchanged} / -${source.lastSummary.removed}`
    : source.lastError ?? '未実行';
  const completed = source.completedAt ? `<br><span class="muted">${escapeHtml(source.completedAt)}</span>` : '';
  return `<tr>
    <td><strong>${escapeHtml(source.id)}</strong><br><span class="muted">${escapeHtml(source.adapter)}</span></td>
    <td class="${stateClass}">${escapeHtml(source.state)}${completed}</td>
    <td><code>${escapeHtml(source.schedule)}</code><br><span class="muted">${source.enabled ? 'enabled' : 'disabled'}</span></td>
    <td>${escapeHtml(result)}</td>
  </tr>`;
}

/**
 * 外部値をHTML textとして安全に埋め込める文字列へ変換する。
 * @param value escapeする値。
 * @returns HTML特殊文字をentityへ置換した文字列。
 */
function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
