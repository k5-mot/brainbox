const { chromium } = require('playwright');

const cloudflareOsUrl = process.env.CLOUDFLARE_OS_URL;
const keycloakUsername = process.env.KEYCLOAK_USERNAME;
const keycloakPassword = process.env.KEYCLOAK_PASSWORD;

/**
 * Cloudflare OSからKeycloak OIDCを経由してloginできることを検証する。
 *
 * @returns {Promise<void>} session tokenが発行された場合に解決するPromise。
 * @throws {Error} 必須設定不足、OIDC遷移失敗、またはlogin失敗時に送出する。
 */
async function main() {
  if (!cloudflareOsUrl || !keycloakUsername || !keycloakPassword) {
    throw new Error(
      'CLOUDFLARE_OS_URL, KEYCLOAK_USERNAME, and KEYCLOAK_PASSWORD are required',
    );
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(cloudflareOsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Continue with Keycloak' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await popup.locator('#username').fill(keycloakUsername);
    await popup.locator('#password').fill(keycloakPassword);
    await popup.locator('#kc-login').click();
    await popup.waitForEvent('close', { timeout: 30000 });

    await page.waitForFunction(
      () => Boolean(window.localStorage.getItem('authToken')),
      undefined,
      { timeout: 30000 },
    );
    const result = await page.evaluate(() => ({
      authenticated: Boolean(window.localStorage.getItem('authToken')),
      url: window.location.href,
    }));
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

/**
 * 検証失敗を標準errorへ表示してprocessを失敗終了させる。
 *
 * @param {unknown} error 発生した例外。
 * @returns {void}
 */
function reportError(error) {
  console.error(error);
  process.exitCode = 1;
}

main().catch(reportError);
