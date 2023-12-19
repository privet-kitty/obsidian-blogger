import BloggerPlugin from './main';
import { BloggerRestClient, BloggerRestClientGoogleOAuth2Context } from './blogger-rest-client';
import { BloggerClient } from './blogger-client';
import { BloggerProfile } from './blogger-profile';
import { showError } from './utils';

export function getBloggerClient(
  plugin: BloggerPlugin,
  profile: BloggerProfile,
): BloggerClient | null {
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
  return new BloggerRestClient(
    plugin,
    profile,
    new BloggerRestClientGoogleOAuth2Context(profile.blogId, profile.googleOAuth2Token.accessToken),
  );
}
