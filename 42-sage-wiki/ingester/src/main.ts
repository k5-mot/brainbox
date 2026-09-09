import {mkdir} from 'node:fs/promises';
import type {Server} from 'node:http';
import path from 'node:path';
import {Cron} from 'croner';
import {
  loadConfig,
  type IngesterConfig,
  type SourceConfig,
  startupSources,
  validateEnvironment,
} from './config.js';
import {synchronizeCouchDb, type SyncSummary} from './couchdb.js';
import {
  type IngesterRuntimeStatus,
  type SourceRuntimeStatus,
  startStatusServer,
} from './status.js';

type Job = () => Promise<unknown>;

class SerialJobQueue {
  #tail: Promise<void> = Promise.resolve();

  /**
   * jobを既存jobの末尾へ追加し、source snapshotの同時更新を防ぐ。
   * @param name logへ記録するjob名。
   * @param job 実行する非同期処理。
   * @returns queueへ登録したjobの完了Promise。
   * @sideeffect jobを1回実行し、結果をapplication logへ記録する。
   */
  enqueue(name: string, job: Job): Promise<void> {
    const current = this.#tail.then(async () => {
      log('info', 'job.started', {job: name});
      try {
        await job();
        log('info', 'job.completed', {job: name});
      } catch (error) {
        log('error', 'job.failed', {job: name, error: errorMessage(error)});
      }
    });
    this.#tail = current;
    return current;
  }

  /**
   * queue済みjobがすべて完了するまで待機する。
   * @returns queue末尾jobの完了Promise。
   */
  idle(): Promise<void> {
    return this.#tail;
  }
}

/**
 * 設定を読み、起動時同期と定期同期を開始する。
 * @returns startup完了時にresolveするPromise。
 * @throws 設定、credential、HTTP listenまたはschedule初期化に失敗した場合。
 * @sideeffect project directoryを準備し、status HTTP server、CouchDB同期とcron jobを開始する。
 */
async function main(): Promise<void> {
  const config = await loadConfig(process.env.CONFIG_PATH ?? '/app/config.yaml');
  validateEnvironment(config, process.env);
  await prepareProject(config.projectRoot);

  const mode = process.argv[2];
  if (mode !== undefined && mode !== 'ingest') {
    throw new Error(`未対応のIngester modeです: ${mode}`);
  }
  if (mode === 'ingest') {
    const sourceId = process.argv[3];
    if (!sourceId) throw new Error('ingest modeにはsource IDが必要です');
    const source = config.sources.find((candidate) => candidate.id === sourceId);
    if (!source) throw new Error(`source IDが見つかりません: ${sourceId}`);
    await runSource(config.projectRoot, source);
    return;
  }

  const status = createRuntimeStatus(config);
  for (const source of config.sources) validateSchedule(source.ingest.schedule, config.timezone);
  const port = statusPort(process.env.STATUS_PORT);
  const statusServer = await startStatusServer(port, () => status);
  log('info', 'status.ready', {port});
  await runStartupIngests(config, status);
  const queue = new SerialJobQueue();
  const schedules = startSchedules(config, queue, status);
  status.ready = true;
  registerShutdown(schedules, queue, statusServer, status);
  log('info', 'ingester.ready', {
    projectRoot: config.projectRoot,
    sources: config.sources.length,
    schedules: schedules.length,
  });
}

/**
 * Sage WikiとIngesterが必要とするproject directoryを作成する。
 * @param projectRoot Sage Wiki project root。
 * @returns directory作成完了時にresolveするPromise。
 * @sideeffect project root配下へdirectoryを作成する。
 */
async function prepareProject(projectRoot: string): Promise<void> {
  await Promise.all([
    mkdir(path.join(projectRoot, 'sources'), {recursive: true}),
    mkdir(path.join(projectRoot, 'wiki'), {recursive: true}),
    mkdir(path.join(projectRoot, '.sage-ingester'), {recursive: true}),
  ]);
}

/**
 * 起動時同期を有効にしたsourceを設定順に取り込む。
 * @param config sourceとproject rootを含むIngester設定。
 * @param status 同期結果を反映するruntime status。
 * @returns すべての起動時同期が完了したときにresolveするPromise。
 * @sideeffect 対象sourceのMarkdown snapshotを更新する。
 */
export async function runStartupIngests(
  config: IngesterConfig,
  status: IngesterRuntimeStatus,
): Promise<void> {
  for (const source of startupSources(config)) {
    log('info', 'job.started', {job: `ingest:${source.id}:startup`});
    try {
      await runTrackedSource(config.projectRoot, source, sourceStatus(status, source.id));
      log('info', 'job.completed', {job: `ingest:${source.id}:startup`});
    } catch (error) {
      log('error', 'job.failed', {
        job: `ingest:${source.id}:startup`,
        error: errorMessage(error),
      });
    }
  }
}

/**
 * source同期の開始、成功または失敗をruntime statusへ反映する。
 * @param projectRoot Sage Wiki project root。
 * @param source 同期対象sourceの設定。
 * @param status 更新するsource runtime status。
 * @returns adapterが返した同期集計。
 * @throws source同期に失敗した場合。
 * @sideeffect source snapshotとruntime statusを更新する。
 */
async function runTrackedSource(
  projectRoot: string,
  source: SourceConfig,
  status: SourceRuntimeStatus,
): Promise<SyncSummary> {
  const started = Date.now();
  status.state = 'running';
  status.startedAt = new Date(started).toISOString();
  delete status.completedAt;
  delete status.durationMs;
  delete status.lastError;
  try {
    const summary = await runSource(projectRoot, source);
    status.state = 'success';
    status.lastSummary = summary;
    return summary;
  } catch (error) {
    status.state = 'error';
    status.lastError = errorMessage(error);
    throw error;
  } finally {
    status.completedAt = new Date().toISOString();
    status.durationMs = Date.now() - started;
  }
}

