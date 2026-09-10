import {createServer, type Server, type ServerResponse} from 'node:http';
import type {SyncSummary} from './couchdb.js';

export type SourceRunState = 'idle' | 'queued' | 'running' | 'success' | 'error';

export type TriggerResult = 'accepted' | 'not-found' | 'disabled' | 'busy';

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

export interface ForceReextractRuntimeStatus {
  state: SourceRunState;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  lastError?: string;
}

export interface IngesterRuntimeStatus {
  startedAt: string;
  ready: boolean;
  projectRoot: string;
  timezone: string;
  forceReextract: ForceReextractRuntimeStatus;
  sources: SourceRuntimeStatus[];
}

type StatusProvider = () => IngesterRuntimeStatus;
type SourceTrigger = (sourceId: string) => TriggerResult;
type ForceTrigger = () => TriggerResult;

const STATUS_SCRIPT = String.raw`const TOKEN_STORAGE_KEY = 'sage-wiki-ingester-token';

for (const button of document.querySelectorAll('[data-trigger-source]')) {
  button.addEventListener('click', triggerSource);
}
for (const button of document.querySelectorAll('[data-trigger-force-reextract]')) {
  button.addEventListener('click', triggerForceReextract);
}

/**
 * 選択したsourceを常駐Ingesterのqueueへ登録する。
 * @param {MouseEvent} event manual triggerのclick event。
 * @returns {Promise<void>} API requestと画面更新の完了時にresolveするPromise。
 */
async function triggerSource(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  const sourceId = button.dataset.triggerSource;
  if (!sourceId) return;

  await requestTrigger(button, '/api/sources/' + encodeURIComponent(sourceId) + '/ingest', 'Run now');
}

/**
 * 全summaryのconcept・relation再抽出を常駐Ingesterのqueueへ登録する。
 * @param {MouseEvent} event Force Triggerのclick event。
 * @returns {Promise<void>} API requestと画面更新の完了時にresolveするPromise。
 */
async function triggerForceReextract(event) {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;

  await requestTrigger(button, '/api/force-reextract', 'Force re-extract');
}

/**
 * 認証tokenを付けてtrigger APIを呼び、button状態を同期する。
 * @param {HTMLButtonElement} button 操作中状態を表示するbutton。
 * @param {string} endpoint POSTする同一originのAPI path。
 * @param {string} idleLabel 失敗時に復元するbutton label。
 * @returns {Promise<void>} API requestと画面更新の完了時にresolveするPromise。
 */
async function requestTrigger(button, endpoint, idleLabel) {

  let token = sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  if (!token) {
    token = window.prompt('SAGE_WIKI_TOKENを入力してください')?.trim() ?? '';
    if (!token) return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  button.disabled = true;
  button.textContent = 'Queuing...';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {authorization: 'Bearer ' + token},
    });
    if (response.status === 401) sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (!response.ok) throw new Error((await response.text()).trim() || 'HTTP ' + response.status);
    window.location.reload();
  } catch (error) {
    button.disabled = false;
    button.textContent = idleLabel;
    window.alert(error instanceof Error ? error.message : String(error));
  }
}`;

/**
 * Ingester状態をJSONと単一HTML pageで公開するHTTP serverを開始する。
 * @param port listenするTCP port。0を指定すると空きportを自動選択する。
 * @param getStatus request時点のIngester状態を返す関数。
 * @param triggerSource 指定sourceを常駐processのqueueへ登録する関数。
 * @param triggerForceReextract 全summaryの再抽出を常駐processのqueueへ登録する関数。
 * @param token manual triggerのBearer認証に使用するtoken。
 * @returns listen済みのHTTP server。
 * @throws TCP portをlistenできない場合。
 * @sideeffect すべてのinterfaceでHTTP serverをlistenする。
 */
