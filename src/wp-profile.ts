import { InternalOAuth2Token } from './oauth2-client';
import { ApiType } from './plugin-settings';

export interface WpProfile {
  /**
   * Profile name.
   */
  name: string;

  /**
   * API type.
   */
  apiType: ApiType;

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
  wpComOAuth2Token?: InternalOAuth2Token;

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

  /**
   * Last selected post categories.
   */
  lastSelectedCategories: number[];
}