/**
 * source adapterを選択して1回同期する。
 * @param projectRoot Sage Wiki project root。
 * @param source 同期対象sourceの設定。
 * @returns adapterが返した同期集計。
 * @throws 未対応adapterまたは同期処理に失敗した場合。
 * @sideeffect project rootのsource snapshotを更新する。
 */
async function runSource(projectRoot: string, source: SourceConfig): Promise<SyncSummary> {
  switch (source.adapter) {
    case 'couchdb': {
      const summary = await synchronizeCouchDb(projectRoot, source, process.env);
      log('info', 'source.synchronized', {source: source.id, ...summary});
      return summary;
    }
  }
}

/**
 * 有効なsourceのcron jobを登録する。
 * @param config sourceとtimezoneを含むIngester設定。
 * @param queue 同期処理を直列化するqueue。
 * @returns shutdown時に停止するCron instance一覧。
 * @throws cron式またはtimezoneが不正な場合。
 * @sideeffect cron timerを開始する。
 */
function startSchedules(
  config: IngesterConfig,
  queue: SerialJobQueue,
  status: IngesterRuntimeStatus,
): Cron[] {
  return config.sources
    .filter((source) => source.ingest.enabled)
    .map((source) => new Cron(
      source.ingest.schedule,
      {timezone: config.timezone, protect: true},
      () => void queue.enqueue(
        `ingest:${source.id}`,
        () => runTrackedSource(config.projectRoot, source, sourceStatus(status, source.id)),
      ),
    ));
}

/**
 * cron式とtimezoneを起動時に検証する。
 * @param expression 検証するcron式。
 * @param timezone IANA timezone名。
 * @returns 戻り値はない。
 * @throws Cronerが設定を解釈できない場合。
 */
function validateSchedule(expression: string, timezone: string): void {
  const schedule = new Cron(expression, {timezone, paused: true});
  schedule.stop();
}

/**
 * SIGTERMとSIGINTでscheduleを止め、実行中jobの完了を待つ。
 * @param schedules 停止対象のCron instance一覧。
 * @param queue 完了を待つjob queue。
 * @param server 停止するstatus HTTP server。
 * @param status 停止状態を反映するruntime status。
 * @returns 戻り値はない。
 * @sideeffect processへsignal handlerを登録する。
 */
function registerShutdown(
  schedules: Cron[],
  queue: SerialJobQueue,
  server: Server,
  status: IngesterRuntimeStatus,
): void {
  let stopping = false;
  /**
   * signal受信後にschedulerとqueueを安全に停止する。
   * @param signal processが受信したsignal名。
   * @returns shutdown完了時にresolveするPromise。
   * @sideeffect cron timerを停止し、application logを出力する。
   */
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (stopping) return;
    stopping = true;
    status.ready = false;
    log('info', 'ingester.stopping', {signal});
    for (const schedule of schedules) schedule.stop();
    await queue.idle();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    log('info', 'ingester.stopped');
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

/**
 * 設定から起動直後のIngester runtime statusを生成する。
 * @param config sourceとscheduler設定を含むIngester設定。
 * @returns Web UIとstatus APIが公開する初期状態。
 */
function createRuntimeStatus(config: IngesterConfig): IngesterRuntimeStatus {
  return {
    startedAt: new Date().toISOString(),
    ready: false,
    projectRoot: config.projectRoot,
    timezone: config.timezone,
    sources: config.sources.map((source) => ({
      id: source.id,
      adapter: source.adapter,
      enabled: source.ingest.enabled,
      runOnStart: source.ingest.runOnStart,
      schedule: source.ingest.schedule,
      state: 'idle',
    })),
  };
}

/**
 * runtime statusから指定sourceの状態を取得する。
 * @param status 全sourceのruntime status。
 * @param sourceId 検索するsource ID。
 * @returns 一致するsource runtime status。
 * @throws 設定とruntime statusが不整合な場合。
 */
function sourceStatus(status: IngesterRuntimeStatus, sourceId: string): SourceRuntimeStatus {
  const source = status.sources.find((candidate) => candidate.id === sourceId);
  if (!source) throw new Error(`runtime statusにsource IDがありません: ${sourceId}`);
  return source;
}

/**
 * 環境変数をstatus HTTP serverのTCP portへ変換する。
 * @param value STATUS_PORTの値。未指定時は3333を使用する。
 * @returns 検証済みのTCP port。
 * @throws 0から65535までの整数でない場合。
 */
function statusPort(value: string | undefined): number {
  const port = Number(value ?? '3333');
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`STATUS_PORTが不正です: ${value ?? ''}`);
  }
  return port;
}

/**
 * structured application logを標準出力へ書き込む。
 * @param level log level。
 * @param event event名。
 * @param fields credentialを含まない追加field。
 * @returns 戻り値はない。
 * @sideeffect JSON logを標準出力へ書き込む。
 */
function log(level: 'info' | 'error', event: string, fields: object = {}): void {
  console.log(JSON.stringify({timestamp: new Date().toISOString(), level, event, ...fields}));
}

/**
 * unknown errorをcredential非依存のlog文字列へ変換する。
 * @param error catchした値。
 * @returns logへ記録できるmessage。
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

main().catch((error: unknown) => {
  log('error', 'ingester.startup.failed', {error: errorMessage(error)});
  process.exitCode = 1;
});
