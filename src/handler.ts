import { addDefaultHeaders, changeUrl } from './util';
import { handleBuildsRequest } from './builds';
import { handleCodebrowserRequest } from './codebrowser';
import { handleDocsRequest } from './docs';
import { handleFaviconRequest } from './favicon';
import { handleLearnRequest } from './learn';
import { handlePackagesRequest } from './packages';
import { handlePresentationsRequest } from './presentations';
import { handleRepoRequest } from './repo';
import { handleInstallScriptRequest } from './install-script';
import { handlePantheonRequest } from './pantheon';
import { handleGitHubRequest } from './github';
import config from './config';

/// Special handlers for all the domains except the main domain "clickhouse.com".
const hostname_mapping = new Map([
  ['builds.clickhouse.com', handleBuildsRequest],
  ['repo.clickhouse.com', handleRepoRequest],
  ['repo.clickhouse.tech', handleRepoRequest],
  ['packages.clickhouse.com', handlePackagesRequest],
  ['staging.clickhouse.com', handlePantheonRequest],
]);

/// Prefixes for paths on the main domain "clickhouse.com".
/// Map data type in TypeScript is unordered, so we cannot use it.
const prefix_mapping = [

  /// This is being used by the "benchmark" page, should be later moved away from the "docs" directory.
  ['/docs/css/', handleGitHubRequest],
  ['/docs/js/', handleGitHubRequest],
  ['/docs/images/', handleGitHubRequest],

  /// This is being used by the new Docs on Docusaurus, see the preview at https://docs-content.clickhouse.tech/
  /// We proxy it on https://clickhouse.com/docs/ for convenience.
  ['/docs', handleDocsRequest],

  ['/codebrowser', handleCodebrowserRequest],
  ['/favicon/', handleFaviconRequest],
  ['/presentations/', handlePresentationsRequest],
  ['/learn', handleLearnRequest],
  ['/benchmark', handleGitHubRequest],
  ['/js', handleGitHubRequest],
  ['/css', handleGitHubRequest],
  ['/fonts', handleGitHubRequest],
  ['/data', handleGitHubRequest],
];

export async function handleRequest(request: Request): Promise<Response> {
  let url = new URL(request.url);

  const hostname_handler = hostname_mapping.get(url.hostname);
  if (hostname_handler) {
    return hostname_handler(request);
  }

  for (const [prefix, prefix_handler] of prefix_mapping) {
    if (url.pathname.startsWith(prefix)) {
      return prefix_handler(request);
    }
  }
  
  /// curl https://clickhouse.com/ will output an install script. Note: HTTP2 has headers in lowercase.
  /// This is the most important part of our website, because it allows users to install ClickHouse.
  const user_agent = request.headers.get('User-Agent') || request.headers.get('user-agent') || '';

  if (url.pathname === '/' && user_agent.startsWith('curl/')) {
    return handleInstallScriptRequest(request);
  }

  /// This is the temporary website by external developers. It covers everything that is not covered by special handlers above.
  return handlePantheonRequest(request, config.production)
}
