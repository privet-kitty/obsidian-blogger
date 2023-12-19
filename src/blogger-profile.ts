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
   * XML-RPC path.
   */
  xmlRpcPath?: string;

  /**
   * Blogger username.
   */
  username?: string;

  /**
   * Blogger password.
   */
  password?: string;

  /**
   * Blogger blog ID.
   */
  blogId?: string;

  /**
   * Encrypted password which will be saved locally.
   */
  encryptedPassword?: {
    encrypted: string;
    key?: string;
    vector?: string;
  };

  /**
   * OAuth2 token for Google
   */
  googleOAuth2Token?: InternalOAuth2Token;

  /**
   * Save username to local data.
   */
  saveUsername: boolean;

  /**
   * Save user password to local data.
   */
  savePassword: boolean;

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
  } else {
    if (profile.saveUsername) {
      desc += ` / 🆔 ${profile.username}`;
    }
    if (profile.savePassword) {
      desc += ' / 🔒 ******';
    }
  }
  return new Setting(container).setName(name).setDesc(desc);
}
