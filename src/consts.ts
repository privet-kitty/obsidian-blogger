export const ERROR_NOTICE_TIMEOUT = 15000;

export const WP_OAUTH2_CLIENT_ID = '635472657074-cg7b8f38s51i89bqiqq5co7uhrcalmoc.apps.googleusercontent.com';
export const WP_OAUTH2_CLIENT_SECRET = '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';
export const WP_OAUTH2_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token';
export const WP_OAUTH2_AUTHORIZE_ENDPOINT = 'https://www.googleapis.com/auth/blogger';
export const WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT = 'https://public-api.wordpress.com/oauth2/token-info';
export const WP_OAUTH2_URL_ACTION = 'wordpress-plugin-oauth';
export const WP_OAUTH2_REDIRECT_URI = `obsidian://${WP_OAUTH2_URL_ACTION}`;

export const WP_DEFAULT_PROFILE_NAME = 'Default';

export const enum EventType {
  OAUTH2_TOKEN_GOT = 'OAUTH2_TOKEN_GOT',
}
