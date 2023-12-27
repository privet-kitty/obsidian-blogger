import { App, Modal, Notice, Setting, requestUrl } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';
import { BloggerProfile } from './blogger-profile';
import { BLOGGER_API_ENDPOINT, GOOGLE_OAUTH2_REDIRECT_URI } from './consts';
import { FreshInternalOAuth2Token, generateCodeVerifier, OAuth2Client } from './oauth2-client';
import { generateQueryString, isValidBloggerUrl, showError } from './utils';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

export function openProfileModal(
  app: App,
  profile: Partial<BloggerProfile>,
  atIndex = -1,
): Promise<{ profile: BloggerProfile; atIndex?: number }> {
  return new Promise((resolve, reject) => {
    const modal = new BloggerProfileModal(
      app,
      (profile, atIndex) => {
        resolve({
          profile,
          atIndex,
        });
      },
      profile,
      atIndex,
    );
    modal.open();
  });
}

const getListeningPort = (server: ReturnType<typeof createServer>): number => {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error(
      getGlobalI18n().t('error_localServerAddressNotAvailable', { address: String(address) }),
    );
  }
  return address.port;
};

// TODO: integrate this into blogger-rest-client.ts
const fetchBlogId = async (
  blogEndpoint: string,
  token: FreshInternalOAuth2Token,
): Promise<string> => {
  const blogIdEndpoint = `${BLOGGER_API_ENDPOINT}/byurl?${generateQueryString({
    url: blogEndpoint,
  })}`;
  console.log('REST GET', blogIdEndpoint);
  const response = await requestUrl({
    url: blogIdEndpoint,
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'obsidian.md',
      authorization: `Bearer ${token.accessToken}`,
    },
  });
  console.log('GET response', response);
  return response.json.id;
};

/**
 * Blogger profile modal.
 */
class BloggerProfileModal extends Modal {
  private readonly profileData: Partial<BloggerProfile>;

  constructor(
    readonly app: App,
    private readonly onSubmit: (profile: BloggerProfile, atIndex?: number) => void,
    profile: Partial<BloggerProfile>,
    private readonly atIndex: number = -1,
  ) {
    super(app);

    this.profileData = Object.assign({}, profile);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const renderProfile = () => {
      content.empty();

      new Setting(content)
        .setName(t('profileModal_name'))
        .setDesc(t('profileModal_nameDesc'))
        .addText((text) =>
          text
            .setPlaceholder('Profile name')
            .setValue(this.profileData.name ?? '')
            .onChange((value) => {
              this.profileData.name = value;
            }),
        );
      new Setting(content)
        .setName(t('settings_url'))
        .setDesc(t('settings_urlDesc'))
        .addText((text) =>
          text
            .setPlaceholder(t('settings_urlPlaceholder'))
            .setValue(this.profileData.endpoint ?? '')
            .onChange((value) => {
              if (this.profileData.endpoint !== value) {
                this.profileData.endpoint = value;
              }
            }),
        );
      new Setting(content)
        .setName(t('settings_googleOAuth2AuthorizeToken'))
        .setDesc(t('settings_googleOAuth2AuthorizeTokenDesc'))
        .addButton((button) => {
          const buttonText = this.profileData.googleOAuth2Token
            ? t('settings_googleOAuth2ReauthorizeTokenButtonText')
            : t('settings_googleOAuth2AuthorizeTokenButtonText');
          button.setButtonText(buttonText).onClick(async () => {
            await this.reauthorizeGoogleToken();
          });
        })
        .addButton((button) => {
          button.setButtonText(t('settings_googleOAuth2ValidateTokenButtonText')).onClick(() => {
            if (this.profileData.googleOAuth2Token) {
              OAuth2Client.getGoogleOAuth2Client()
                .validateToken({
                  token: this.profileData.googleOAuth2Token.accessToken,
                })
                .then(() => {
                  new Notice(t('message_googleTokenValidated'));
                })
                .catch((e) => {
                  showError(e);
                });
            }
          });
        });
      new Setting(content).setName(t('profileModal_setDefault')).addToggle((toggle) =>
        toggle.setValue(this.profileData.isDefault ?? false).onChange((value) => {
          this.profileData.isDefault = value;
        }),
      );
      new Setting(content).addButton((button) =>
        button
          .setButtonText(t('profileModal_Save'))
          .setCta()
          .onClick(async () => {
            try {
              const fullProfile = await this.createFullProfile();
              this.onSubmit(fullProfile, this.atIndex);
              this.close();
            } catch (e) {
              showError(e);
            }
          }),
      );
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profileModal_title') });

    const content = contentEl.createEl('div');
    renderProfile();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private createFullProfile = async (): Promise<BloggerProfile> => {
    const name = this.profileData.name;
    if (name === undefined || name.length === 0) {
      throw new Error(getGlobalI18n().t('error_noProfileName'));
    }
    const endpoint = this.profileData.endpoint;
    if (endpoint === undefined || !isValidBloggerUrl(endpoint)) {
      throw new Error(getGlobalI18n().t('error_notGoogle'));
    }
    const googleOAuth2Token = this.profileData.googleOAuth2Token;
    if (googleOAuth2Token === undefined) {
      throw new Error(getGlobalI18n().t('error_invalidGoogleToken'));
    }
    const fresh_token = await OAuth2Client.getGoogleOAuth2Client().ensureFreshToken(
      googleOAuth2Token,
    );
    const blogId = await fetchBlogId(endpoint, fresh_token);
    const isDefault = this.profileData.isDefault ?? false;
    return { name, endpoint, blogId, googleOAuth2Token, isDefault };
  };

  private fetchAndRegisterToken = async (
    params: { [key: string]: string },
    codeVerifier: string,
    port: number,
  ): Promise<void> => {
    if (params.error) {
      this.profileData.googleOAuth2Token = undefined;
      throw new Error(
        getGlobalI18n().t('error_googleAuthFailed', {
          error: params.error,
          desc: params.error_description?.replace(/\+/g, ' ') ?? '<no error description>',
        }),
      );
    } else if (params.code) {
      const token = await OAuth2Client.getGoogleOAuth2Client().getToken({
        code: params.code,
        redirectUri: `${GOOGLE_OAUTH2_REDIRECT_URI}:${port}`,
        codeVerifier,
      });
      console.log(token);
      this.profileData.googleOAuth2Token = token;
    } else {
      this.profileData.googleOAuth2Token = undefined;
      throw new Error(
        getGlobalI18n().t('server_googleOAuth2InvalidResponse', {
          response: JSON.stringify(params),
        }),
      );
    }
  };

  private reauthorizeGoogleToken = async (): Promise<void> => {
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
          await this.fetchAndRegisterToken(
            Object.fromEntries(url.searchParams),
            codeVerifier,
            getListeningPort(server),
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

    await OAuth2Client.getGoogleOAuth2Client().getAuthorizeCode({
      redirectUri: `${GOOGLE_OAUTH2_REDIRECT_URI}:${getListeningPort(server)}`,
      scope: ['https://www.googleapis.com/auth/blogger'],
      blog: this.profileData.endpoint,
      codeVerifier,
      state,
    });
  };
}
