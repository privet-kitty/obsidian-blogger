import { Setting } from 'obsidian';
import { InternalOAuth2Token } from './oauth2-client';

export interface BloggerProfile {
  /**
   * Profile name.
   */
  name: string;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * Blogger blog ID.
   */
  blogId?: string;

  /**
   * OAuth2 token for Google
   */
  googleOAuth2Token?: InternalOAuth2Token;

  /**
   * Is default profile.
   */
  isDefault: boolean;
}

export function rendererProfile(profile: BloggerProfile, container: HTMLElement): Setting {
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }
  let desc = profile.endpoint;
  if (profile.googleOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  }
  return new Setting(container).setName(name).setDesc(desc);
}
