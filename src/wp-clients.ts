import BloggerPlugin from './main';
import { WpRestClient, WpRestClientGoogleOAuth2Context } from './wp-rest-client';
import { BloggerClient } from './wp-client';
import { WpProfile } from './wp-profile';
import { showError } from './utils';

export function getBloggerClient(plugin: BloggerPlugin, profile: WpProfile): BloggerClient | null {
  if (!profile.endpoint || profile.endpoint.length === 0) {
    showError(plugin.i18n.t('error_noEndpoint'));
    return null;
  }
  if (!profile.googleOAuth2Token) {
    showError(plugin.i18n.t('error_invalidGoogleToken'));
    return null;
  }
  if (!profile.blogId) {
    showError(plugin.i18n.t('error_noBlogId'));
    return null;
  }
  return new WpRestClient(
    plugin,
    profile,
    new WpRestClientGoogleOAuth2Context(profile.blogId, profile.googleOAuth2Token.accessToken),
  );
}
