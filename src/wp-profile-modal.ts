import { Modal, Notice, Setting, requestUrl } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';
import { WpProfile } from './wp-profile';
import { BLOGGER_API_ENDPOINT, WP_OAUTH2_REDIRECT_URI } from './consts';
import { WordPressClientReturnCode } from './wp-client';
import {
  FreshInternalOAuth2Token,
  generateCodeVerifier,
  InternalOAuth2Token,
  OAuth2Client,
} from './oauth2-client';
import { generateQueryString, isValidUrl, showError } from './utils';
import { ApiType } from './plugin-settings';
import { createServer } from 'http';
import { randomUUID } from 'crypto';

export function openProfileModal(
  plugin: WordpressPlugin,
  profile: WpProfile = {
    name: '',
    apiType: ApiType.RestApi_WpComOAuth2,
    endpoint: '',
    xmlRpcPath: '/xmlrpc.php',
    saveUsername: false,
    savePassword: false,
    isDefault: false,
    lastSelectedCategories: [1],
  },
  atIndex = -1,
): Promise<{ profile: WpProfile; atIndex?: number }> {
  return new Promise((resolve, reject) => {
    const modal = new WpProfileModal(
      plugin,
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
    throw new Error(`Failed to get local server port: ${address}`);
  }
  return address.port;
};

/**
 * WordPress profile modal.
 */
class WpProfileModal extends Modal {
  private readonly profileData: WpProfile;

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly onSubmit: (profile: WpProfile, atIndex?: number) => void,
    profile: WpProfile = {
      name: '',
      apiType: ApiType.RestApi_WpComOAuth2,
      endpoint: '',
      xmlRpcPath: '/xmlrpc.php',
      saveUsername: false,
      savePassword: false,
      isDefault: false,
      lastSelectedCategories: [1],
    },
    private readonly atIndex: number = -1,
  ) {
    super(plugin.app);

    this.profileData = Object.assign({}, profile);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
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
            .setValue(this.profileData.endpoint)
            .onChange((value) => {
              if (this.profileData.endpoint !== value) {
                this.profileData.endpoint = value;
              }
            }),
        );
      new Setting(content)
        .setName(t('settings_wpComOAuth2AuthorizeToken'))
        .setDesc(t('settings_wpComOAuth2AuthorizeTokenDesc'))
        .addButton((button) => {
          const buttonText = this.profileData.wpComOAuth2Token
            ? t('settings_wpComOAuth2ReauthorizeTokenButtonText')
            : t('settings_wpComOAuth2AuthorizeTokenButtonText');
          button.setButtonText(buttonText).onClick(async () => {
            await this.reauthorizeWpComToken();
          });
        })
        .addButton((button) => {
          button.setButtonText(t('settings_wpComOAuth2ValidateTokenButtonText')).onClick(() => {
            if (this.profileData.wpComOAuth2Token) {
              OAuth2Client.getWpOAuth2Client(this.plugin)
                .validateToken({
                  token: this.profileData.wpComOAuth2Token.accessToken,
                })
                .then((result) => {
                  if (result.code === WordPressClientReturnCode.Error) {
                    showError(result.error?.message + '');
                  } else {
                    new Notice(t('message_wpComTokenValidated'));
                  }
                });
            }
          });
        });
      const blogIdSetting = new Setting(content)
        .setName(t('settings_blogId'))
        .setDesc(`blogId: ${this.profileData.blogId || '<unknown>'}`)
        .addButton((button) =>
          button.setButtonText(t('settings_fetchBlogIdButtonText')).onClick(async () => {
            if (!/^https:\/\/\w+\.blogspot\.com\/?$/.test(this.profileData.endpoint)) {
              showError(t('error_notWpCom'));
              this.profileData.blogId = undefined;
            } else if (!this.profileData.wpComOAuth2Token) {
              showError(t('error_invalidWpComToken'));
              this.profileData.blogId = undefined;
            } else {
              const fresh_token = await OAuth2Client.getWpOAuth2Client(
                this.plugin,
              ).ensureFreshToken(this.profileData.wpComOAuth2Token);
              this.profileData.blogId = await this.fetchBlogId(
                this.profileData.endpoint,
                fresh_token,
              ).catch((e) => {
                showError(e);
                return undefined;
              });
            }
            blogIdSetting.setDesc(`blogId: ${this.profileData.blogId || '<unknown>'}`);
          }),
        );

      new Setting(content).setName(t('profileModal_setDefault')).addToggle((toggle) =>
        toggle.setValue(this.profileData.isDefault).onChange((value) => {
          this.profileData.isDefault = value;
        }),
      );

      new Setting(content).addButton((button) =>
        button
          .setButtonText(t('profileModal_Save'))
          .setCta()
          .onClick(() => {
            if (!isValidUrl(this.profileData.endpoint)) {
              showError(t('error_invalidUrl'));
            } else if (this.profileData.name.length === 0) {
              showError(t('error_noProfileName'));
            } else if (this.profileData.saveUsername && !this.profileData.username) {
              showError(t('error_noUsername'));
            } else if (this.profileData.savePassword && !this.profileData.password) {
              showError(t('error_noPassword'));
            } else {
              this.onSubmit(this.profileData, this.atIndex);
              this.close();
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

  // TODO: integrate this into wp-rest-client.ts
  private async fetchBlogId(
    blogEndpoint: string,
    token: FreshInternalOAuth2Token,
  ): Promise<string> {
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
  }

  private async registerToken(token?: InternalOAuth2Token): Promise<void> {
    this.profileData.wpComOAuth2Token = token;
    if (this.atIndex >= 0) {
      // if token is undefined, just remove it
      this.plugin.settings.profiles[this.atIndex].wpComOAuth2Token = token;
      await this.plugin.saveSettings();
    }
  }

  private async getAndRegisterToken(
    params: { [key: string]: string },
    codeVerifier: string,
    port: number,
  ): Promise<void> {
    if (params.error) {
      this.registerToken(undefined);
      throw new Error(
        this.plugin.i18n.t('error_wpComAuthFailed', {
          error: params.error,
          desc: params.error_description?.replace(/\+/g, ' ') ?? '<no error description>',
        }),
      );
    } else if (params.code) {
      const token = await OAuth2Client.getWpOAuth2Client(this.plugin).getToken({
        code: params.code,
        redirectUri: `${WP_OAUTH2_REDIRECT_URI}:${port}`,
        codeVerifier,
      });
      console.log(token);
      this.registerToken(token);
    } else {
      this.registerToken(undefined);
      throw new Error(
        this.plugin.i18n.t('server_wpComOAuth2InvalidResponse', {
          response: JSON.stringify(params),
        }),
      );
    }
  }

  private async reauthorizeWpComToken(): Promise<void> {
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
  <title>WordPress OAuth2</title>
</head>
<body>
  <h1>WordPress OAuth2</h1>
  <p>${message}</p>
</body>
</html>`);
        server.close();
      };

      // Exceptions should be displayed in the browser whenever possible.
      try {
        // Request.url cannot be undefined. See https://stackoverflow.com/questions/58377623/request-url-undefined-type-why.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = new URL(req.url!, WP_OAUTH2_REDIRECT_URI);
        if (url.pathname === '/') {
          const response_state = url.searchParams.get('state');
          if (state !== response_state) {
            closeWithMessage(
              this.plugin.i18n.t('server_wpComOAuth2StateMismatch', {
                req: state,
                res: String(response_state),
              }),
            );
          }
          await this.getAndRegisterToken(
            Object.fromEntries(url.searchParams),
            codeVerifier,
            getListeningPort(server),
          );
          closeWithMessage(this.plugin.i18n.t('server_wpComOAuth2TokenObtained'));
        }
      } catch (e) {
        closeWithMessage(
          this.plugin.i18n.t('server_wpComOAuth2ServerError', {
            error: JSON.stringify(e),
          }),
        );
      }
    });
    server.listen(0);

    await OAuth2Client.getWpOAuth2Client(this.plugin).getAuthorizeCode({
      redirectUri: `${WP_OAUTH2_REDIRECT_URI}:${getListeningPort(server)}`,
      scope: ['https://www.googleapis.com/auth/blogger'],
      blog: this.profileData.endpoint,
      codeVerifier,
      state,
    });
  }
}
