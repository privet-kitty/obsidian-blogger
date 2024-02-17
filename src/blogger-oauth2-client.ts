import {
  BLOGGER_OAUTH2_SCOPE,
  BLOGGER_OAUTH2_URL_ACTION,
  GOOGLE_OAUTH2_REDIRECT_URI_LOCAL,
  GOOGLE_OAUTH2_REDIRECT_URI_WEB,
} from './consts';
import { getGlobalI18n } from './i18n';
import { FreshInternalOAuth2Token, OAuth2Client, generateCodeVerifier } from './oauth2-client';
import { createServer } from 'http';
import { Notice, Plugin } from 'obsidian';

const getListeningPort = (server: ReturnType<typeof createServer>): number => {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error(
      getGlobalI18n().t('error_localServerAddressNotAvailable', { address: String(address) }),
    );
  }
  return address.port;
};

const fetchAndRegisterToken = async (
  oAuth2Client: OAuth2Client,
  params: { [key: string]: string },
  requestState: string,
  codeVerifier: string,
  redirectUri: string,
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void,
): Promise<void> => {
  if (params.error) {
    setGoogleOAuth2Token(undefined);
    throw new Error(
      getGlobalI18n().t('error_googleAuthFailed', {
        error: params.error,
        desc: params.error_description?.replace(/\+/g, ' ') ?? '<no error description>',
      }),
    );
  }
  if (requestState !== params.state) {
    throw new Error(
      getGlobalI18n().t('error_googleOAuth2StateMismatch', {
        req: requestState,
        res: String(params.state),
      }),
    );
  }
  if (params.code) {
    const token = await oAuth2Client.getToken({
      code: params.code,
      redirectUri: redirectUri,
      codeVerifier,
    });
    console.log(token);
    setGoogleOAuth2Token(token);
  } else {
    setGoogleOAuth2Token(undefined);
    throw new Error(
      getGlobalI18n().t('server_googleOAuth2InvalidResponse', {
        response: JSON.stringify(params),
      }),
    );
  }
};

export type reauthorizeGoogleTokenParams = {
  isDesktop: boolean;
  oAuth2Client: OAuth2Client;
  blogEndpoint: string;
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void;
};

export const reauthorizeGoogleToken = async (
  params: reauthorizeGoogleTokenParams,
): Promise<void> => {
  if (params.isDesktop) {
    await reauthorizeGoogleTokenOnLocalHost(params);
  } else {
    await reauthorizeGoogleTokenOnWeb(params);
  }
};

export class MobileOAuth2Helper {
  private static oAuth2Record: {
    oAuth2Client: OAuth2Client;
    state: string;
    codeVerifier: string;
    setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void;
  } | null = null;
  private static isSetUp = false;
  static setOAuth2Record = (oAuth2Record: (typeof MobileOAuth2Helper)['oAuth2Record']): void => {
    MobileOAuth2Helper.oAuth2Record = oAuth2Record;
  };
  static setUp(plugin: Plugin) {
    if (MobileOAuth2Helper.isSetUp) return;
    MobileOAuth2Helper.isSetUp = true;
    plugin.registerObsidianProtocolHandler(BLOGGER_OAUTH2_URL_ACTION, async (e) => {
      if (e.action === BLOGGER_OAUTH2_URL_ACTION) {
        const params: { [key: string]: string } = { ...e };
        delete params.action;
        if (MobileOAuth2Helper.oAuth2Record === null) {
          throw new Error('oAuth2Record === null');
        }
        const { oAuth2Client, state, codeVerifier, setGoogleOAuth2Token } =
          MobileOAuth2Helper.oAuth2Record;
        await fetchAndRegisterToken(
          oAuth2Client,
          params,
          state,
          codeVerifier,
          GOOGLE_OAUTH2_REDIRECT_URI_WEB,
          setGoogleOAuth2Token,
        );
        new Notice(getGlobalI18n().t('message_googleOAuth2TokenObtained'));
      }
    });
  }
}

const reauthorizeGoogleTokenOnWeb = async ({
  oAuth2Client,
  blogEndpoint,
  setGoogleOAuth2Token,
}: reauthorizeGoogleTokenParams): Promise<void> => {
  const codeVerifier = generateCodeVerifier();
  const state = crypto.randomUUID();
  MobileOAuth2Helper.setOAuth2Record({
    oAuth2Client,
    state,
    codeVerifier,
    setGoogleOAuth2Token,
  });
  oAuth2Client.getAuthorizeCode({
    redirectUri: GOOGLE_OAUTH2_REDIRECT_URI_WEB,
    scope: [BLOGGER_OAUTH2_SCOPE],
    blog: blogEndpoint,
    codeVerifier,
    state,
  });
};

export const reauthorizeGoogleTokenOnLocalHost = async ({
  oAuth2Client,
  blogEndpoint,
  setGoogleOAuth2Token,
}: reauthorizeGoogleTokenParams): Promise<void> => {
  const codeVerifier = generateCodeVerifier();
  const state = crypto.randomUUID();

  const server = createServer().listen(0);
  const redirectUri = `${GOOGLE_OAUTH2_REDIRECT_URI_LOCAL}:${getListeningPort(server)}`;
  server.on('request', async (req, res) => {
    const closeWithMessage = (message: string): void => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
      });
      res.end(`<html>
<head>
  <title>Blogger OAuth2</title>
</head>
<body>
  <h1>Blogger OAuth2</h1>
  <p>${message}</p>
</body>
</html>`);
      server.close();
    };

    // Exceptions should be displayed in the browser whenever possible.
    try {
      // Request.url cannot be undefined. See https://stackoverflow.com/questions/58377623/request-url-undefined-type-why.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const url = new URL(req.url!, GOOGLE_OAUTH2_REDIRECT_URI_LOCAL);
      if (url.pathname === '/') {
        await fetchAndRegisterToken(
          oAuth2Client,
          Object.fromEntries(url.searchParams),
          state,
          codeVerifier,
          redirectUri,
          setGoogleOAuth2Token,
        );
        closeWithMessage(getGlobalI18n().t('server_googleOAuth2TokenObtained'));
      }
    } catch (e) {
      closeWithMessage(
        getGlobalI18n().t('server_googleOAuth2ServerError', {
          error: JSON.stringify(e),
        }),
      );
    }
  });

  oAuth2Client.getAuthorizeCode({
    redirectUri: redirectUri,
    scope: [BLOGGER_OAUTH2_SCOPE],
    blog: blogEndpoint,
    codeVerifier,
    state,
  });
};
