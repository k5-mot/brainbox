const { chromium } = require('playwright');

const cloudflareOsUrl = process.env.CLOUDFLARE_OS_URL;

/**
 * 非secure origin上でもCloudflare OSがUUID v4を生成できることを検証する。
 *
 * @returns {Promise<void>} UUID v4を生成できた場合に解決するPromise。
 * @throws {Error} URL未指定、画面到達失敗、またはUUID生成失敗時に送出する。
 */
async function main() {
  if (!cloudflareOsUrl) throw new Error('CLOUDFLARE_OS_URL is required');

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(cloudflareOsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const result = await page.evaluate(`(() => {
      try {
        return { secureContext: window.isSecureContext, uuid: crypto.randomUUID(), error: null };
      } catch (error) {
        return { secureContext: window.isSecureContext, uuid: null, error: String(error) };
      }
    })()`);
    console.log(JSON.stringify(result));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result.uuid ?? '')) {
      throw new Error(result.error ?? 'UUID v4を生成できませんでした。');
    }
  } finally {
    await browser.close();
  }
}

/**
 * 検証失敗を標準エラーへ表示してprocessを失敗終了させる。
 *
 * @param {unknown} error 発生した例外。
 * @returns {void}
 */
function reportError(error) {
  console.error(error);
  process.exitCode = 1;
}

main().catch(reportError);
