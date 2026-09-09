import {createHash} from 'node:crypto';
import {mkdir, readFile, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {dump as dumpYaml} from 'js-yaml';
import type {CouchDbSourceConfig} from './config.js';

const MAX_SOURCE_CHARS = 100_000;

type FetchLike = typeof fetch;
type SourceManifest = Record<string, string>;

interface CouchDbDocument {
  id: string;
  path: string;
  content: string;
}

export interface SyncSummary {
  documents: number;
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  skippedEmpty: number;
}

/**
 * CouchDBのLiveSync snapshotをSage Wiki sourceへ同期する。
 * @param projectRoot Sage Wiki project root。
 * @param source CouchDB接続とfilterの設定。
 * @param environ credentialを参照する環境変数map。
 * @param fetchImpl test時に差し替えるFetch実装。
 * @returns 作成、更新、未変更、削除件数を含む同期結果。
 * @throws CouchDB取得、document復元またはfilesystem操作に失敗した場合。
 * @sideeffect project rootのsourcesとadapter manifestを更新する。
 */
export async function synchronizeCouchDb(
  projectRoot: string,
  source: CouchDbSourceConfig,
  environ: NodeJS.ProcessEnv,
  fetchImpl: FetchLike = fetch,
): Promise<SyncSummary> {
  const documents = await fetchDocuments(source, environ, fetchImpl);
  const previous = await readManifest(projectRoot, source.id);
  const next: SourceManifest = {};
  const summary = {
    documents: documents.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    skippedEmpty: 0,
  };

  for (const document of documents) {
    if (document.content.trim().length === 0) {
      summary.skippedEmpty += 1;
      continue;
    }
    const filename = previous[document.id] ?? sourceFilename(source.id, document.id);
    const rendered = renderSource(source, document);
    const status = await writeSource(projectRoot, filename, rendered);
    summary[status] += 1;
    next[document.id] = filename;
  }

  summary.removed = await removeStaleSources(projectRoot, previous, next);
  await writeManifest(projectRoot, source.id, next);
  return summary;
}

/**
 * CouchDB snapshotから公開対象のLiveSync Markdownを復元する。
 * @param source CouchDB接続とfilterの設定。
 * @param environ credentialを参照する環境変数map。
 * @param fetchImpl HTTP取得に使用するFetch実装。
 * @returns path順の復元済みMarkdown一覧。
 * @throws credential、HTTP応答またはLiveSync documentが不正な場合。
 */
async function fetchDocuments(
  source: CouchDbSourceConfig,
  environ: NodeJS.ProcessEnv,
  fetchImpl: FetchLike,
): Promise<CouchDbDocument[]> {
  const username = environ[source.usernameEnv];
  const password = environ[source.passwordEnv];
  if (!username) throw new Error(`CouchDB usernameが未設定です: ${source.usernameEnv}`);
  if (!password) throw new Error(`CouchDB passwordが未設定です: ${source.passwordEnv}`);

  const response = await fetchImpl(allDocsUrl(source), {
    headers: {
      accept: 'application/json',
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
    signal: AbortSignal.timeout(source.ingest.timeoutSeconds * 1000),
  });
  if (!response.ok) {
    throw new Error(`CouchDB snapshot取得に失敗しました: status=${response.status}`);
  }

  const payload: unknown = await response.json();
  const documentsById = new Map<string, Record<string, unknown>>();
  for (const row of allDocsRows(payload)) {
    const document = recordValue(row.doc);
    const id = stringValue(document?._id);
    if (document && id) documentsById.set(id, document);
  }

  const parents = [...documentsById.values()].filter((document) => (
    isVisibleMarkdownParent(document, source.excludePathPrefixes)
  ));
  if (parents.length > source.maxDocuments) {
    throw new Error(
      `CouchDB Markdown document数が上限を超えています: ${parents.length}/${source.maxDocuments}`,
    );
  }
  return parents
    .map((parent) => restoreDocument(parent, documentsById))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/**
 * source documentを安定したfrontmatter付きMarkdownへ変換する。
 * @param source titleとsource URLの生成に使うCouchDB設定。
 * @param document 復元済みLiveSync document。
 * @returns Sage Wikiへ投入するMarkdown文字列。
 */
function renderSource(source: CouchDbSourceConfig, document: CouchDbDocument): string {
  const originalChars = document.content.length;
  const content = document.content.slice(0, MAX_SOURCE_CHARS);
  const metadata: Record<string, unknown> = {
    title: documentTitle(document.path, source.titleStrategy),
    source: documentUrl(source, document.id),
    source_type: 'couchdb',
  };
  if (content.length < originalChars) {
    metadata.truncated = true;
    metadata.original_chars = originalChars;
  }
  const frontmatter = dumpYaml(metadata, {lineWidth: -1, quotingType: '"'}).trimEnd();
  return `---\n${frontmatter}\n---\n\n${content}`;
}

/**
 * Obsidian note pathをsource titleへ変換する。
 * @param notePath vault rootからのnote path。
 * @param strategy pathを保持するか階層を空白で連結する方式。
 * @returns Sage Wiki sourceのtitle。
 */
export function documentTitle(
  notePath: string,
  strategy: CouchDbSourceConfig['titleStrategy'],
): string {
  if (strategy === 'path') return notePath;
  return notePath
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment, index, segments) => (
      index === segments.length - 1 ? segment.replace(/\.md$/i, '') : segment
    ))
    .join(' ');
}

/**
 * 内容が変わった場合だけsource fileをatomicに置換する。
 * @param projectRoot Sage Wiki project root。
 * @param filename sources直下の安全なfile名。
 * @param rendered 保存するMarkdown全体。
 * @returns 作成、更新または未変更の状態。
 * @sideeffect project rootのsourcesへMarkdownを書き込む。
 */
async function writeSource(
  projectRoot: string,
  filename: string,
  rendered: string,
): Promise<'created' | 'updated' | 'unchanged'> {
  const target = path.join(projectRoot, 'sources', filename);
  let existing: string | undefined;
  try {
    existing = await readFile(target, 'utf8');
  } catch (error) {
    if (!isFileNotFound(error)) throw error;
  }
  if (existing === rendered) return 'unchanged';
  const temporary = `${target}.${process.pid}.tmp`;
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(temporary, rendered, 'utf8');
  await rename(temporary, target);
  return existing === undefined ? 'created' : 'updated';
}

/**
 * 前回snapshotにだけ残るadapter所有sourceを削除する。
 * @param projectRoot Sage Wiki project root。
 * @param previous 前回のdocument IDとfile名の対応。
 * @param next 今回のdocument IDとfile名の対応。
 * @returns 削除したsource file数。
 * @sideeffect sourcesから古いadapter所有fileを削除する。
 */
async function removeStaleSources(
  projectRoot: string,
  previous: SourceManifest,
  next: SourceManifest,
): Promise<number> {
  const retained = new Set(Object.values(next));
  let removed = 0;
  for (const filename of new Set(Object.values(previous))) {
    if (retained.has(filename) || !isSafeFilename(filename)) continue;
    try {
      await unlink(path.join(projectRoot, 'sources', filename));
      removed += 1;
    } catch (error) {
      if (!isFileNotFound(error)) throw error;
    }
  }
  return removed;
}

/**
 * adapter manifestを読み、未作成時は空objectを返す。
 * @param projectRoot Sage Wiki project root。
 * @param sourceId manifestを識別するsource ID。
 * @returns document IDとsource file名の対応。
 * @throws JSONまたは記録されたfile名が不正な場合。
 */
async function readManifest(projectRoot: string, sourceId: string): Promise<SourceManifest> {
  try {
    const value: unknown = JSON.parse(await readFile(manifestPath(projectRoot, sourceId), 'utf8'));
    const record = recordValue(value);
    if (!record) throw new Error(`Ingester manifestがobjectではありません: ${sourceId}`);
    const manifest: SourceManifest = {};
    for (const [id, filename] of Object.entries(record)) {
      if (typeof filename !== 'string' || !isSafeFilename(filename)) {
        throw new Error(`Ingester manifestのfile名が不正です: ${sourceId}`);
      }
      manifest[id] = filename;
    }
    return manifest;
  } catch (error) {
    if (isFileNotFound(error)) return {};
    throw error;
  }
}

/**
 * adapter manifestを一時file経由で置換する。
 * @param projectRoot Sage Wiki project root。
 * @param sourceId manifestを識別するsource ID。
 * @param manifest 保存するdocument IDとsource file名の対応。
 * @returns 書込完了時にresolveするPromise。
 * @sideeffect project rootの.sage-ingesterへmanifestを書き込む。
 */
async function writeManifest(
  projectRoot: string,
  sourceId: string,
  manifest: SourceManifest,
): Promise<void> {
  const directory = path.join(projectRoot, '.sage-ingester');
  const target = manifestPath(projectRoot, sourceId);
  const temporary = `${target}.${process.pid}.tmp`;
  await mkdir(directory, {recursive: true});
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

/**
 * CouchDB source用manifestのpathを返す。
 * @param projectRoot Sage Wiki project root。
 * @param sourceId manifestを識別するsource ID。
 * @returns manifestの絶対path。
 */
function manifestPath(projectRoot: string, sourceId: string): string {
  return path.join(projectRoot, '.sage-ingester', `couchdb-${sourceId}.json`);
}

/**
 * source IDとdocument IDから衝突しにくいfile名を生成する。
 * @param sourceId source設定を識別するID。
 * @param documentId CouchDB document ID。
 * @returns sources直下へ保存するMarkdown file名。
 */
function sourceFilename(sourceId: string, documentId: string): string {
  const digest = createHash('sha256').update(documentId).digest('hex').slice(0, 16);
  return `couchdb-${sourceId}-${digest}.md`;
}

/**
 * CouchDB `_all_docs` endpointをcredentialなしで構築する。
 * @param source CouchDB接続設定。
 * @returns include_docsを有効にしたURL。
 * @throws base URLへcredentialが埋め込まれている場合。
 */
function allDocsUrl(source: CouchDbSourceConfig): URL {
  const endpoint = new URL(
    `${encodeURIComponent(source.database)}/_all_docs`,
    normalizedBaseUrl(source.url),
  );
  endpoint.searchParams.set('include_docs', 'true');
  return endpoint;
}

/**
 * CouchDB documentを示すcredentialなしURLを構築する。
 * @param source CouchDB接続設定。
 * @param documentId CouchDB document ID。
 * @returns source identityとして保存するURL。
 */
function documentUrl(source: CouchDbSourceConfig, documentId: string): string {
  return new URL(
    `${encodeURIComponent(source.database)}/${encodeURIComponent(documentId)}`,
    normalizedBaseUrl(source.url),
  ).toString();
}

/**
 * CouchDB base URLを安全な末尾slash付きURLへ変換する。
 * @param value 設定から受け取ったURL文字列。
 * @returns 相対pathを解決できるURL。
 * @throws URLへcredentialが埋め込まれている場合。
 */
function normalizedBaseUrl(value: string): URL {
  const baseUrl = new URL(value.endsWith('/') ? value : `${value}/`);
  if (baseUrl.username || baseUrl.password) {
    throw new Error('CouchDB URLへcredentialを埋め込んではなりません');
  }
  return baseUrl;
}

/**
 * `_all_docs`応答からobject row一覧を取り出す。
 * @param value CouchDBから受け取った未検証値。
 * @returns objectであることを検証したrow一覧。
 * @throws rowsが存在しない、またはrowがobjectでない場合。
 */
function allDocsRows(value: unknown): Array<Record<string, unknown>> {
  const payload = recordValue(value);
  if (!payload || !Array.isArray(payload.rows)) {
    throw new Error('CouchDB `_all_docs`応答にrowsがありません');
  }
  return payload.rows.map((row) => {
    const record = recordValue(row);
    if (!record) throw new Error('CouchDB `_all_docs` rowがobjectではありません');
    return record;
  });
}

/**
 * LiveSync documentが公開対象のMarkdown親documentか判定する。
 * @param document 判定するCouchDB document。
 * @param excludePathPrefixes 除外するpath prefix一覧。
 * @returns 非削除かつhiddenでないMarkdown親documentならtrue。
 */
function isVisibleMarkdownParent(
  document: Record<string, unknown>,
  excludePathPrefixes: readonly string[],
): boolean {
  if (document.type !== 'plain' || document.deleted === true) return false;
  const notePath = stringValue(document.path);
  if (!notePath || !notePath.toLowerCase().endsWith('.md')) return false;
  if (excludePathPrefixes.some((prefix) => notePath.startsWith(prefix))) return false;
  return !notePath.split('/').some((segment) => segment.startsWith('.'));
}

/**
 * LiveSync親documentのchildren順にleaf dataを連結する。
 * @param parent 復元する親document。
 * @param documentsById leafを検索するdocument map。
 * @returns ID、pathおよびMarkdown本文を持つdocument。
 * @throws 親または参照先leafの構造が不正な場合。
 */
function restoreDocument(
  parent: Record<string, unknown>,
  documentsById: ReadonlyMap<string, Record<string, unknown>>,
): CouchDbDocument {
  const id = requiredString(parent._id, '親documentの_id');
  const notePath = requiredString(parent.path, `親document ${id} のpath`);
  if (!Array.isArray(parent.children)) {
    throw new Error(`LiveSync親documentにchildrenがありません: ${id}`);
  }
  const chunks = parent.children.map((childIdValue) => {
    const childId = requiredString(childIdValue, `親document ${id} のchild ID`);
    const child = documentsById.get(childId);
    if (!child || child.type !== 'leaf') {
      throw new Error(`LiveSync leaf chunkが見つかりません: ${childId}`);
    }
    return requiredString(child.data, `LiveSync leaf chunk ${childId} のdata`);
  });
  return {id, path: notePath, content: chunks.join('')};
}

/**
 * unknown値を必須stringとして検証する。
 * @param value 検証する値。
 * @param field errorに含めるfield名。
 * @returns 検証済みstring。
 * @throws valueがstringでない場合。
 */
function requiredString(value: unknown, field: string): string {
  const result = stringValue(value);
  if (result === undefined) throw new Error(`${field}がstringではありません`);
  return result;
}

/**
 * unknown値をplain objectへ絞り込む。
 * @param value 絞り込む値。
 * @returns plain objectならその値、それ以外はundefined。
 */
function recordValue(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * unknown値をstringへ絞り込む。
 * @param value 絞り込む値。
 * @returns stringならその値、それ以外はundefined。
 */
function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * manifestのfile名がsources直下のMarkdownだけを指すか判定する。
 * @param filename manifestから受け取ったfile名。
 * @returns path traversalを含まないMarkdown file名ならtrue。
 */
function isSafeFilename(filename: string): boolean {
  return path.basename(filename) === filename && filename.endsWith('.md');
}

/**
 * filesystem errorがfile未存在を示すか判定する。
 * @param error catchした値。
 * @returns error codeがENOENTならtrue。
 */
function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
