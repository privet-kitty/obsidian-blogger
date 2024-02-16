import { randomUUID } from 'crypto';
import { GOOGLE_OAUTH2_REDIRECT_URI } from './consts';
import { getGlobalI18n } from './i18n';
import { FreshInternalOAuth2Token, OAuth2Client, generateCodeVerifier } from './oauth2-client';
import { createServer } from 'http';

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
  params: { [key: string]: string },
  codeVerifier: string,
  port: number,
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void,
  oauth2Client: OAuth2Client,
): Promise<void> => {
  if (params.error) {
    setGoogleOAuth2Token(undefined);
    throw new Error(
      getGlobalI18n().t('error_googleAuthFailed', {
        error: params.error,
        desc: params.error_description?.replace(/\+/g, ' ') ?? '<no error description>',
      }),
    );
  } else if (params.code) {
    const token = await oauth2Client.getToken({
      code: params.code,
      redirectUri: `${GOOGLE_OAUTH2_REDIRECT_URI}:${port}`,
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

export const reauthorizeGoogleToken = async (
  oauth2Client: OAuth2Client,
  blogEndpoint: string,
  setGoogleOAuth2Token: (token?: FreshInternalOAuth2Token) => void,
): Promise<void> => {
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
      const url = new URL(req.url!, GOOGLE_OAUTH2_REDIRECT_URI);
      if (url.pathname === '/') {
        const response_state = url.searchParams.get('state');
        if (state !== response_state) {
          closeWithMessage(
            getGlobalI18n().t('server_googleOAuth2StateMismatch', {
              req: state,
              res: String(response_state),
            }),
          );
        }
        await fetchAndRegisterToken(
          Object.fromEntries(url.searchParams),
          codeVerifier,
          getListeningPort(server),
          setGoogleOAuth2Token,
          oauth2Client,
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
    redirectUri: `${GOOGLE_OAUTH2_REDIRECT_URI}:${getListeningPort(server)}`,
    scope: ['https://www.googleapis.com/auth/blogger'],
    blog: blogEndpoint,
    codeVerifier,
    state,
  });
};
