import { randomUUID } from 'crypto';
import {
  BLOGGER_OAUTH2_SCOPE,
  BLOGGER_OAUTH2_URL_ACTION,
  GOOGLE_OAUTH2_REDIRECT_URI_LOCAL,
  GOOGLE_OAUTH2_REDIRECT_URI_WEB,
} from './consts';
import { getGlobalI18n } from './i18n';
import { FreshInternalOAuth2Token, OAuth2Client, generateCodeVerifier } from './oauth2-client';
import { createServer } from 'http';
import { ObsidianProtocolHandler } from 'obsidian';

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
  oauth2Client: OAuth2Client,
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
    const token = await oauth2Client.getToken({
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

type reauthorizeGoogleTokenDesktopParams = {
  isDesktop: true;
  oauth2Client: OAuth2Client;
  blogEndpoint: string;
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void;
};

type reauthorizeGoogleTokenMobileParams = {
  isDesktop: false;
  oauth2Client: OAuth2Client;
  blogEndpoint: string;
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void;
  registerObsidianProtocolHandler: (
    action: string,
    protocolHandler: ObsidianProtocolHandler,
  ) => void;
};

type reauthorizeGoogleTokenParams =
  | reauthorizeGoogleTokenDesktopParams
  | reauthorizeGoogleTokenMobileParams;

export const reauthorizeGoogleToken = async (
  params: reauthorizeGoogleTokenParams,
): Promise<void> => {
  if (params.isDesktop) {
    await reauthorizeGoogleTokenOnLocalHost(params);
  } else {
    await reauthorizeGoogleTokenOnWeb(params);
  }
};

const reauthorizeGoogleTokenOnWeb = async ({
  oauth2Client,
  blogEndpoint,
  setGoogleOAuth2Token,
  registerObsidianProtocolHandler,
}: reauthorizeGoogleTokenMobileParams): Promise<void> => {
  const codeVerifier = generateCodeVerifier();
  const state = randomUUID();

  oauth2Client.getAuthorizeCode({
    redirectUri: GOOGLE_OAUTH2_REDIRECT_URI_WEB,
    scope: [BLOGGER_OAUTH2_SCOPE],
    blog: blogEndpoint,
    codeVerifier,
    state,
  });
  // FIXME: I found no way to unregister a protocol handler.
  let already_called = false;
  registerObsidianProtocolHandler(BLOGGER_OAUTH2_URL_ACTION, async (e) => {
    if (already_called) return;
    already_called = true;
    if (e.action === BLOGGER_OAUTH2_URL_ACTION) {
      const params: { [key: string]: string } = { ...e };
      delete params.action;
      await fetchAndRegisterToken(
        oauth2Client,
        params,
        state,
        codeVerifier,
        GOOGLE_OAUTH2_REDIRECT_URI_WEB,
        setGoogleOAuth2Token,
      );
    }
  });
};

export const reauthorizeGoogleTokenOnLocalHost = async ({
  oauth2Client,
  blogEndpoint,
  setGoogleOAuth2Token,
}: reauthorizeGoogleTokenDesktopParams): Promise<void> => {
  const codeVerifier = generateCodeVerifier();
  const state = randomUUID();

  const server = createServer();
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
          oauth2Client,
          Object.fromEntries(url.searchParams),
          state,
          codeVerifier,
          `${GOOGLE_OAUTH2_REDIRECT_URI_LOCAL}:${getListeningPort(server)}`,
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
  server.listen(0);

  oauth2Client.getAuthorizeCode({
    redirectUri: `${GOOGLE_OAUTH2_REDIRECT_URI_LOCAL}:${getListeningPort(server)}`,
    scope: [BLOGGER_OAUTH2_SCOPE],
    blog: blogEndpoint,
    codeVerifier,
    state,
  });
};
