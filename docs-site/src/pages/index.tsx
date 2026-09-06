import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

/**
 * 現行仕様と補足文書へ移動する仕様サイトの入口を表示します。
 *
 * @returns Docusaurusで描画するhome page。
 */
export default function Home(): ReactNode {
  return (
    <Layout
      title="profile別の現行仕様"
      description="InferLabのOpenSpec、ADR、運用文書、READMEを横断して閲覧できます。"
    >
      <main className="container margin-vert--xl">
        <h1>InferLab 仕様サイト</h1>
        <p>
          OpenSpecを正規本文として、Docker Compose profileごとの外部契約を公開します。
          内部実装と運用手順はADRおよび既存READMEから確認できます。
        </p>
        <p>
          <Link
            className="button button--primary button--lg margin-right--md"
            to="/docs/openspec/specs/shared-platform/spec"
          >
            共有platform仕様を開く
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/openspec/specs/profile-common/spec"
          >
            profile仕様を開く
          </Link>
        </p>
      </main>
    </Layout>
  );
}
