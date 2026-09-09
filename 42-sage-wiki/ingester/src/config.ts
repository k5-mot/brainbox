import {readFile} from 'node:fs/promises';
import {load as loadYaml} from 'js-yaml';
import {z} from 'zod';

const ingestDefaultsSchema = z.strictObject({
  enabled: z.boolean(),
  run_on_start: z.boolean(),
  schedule: z.string().min(1),
  timeout_seconds: z.number().int().positive(),
});

const ingestOverrideSchema = ingestDefaultsSchema.partial().default({});

const couchDbSourceSchema = z.strictObject({
  id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
  adapter: z.literal('couchdb'),
  url: z.string().url(),
  database: z.string().min(1).regex(/^[a-z][a-z0-9_$()+/-]*$/),
  username_env: z.string().min(1).regex(/^[A-Z][A-Z0-9_]*$/),
  password_env: z.string().min(1).regex(/^[A-Z][A-Z0-9_]*$/),
  title_strategy: z.enum(['path', 'hierarchy']).default('hierarchy'),
  exclude_path_prefixes: z.array(z.string().min(1)).default([]),
  max_documents: z.number().int().positive().max(10000).default(1000),
  ingest: ingestOverrideSchema,
});

const configSchema = z.strictObject({
  version: z.literal(1),
  project: z.strictObject({root: z.string().min(1)}),
  scheduler: z.strictObject({timezone: z.string().min(1)}),
  defaults: z.strictObject({ingest: ingestDefaultsSchema}),
  sources: z.array(couchDbSourceSchema),
});

type ParsedConfig = z.infer<typeof configSchema>;

export interface IngestPolicy {
  enabled: boolean;
  runOnStart: boolean;
  schedule: string;
  timeoutSeconds: number;
}

export interface CouchDbSourceConfig {
  id: string;
  adapter: 'couchdb';
  url: string;
  database: string;
  usernameEnv: string;
  passwordEnv: string;
  titleStrategy: 'path' | 'hierarchy';
  excludePathPrefixes: string[];
  maxDocuments: number;
  ingest: IngestPolicy;
}

export type SourceConfig = CouchDbSourceConfig;

export interface IngesterConfig {
  projectRoot: string;
  timezone: string;
  sources: SourceConfig[];
}

/**
 * YAML fileからSage Wiki Ingester設定を読み込む。
 * @param configPath 読み込む設定fileのpath。
 * @returns source別の既定値を解決したIngester設定。
 * @throws file読込、YAML parseまたはschema検証に失敗した場合。
 */
export async function loadConfig(configPath: string): Promise<IngesterConfig> {
  const content = await readFile(configPath, 'utf8');
  return parseConfig(loadYaml(content));
}

/**
 * 未検証値をSage Wiki Ingester設定へ変換する。
 * @param value YAML parserなどが返した未検証値。
 * @returns source別の既定値を解決したIngester設定。
 * @throws schema違反またはsource ID重複がある場合。
 */
export function parseConfig(value: unknown): IngesterConfig {
  const parsed = configSchema.parse(value);
  assertUniqueSourceIds(parsed.sources);
  return {
    projectRoot: parsed.project.root,
    timezone: parsed.scheduler.timezone,
    sources: parsed.sources.map((source) => toSourceConfig(source, parsed.defaults.ingest)),
  };
}

/**
 * CouchDB credentialを環境変数から参照できることを検証する。
 * @param config 検証するIngester設定。
 * @param environ credentialを保持する環境変数map。
 * @returns 戻り値はない。
 * @throws 有効なsourceのcredentialが未設定の場合。
 */
export function validateEnvironment(
  config: IngesterConfig,
  environ: NodeJS.ProcessEnv,
): void {
  for (const source of config.sources) {
    if (!source.ingest.enabled) continue;
    if (!environ[source.usernameEnv]) {
      throw new Error(`必要なCouchDB username環境変数が未設定です: ${source.usernameEnv}`);
    }
    if (!environ[source.passwordEnv]) {
      throw new Error(`必要なCouchDB password環境変数が未設定です: ${source.passwordEnv}`);
    }
  }
}

/**
 * 起動時同期の対象sourceを設定順に返す。
 * @param config 判定するIngester設定。
 * @returns enabledとrun_on_startがともに有効なsource一覧。
 */
export function startupSources(config: IngesterConfig): SourceConfig[] {
  return config.sources.filter((source) => source.ingest.enabled && source.ingest.runOnStart);
}

/**
 * schema検証済みsourceへ既定のingest policyを適用する。
 * @param source schema検証済みCouchDB source。
 * @param defaults 共通のingest policy。
 * @returns 実行時に使用するCouchDB source設定。
 */
function toSourceConfig(
  source: ParsedConfig['sources'][number],
  defaults: ParsedConfig['defaults']['ingest'],
): CouchDbSourceConfig {
  return {
    id: source.id,
    adapter: source.adapter,
    url: source.url,
    database: source.database,
    usernameEnv: source.username_env,
    passwordEnv: source.password_env,
    titleStrategy: source.title_strategy,
    excludePathPrefixes: source.exclude_path_prefixes,
    maxDocuments: source.max_documents,
    ingest: {
      enabled: source.ingest.enabled ?? defaults.enabled,
      runOnStart: source.ingest.run_on_start ?? defaults.run_on_start,
      schedule: source.ingest.schedule ?? defaults.schedule,
      timeoutSeconds: source.ingest.timeout_seconds ?? defaults.timeout_seconds,
    },
  };
}

/**
 * source IDの重複によるscheduleとmanifestの衝突を防ぐ。
 * @param sources schema検証済みsource一覧。
 * @returns 戻り値はない。
 * @throws source IDが重複する場合。
 */
function assertUniqueSourceIds(sources: ParsedConfig['sources']): void {
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id)) throw new Error(`source IDが重複しています: ${source.id}`);
    ids.add(source.id);
  }
}