export async function startStatusServer(
  port: number,
  getStatus: StatusProvider,
  triggerSource: SourceTrigger,
  triggerForceReextract: ForceTrigger,
  token: string,
): Promise<Server> {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method === 'GET' && pathname === '/health') {
      send(response, 200, 'text/plain; charset=utf-8', 'ok\n');
      return;
    }
    if (request.method === 'POST' && pathname === '/api/force-reextract') {
      if (!isAuthorized(request.headers.authorization, token)) {
        send(response, 401, 'text/plain; charset=utf-8', 'Unauthorized\n');
        return;
      }
      const result = triggerForceReextract();
      if (result === 'accepted') {
        send(response, 202, 'application/json; charset=utf-8', `${JSON.stringify({job: 'force-reextract', state: 'queued'})}\n`);
        return;
      }
      send(response, 409, 'text/plain; charset=utf-8', 'Force Re-extract Busy\n');
      return;
    }
    if (request.method === 'GET' && pathname === '/api/status') {
      send(response, 200, 'application/json; charset=utf-8', `${JSON.stringify(getStatus())}\n`);
      return;
    }
    if (request.method === 'GET' && pathname === '/status.js') {
      send(response, 200, 'text/javascript; charset=utf-8', STATUS_SCRIPT);
      return;
    }
    if (request.method === 'GET' && pathname === '/') {
      send(response, 200, 'text/html; charset=utf-8', renderStatusPage(getStatus()));
      return;
    }
    const triggerMatch = pathname.match(/^\/api\/sources\/([^/]+)\/ingest$/);
    if (request.method === 'POST' && triggerMatch) {
      if (!isAuthorized(request.headers.authorization, token)) {
        send(response, 401, 'text/plain; charset=utf-8', 'Unauthorized\n');
        return;
      }
      let sourceId: string;
      try {
        sourceId = decodeURIComponent(triggerMatch[1] ?? '');
      } catch {
        send(response, 400, 'text/plain; charset=utf-8', 'Invalid Source ID\n');
        return;
      }
      const result = triggerSource(sourceId);
      if (result === 'accepted') {
        send(response, 202, 'application/json; charset=utf-8', `${JSON.stringify({source: sourceId, state: 'queued'})}\n`);
        return;
      }
      if (result === 'not-found') {
        send(response, 404, 'text/plain; charset=utf-8', 'Source Not Found\n');
        return;
      }
      send(response, 409, 'text/plain; charset=utf-8', result === 'disabled' ? 'Source Disabled\n' : 'Source Busy\n');
      return;
    }
    if (request.method !== 'GET') {
      send(response, 405, 'text/plain; charset=utf-8', 'Method Not Allowed\n');
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
 * Authorization headerがmanual trigger用Bearer tokenと一致するか判定する。
 * @param authorization HTTP Authorization header。
 * @param token 設定済みのBearer token。
 * @returns tokenが一致する場合はtrue。
 */
function isAuthorized(authorization: string | undefined, token: string): boolean {
  return token.length > 0 && authorization === `Bearer ${token}`;
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
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'",
  });
  response.end(body);
}

/**
 * 現在のIngester状態を自動更新するHTMLへ変換する。
 * @param status 表示するIngester状態。
 * @returns browserへ返す完全なHTML document。
 */
