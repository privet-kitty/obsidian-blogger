import { generateQueryString, openWithBrowser } from './utils';
import { requestUrl } from 'obsidian';
import { BloggerClientResult, BloggerClientReturnCode } from './wp-client';
import BloggerPlugin from './main';
import {
  WP_OAUTH2_AUTHORIZE_ENDPOINT,
  WP_OAUTH2_CLIENT_ID,
  WP_OAUTH2_CLIENT_SECRET,
  WP_OAUTH2_TOKEN_ENDPOINT,
  WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT,
} from './consts';
import { Brand } from './types';

export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
}

export interface BloggerOAuth2Token extends OAuth2Token {
  expiresIn: number;
  refreshToken: string;
  scope: string;
}

export interface InternalOAuth2Token extends BloggerOAuth2Token {
  expiresAt: number;
}

export type FreshInternalOAuth2Token = Brand<InternalOAuth2Token, 'FreshInternalOAuth2Token'>;

const isFreshInternalOAuth2Token = (
  token: InternalOAuth2Token,
): token is FreshInternalOAuth2Token => {
  return token.expiresAt > Date.now();
};

export interface GetAuthorizeCodeParams {
  redirectUri: string;
  scope?: string[];
  blog?: string;
  codeVerifier: string;
  state?: string;
}

export interface GetTokenParams {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}

export interface RefreshTokenParams {
  client_id: string;
  client_secret: string;
  refresh_token: string;
}

export interface ValidateTokenParams {
  token: string;
}

export interface OAuth2Options {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  authorizeEndpoint: string;
  validateTokenEndpoint?: string;
}

export class OAuth2Client {
  static getWpOAuth2Client(plugin: BloggerPlugin): OAuth2Client {
    return new OAuth2Client(
      {
        clientId: WP_OAUTH2_CLIENT_ID,
        clientSecret: WP_OAUTH2_CLIENT_SECRET,
        tokenEndpoint: WP_OAUTH2_TOKEN_ENDPOINT,
        authorizeEndpoint: WP_OAUTH2_AUTHORIZE_ENDPOINT,
        validateTokenEndpoint: WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT,
      },
      plugin,
    );
  }

  constructor(private readonly options: OAuth2Options, private readonly plugin: BloggerPlugin) {
    console.log(options);
  }

  async getAuthorizeCode(params: GetAuthorizeCodeParams): Promise<void> {
    const query: {
      client_id: string;
      response_type: 'code';
      redirect_uri: string;
      code_challenge_method?: 'plain' | 'S256';
      code_challenge?: string;
      blog?: string;
      scope?: string;
      state?: string;
    } = {
      client_id: this.options.clientId,
      response_type: 'code',
      redirect_uri: params.redirectUri,
      blog: params.blog,
      scope: undefined,
      state: params.state,
    };
    if (params.scope) {
      query.scope = params.scope.join(' ');
    }
    if (params.codeVerifier) {
      const codeChallenge = await getCodeChallenge(params.codeVerifier);
      query.code_challenge_method = codeChallenge?.[0];
      query.code_challenge = codeChallenge?.[1];
    }
    openWithBrowser(this.options.authorizeEndpoint, query);
  }

  async getToken(params: GetTokenParams): Promise<FreshInternalOAuth2Token> {
    const body: {
      grant_type: 'authorization_code';
      client_id: string;
      client_secret: string;
      code: string;
      redirect_uri: string;
      code_verifier: string;
    } = {
      grant_type: 'authorization_code',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    };
    const requestTime = Date.now();
    const response = await requestUrl({
      url: this.options.tokenEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'obsidian.md',
      },
      body: generateQueryString(body),
    });
    const resp = response.json;
    const expiresIn = Number(resp.expires_in);
    const expiresAt = requestTime + Math.max(0, expiresIn - 60) * 1000;
    const res = {
      accessToken: resp.access_token,
      tokenType: resp.token_type,
      expiresIn,
      expiresAt,
      refreshToken: resp.refresh_token,
      scope: resp.scope,
    };
    if (!isFreshInternalOAuth2Token(res)) {
      throw new Error(this.plugin.i18n.t('error_invalidWpComToken'));
    }
    return res;
  }

  async refreshToken(params: RefreshTokenParams): Promise<FreshInternalOAuth2Token> {
    const body: {
      grant_type: 'refresh_token';
      client_id: string;
      client_secret: string;
      refresh_token: string;
    } = {
      grant_type: 'refresh_token',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      refresh_token: params.refresh_token,
    };
    const requestTime = Date.now();
    const response = await requestUrl({
      url: this.options.tokenEndpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'obsidian.md',
      },
      body: generateQueryString(body),
    });
    const resp = response.json;
    const expiresIn = Number(resp.expires_in);
    const expiresAt = requestTime + Math.max(0, expiresIn - 60) * 1000;
    const res = {
      accessToken: resp.access_token,
      tokenType: resp.token_type,
      expiresIn,
      expiresAt,
      refreshToken: resp.refresh_token,
      scope: resp.scope,
    };
    if (!isFreshInternalOAuth2Token(res)) {
      throw new Error(this.plugin.i18n.t('error_invalidWpComToken'));
    }
    return res;
  }

  async ensureFreshToken(token: InternalOAuth2Token): Promise<FreshInternalOAuth2Token> {
    if (isFreshInternalOAuth2Token(token)) {
      return token;
    } else {
      return this.refreshToken({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: token.refreshToken,
      }) as Promise<FreshInternalOAuth2Token>;
    }
  }

  async validateToken(params: ValidateTokenParams): Promise<BloggerClientResult<string>> {
    if (!this.options.validateTokenEndpoint) {
      throw new Error('No validate token endpoint set.');
    }
    try {
      const response = await requestUrl({
        url: `${this.options.validateTokenEndpoint}?access_token=${params.token}`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'obsidian.md',
        },
      });
      console.log('validateToken response', response);
      return {
        code: BloggerClientReturnCode.OK,
        data: 'done',
        response,
      };
    } catch (error) {
      return {
        code: BloggerClientReturnCode.Error,
        error: {
          code: BloggerClientReturnCode.Error,
          message: this.plugin.i18n.t('error_invalidWpComToken'),
        },
        response: error,
      };
    }
  }
}

export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return base64Url(arr);
}

async function getCodeChallenge(codeVerifier: string): Promise<['plain' | 'S256', string]> {
  return ['S256', base64Url(await crypto.subtle.digest('SHA-256', stringToBuffer(codeVerifier)))];
}

function stringToBuffer(input: string): ArrayBuffer {
  const buf = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    buf[i] = input.charCodeAt(i) & 0xff;
  }
  return buf;
}

function base64Url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
