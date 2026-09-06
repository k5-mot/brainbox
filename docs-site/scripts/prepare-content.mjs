import {cp, copyFile, mkdir, rm} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const siteDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryDirectory = dirname(siteDirectory);
const generatedDirectory = join(siteDirectory, '.generated-content');
const componentDirectories = [
  '01-keycloak',
  '10-inference',
  '11-rag',
  '12-registry',
  '13-translate',
  '20-owui',
  '21-dify',
  '22-ragflow',
  '25-cloudflareos',
  '26-octos',
  '27-aion',
  '30-nextcloud',
  '31-xwiki',
  '33-zulip',
  '34-gitlab',
  '41-llmwiki',
  '50-o11y',
  '51-langfuse',
  'scripts',
];

if (siteDirectory !== join(repositoryDirectory, 'docs-site')) {
  throw new Error('生成先がdocs-site直下ではありません');
}

// 毎回空の生成先から始め、削除済みの正規文書がsiteへ残留することを防ぎます。
await rm(generatedDirectory, {recursive: true, force: true});
await mkdir(join(generatedDirectory, 'openspec'), {recursive: true});
await cp(
  join(repositoryDirectory, 'openspec', 'specs'),
  join(generatedDirectory, 'openspec', 'specs'),
  {recursive: true},
);
await cp(join(repositoryDirectory, 'docs'), join(generatedDirectory, 'docs'), {
  recursive: true,
});
await copyFile(
  join(repositoryDirectory, 'README.md'),
  join(generatedDirectory, 'README.md'),
);

for (const componentDirectory of componentDirectories) {
  const outputDirectory = join(generatedDirectory, componentDirectory);
  await mkdir(outputDirectory, {recursive: true});
  await copyFile(
    join(repositoryDirectory, componentDirectory, 'README.md'),
    join(outputDirectory, 'README.md'),
  );
}
