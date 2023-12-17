import { Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';
import { WpProfile } from './wp-profile';
import {
  EventType,
  WP_OAUTH2_OBSIDIAN_URI,
  WP_OAUTH2_REDIRECT_URI,
} from './consts';
import { WordPressClientReturnCode } from './wp-client';
import { generateCodeVerifier, OAuth2Client } from './oauth2-client';
import { AppState } from './app-state';
import { isValidUrl, showError } from './utils';
import { ApiType } from './plugin-settings';
import { createServer } from 'http';

export function openProfileModal(
  plugin: WordpressPlugin,
  profile: WpProfile = {
    name: '',
    apiType: ApiType.XML_RPC,
    endpoint: '',
    xmlRpcPath: '/xmlrpc.php',
    saveUsername: false,
    savePassword: false,
    isDefault: false,
    lastSelectedCategories: [1],
  },
  atIndex = -1
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
      atIndex
    );
    modal.open();
  });
}

/**
 * WordPress profile modal.
 */
class WpProfileModal extends Modal {
  private readonly profileData: WpProfile;

  private readonly tokenGotRef;

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly onSubmit: (profile: WpProfile, atIndex?: number) => void,
    private readonly profile: WpProfile = {
      name: '',
      apiType: ApiType.XML_RPC,
      endpoint: '',
      xmlRpcPath: '/xmlrpc.php',
      saveUsername: false,
      savePassword: false,
      isDefault: false,
      lastSelectedCategories: [1],
    },
    private readonly atIndex: number = -1
  ) {
    super(plugin.app);

    this.profileData = Object.assign({}, profile);
    this.tokenGotRef = AppState.getInstance().events.on(
      EventType.OAUTH2_TOKEN_GOT,
      async (token) => {
        this.profileData.wpComOAuth2Token = token;
        if (atIndex >= 0) {
          // if token is undefined, just remove it
          this.plugin.settings.profiles[atIndex].wpComOAuth2Token = token;
          await this.plugin.saveSettings();
        }
      }
    );
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const getApiTypeDesc = (apiType: ApiType): string => {
      switch (apiType) {
        case ApiType.XML_RPC:
          return t('settings_apiTypeXmlRpcDesc');
        case ApiType.RestAPI_miniOrange:
          return t('settings_apiTypeRestMiniOrangeDesc');
        case ApiType.RestApi_ApplicationPasswords:
          return t('settings_apiTypeRestApplicationPasswordsDesc');
        case ApiType.RestApi_WpComOAuth2:
          return t('settings_apiTypeRestWpComOAuth2Desc');
        default:
          return '';
      }
    };
    let apiDesc = getApiTypeDesc(this.profileData.apiType);

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
            })
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
            })
        );
      new Setting(content)
        .setName(t('settings_apiType'))
        .setDesc(t('settings_apiTypeDesc'))
        .addDropdown((dropdown) => {
          dropdown
            .addOption(ApiType.XML_RPC, t('settings_apiTypeXmlRpc'))
            .addOption(
              ApiType.RestAPI_miniOrange,
              t('settings_apiTypeRestMiniOrange')
            )
            .addOption(
              ApiType.RestApi_ApplicationPasswords,
              t('settings_apiTypeRestApplicationPasswords')
            )
            .addOption(
              ApiType.RestApi_WpComOAuth2,
              t('settings_apiTypeRestWpComOAuth2')
            )
            .setValue(this.profileData.apiType)
            .onChange(async (value) => {
              let hasError = false;
              let newApiType = value;
              if (value === ApiType.RestApi_WpComOAuth2) {
                if (!this.profileData.endpoint.includes('blogspot.com')) {
                  showError(t('error_notWpCom'));
                  hasError = true;
                  newApiType = this.profileData.apiType;
                }
              }
              this.profileData.apiType = newApiType as ApiType;
              apiDesc = getApiTypeDesc(this.profileData.apiType);
              renderProfile();
              if (!hasError) {
                if (value === ApiType.RestApi_WpComOAuth2) {
                  if (this.profileData.wpComOAuth2Token) {
                    const endpointUrl = new URL(this.profileData.endpoint);
                    const blogUrl = new URL(
                      this.profileData.wpComOAuth2Token.blogUrl
                    );
                    if (endpointUrl.host !== blogUrl.host) {
                      await this.refreshWpComToken();
                    }
                  } else {
                    await this.refreshWpComToken();
                  }
                }
              }
            });
        });
      content.createEl('p', {
        text: apiDesc,
        cls: 'setting-item-description',
      });
      if (this.profileData.apiType === ApiType.XML_RPC) {
        new Setting(content)
          .setName(t('settings_xmlRpcPath'))
          .setDesc(t('settings_xmlRpcPathDesc'))
          .addText((text) =>
            text
              .setPlaceholder('/xmlrpc.php')
              .setValue(this.profileData.xmlRpcPath ?? '')
              .onChange((value) => {
                this.profileData.xmlRpcPath = value;
              })
          );
      } else if (this.profileData.apiType === ApiType.RestApi_WpComOAuth2) {
        new Setting(content)
          .setName(t('settings_wpComOAuth2RefreshToken'))
          .setDesc(t('settings_wpComOAuth2RefreshTokenDesc'))
          .addButton((button) =>
            button
              .setButtonText(t('settings_wpComOAuth2ValidateTokenButtonText'))
              .onClick(() => {
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
              })
          )
          .addButton((button) =>
            button
              .setButtonText(t('settings_wpComOAuth2RefreshTokenButtonText'))
              .onClick(async () => {
                await this.refreshWpComToken();
              })
          );
      }

      if (this.profileData.apiType !== ApiType.RestApi_WpComOAuth2) {
        const usernameSetting = new Setting(content).setName(
          t('profileModal_rememberUsername')
        );
        if (this.profileData.saveUsername) {
          usernameSetting.addText((text) =>
            text.setValue(this.profileData.username ?? '').onChange((value) => {
              this.profileData.username = value;
            })
          );
        }
        usernameSetting.addToggle((toggle) =>
          toggle.setValue(this.profileData.saveUsername).onChange((save) => {
            this.profileData.saveUsername = save;
            renderProfile();
          })
        );
        const passwordSetting = new Setting(content).setName(
          t('profileModal_rememberPassword')
        );
        if (this.profileData.savePassword) {
          passwordSetting.addText((text) =>
            text.setValue(this.profileData.password ?? '').onChange((value) => {
              this.profileData.password = value;
            })
          );
        }
        passwordSetting.addToggle((toggle) =>
          toggle.setValue(this.profileData.savePassword).onChange((save) => {
            this.profileData.savePassword = save;
            renderProfile();
          })
        );
      }
      new Setting(content)
        .setName(t('profileModal_setDefault'))
        .addToggle((toggle) =>
          toggle.setValue(this.profileData.isDefault).onChange((value) => {
            this.profileData.isDefault = value;
          })
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
            } else if (
              this.profileData.saveUsername &&
              !this.profileData.username
            ) {
              showError(t('error_noUsername'));
            } else if (
              this.profileData.savePassword &&
              !this.profileData.password
            ) {
              showError(t('error_noPassword'));
            } else {
              this.onSubmit(this.profileData, this.atIndex);
              this.close();
            }
          })
      );
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profileModal_title') });

    const content = contentEl.createEl('div');
    renderProfile();
  }

  onClose() {
    if (this.tokenGotRef) {
      AppState.getInstance().events.offref(this.tokenGotRef);
    }
    const { contentEl } = this;
    contentEl.empty();
  }

  private async refreshWpComToken(): Promise<void> {
    AppState.getInstance().codeVerifier = generateCodeVerifier();

    const server = createServer((req, res) => {
      if (!req.url) return;
      const url = new URL(req.url, WP_OAUTH2_REDIRECT_URI);
      if (url.pathname === '/') {
        res.writeHead(200, {
          'Content-Type': 'text/html',
        });
        res.end(`<html>
<head>
  <title>WordPress OAuth2</title>
</head>
<body>
  <h1>WordPress OAuth2</h1>
  <p>${this.plugin.i18n.t('listen_wpComOAuth2Redirecting')}</p>
  <script>
    window.location.href = "${WP_OAUTH2_OBSIDIAN_URI}/${url.search}";
  </script>
</body>
</html>`);
        server.close();
      }
    }).listen(0);
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error(`Failed to get local server port: ${address}`);
    }
    const port = address.port;

    await OAuth2Client.getWpOAuth2Client(this.plugin).getAuthorizeCode({
      redirectUri: `${WP_OAUTH2_REDIRECT_URI}:${port}`,
      scope: ['https://www.googleapis.com/auth/blogger'],
      blog: this.profileData.endpoint,
      codeVerifier: AppState.getInstance().codeVerifier,
    });
  }
}