function renderStatusPage(status: IngesterRuntimeStatus): string {
  let rows = '';
  for (const source of status.sources) rows += renderSourceRow(source, status.ready);
  const force = renderForceReextract(status.forceReextract, status.ready);
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
    .muted{color:#94a3b8}.ok{color:#34d399}.error{color:#fb7185}.running,.queued{color:#60a5fa}
    table{width:100%;margin-top:24px;border-collapse:collapse;background:#172033;border:1px solid #334155}
    th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #334155}th{color:#94a3b8}
    button{padding:7px 12px;border:1px solid #60a5fa;border-radius:6px;background:#1d4ed8;color:#fff;cursor:pointer}
    button:disabled{border-color:#475569;background:#334155;color:#94a3b8;cursor:not-allowed}
    code{font-family:ui-monospace,monospace}footer{margin-top:16px;font-size:13px;color:#64748b}
    .force{margin-top:24px;padding:18px;background:#172033;border:1px solid #334155;border-radius:8px}
    .force h2{margin:0 0 8px;font-size:18px}.force p{margin:8px 0}
  </style>
</head>
<body>
  <h1>Sage Wiki Ingester</h1>
  <div class="${status.ready ? 'ok' : 'running'}">${status.ready ? 'Ready' : 'Starting'}</div>
  <p class="muted">Project: <code>${escapeHtml(status.projectRoot)}</code> · Timezone: ${escapeHtml(status.timezone)} · Started: ${escapeHtml(status.startedAt)}</p>
  <table>
    <thead><tr><th>Source</th><th>Status</th><th>Schedule</th><th>Last result</th><th>Manual trigger</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${force}
  <footer>10秒ごとに自動更新 · JSON: <code>/api/status</code></footer>
  <script src="/status.js"></script>
</body>
</html>`;
}

/**
 * 全summary再抽出の状態と専用buttonをHTMLへ変換する。
 * @param force 表示するForce re-extract状態。
 * @param ready Ingesterがtriggerを受け付けられる場合はtrue。
 * @returns escape済みのHTML section。
 */
function renderForceReextract(force: ForceReextractRuntimeStatus, ready: boolean): string {
  const stateClass = force.state === 'error'
    ? 'error'
    : force.state === 'running' || force.state === 'queued'
      ? force.state
      : 'ok';
  const disabled = !ready || force.state === 'queued' || force.state === 'running';
  const completed = force.completedAt
    ? ` · Completed: ${escapeHtml(force.completedAt)}${force.durationMs === undefined ? '' : ` · ${Math.round(force.durationMs / 1000)}s`}`
    : '';
  const error = force.lastError ? `<p class="error">${escapeHtml(force.lastError)}</p>` : '';
  return `<section class="force">
    <h2>Concept graph force extraction</h2>
    <p>既存summaryを小batch・高token上限で再処理し、concept間relationと記事を再生成します。</p>
    <p>Status: <strong class="${stateClass}">${escapeHtml(force.state)}</strong><span class="muted">${completed}</span></p>
    ${error}
    <button type="button" data-trigger-force-reextract${disabled ? ' disabled' : ''}>Force re-extract</button>
  </section>`;
}

/**
 * 1つのsource状態をHTML table rowへ変換する。
 * @param source 表示するsource状態。
 * @param ready Ingesterがmanual triggerを受け付けられる場合はtrue。
 * @returns escape済みのHTML table row。
 */
function renderSourceRow(source: SourceRuntimeStatus, ready: boolean): string {
  const stateClass = source.state === 'error'
    ? 'error'
    : source.state === 'running' || source.state === 'queued'
      ? source.state
      : 'ok';
  const result = source.lastSummary
    ? `${source.lastSummary.documents} docs · +${source.lastSummary.created} / ~${source.lastSummary.updated} / =${source.lastSummary.unchanged} / -${source.lastSummary.removed}`
    : source.lastError ?? '未実行';
  const completed = source.completedAt ? `<br><span class="muted">${escapeHtml(source.completedAt)}</span>` : '';
  const triggerDisabled = !ready || !source.enabled || source.state === 'queued' || source.state === 'running';
  return `<tr>
    <td><strong>${escapeHtml(source.id)}</strong><br><span class="muted">${escapeHtml(source.adapter)}</span></td>
    <td class="${stateClass}">${escapeHtml(source.state)}${completed}</td>
    <td><code>${escapeHtml(source.schedule)}</code><br><span class="muted">${source.enabled ? 'enabled' : 'disabled'}</span></td>
    <td>${escapeHtml(result)}</td>
    <td><button type="button" data-trigger-source="${escapeHtml(source.id)}"${triggerDisabled ? ' disabled' : ''}>Run now</button></td>
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
