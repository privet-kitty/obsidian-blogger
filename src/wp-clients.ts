import WordpressPlugin from './main';
import { WpRestClient, WpRestClientWpComOAuth2Context } from './wp-rest-client';
import { WordPressClient } from './wp-client';
import { WpProfile } from './wp-profile';
import { ApiType } from './plugin-settings';
import { showError } from './utils';

export function getWordPressClient(
  plugin: WordpressPlugin,
  profile: WpProfile,
): WordPressClient | null {
  if (!profile.endpoint || profile.endpoint.length === 0) {
    showError(plugin.i18n.t('error_noEndpoint'));
    return null;
  }
  let client: WordPressClient | null = null;
  switch (profile.apiType) {
    case ApiType.RestApi_WpComOAuth2:
      if (profile.wpComOAuth2Token) {
        client = new WpRestClient(
          plugin,
          profile,
          new WpRestClientWpComOAuth2Context(
            profile.wpComOAuth2Token.blogId,
            profile.wpComOAuth2Token.accessToken,
          ),
        );
      } else {
        showError(plugin.i18n.t('error_invalidWpComToken'));
      }
      break;
    default:
      client = null;
      break;
  }
  return client;
}
