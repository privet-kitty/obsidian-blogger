import { Modal, Notice, Platform, Plugin, Setting, requestUrl } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';
import { BloggerProfile } from './blogger-profile';
import { BLOGGER_API_ENDPOINT } from './consts';
import { FreshInternalOAuth2Token, OAuth2Client } from './oauth2-client';
import { generateQueryString, isValidBloggerUrl, showError } from './utils';
import { reauthorizeGoogleToken } from './blogger-oauth2-client';

export const openProfileModal = (
  plugin: Plugin,
  profile: Partial<BloggerProfile>,
  oAuth2Client: OAuth2Client,
  atIndex = -1,
): Promise<{ profile: BloggerProfile; atIndex?: number }> => {
  return new Promise((resolve, reject) => {
    const modal = new BloggerProfileModal(
      plugin,
      (profile, atIndex) => {
        resolve({
          profile,
          atIndex,
        });
      },
      profile,
      oAuth2Client,
      atIndex,
    );
    modal.open();
  });
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
    readonly plugin: Plugin,
    private readonly onSubmit: (profile: BloggerProfile, atIndex?: number) => void,
    profile: Partial<BloggerProfile>,
    private readonly oauth2Client: OAuth2Client,
    private readonly atIndex: number = -1,
  ) {
    super(plugin.app);

    this.profileData = Object.assign({}, profile);
  }

  onOpen = () => {
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
            const endpoint = this.profileData.endpoint;
            if (endpoint === undefined || !isValidBloggerUrl(endpoint)) {
              showError(new Error(getGlobalI18n().t('error_notGoogle')));
            } else {
              await reauthorizeGoogleToken({
                isDesktop: Platform.isDesktop,
                oauth2Client: this.oauth2Client,
                blogEndpoint: endpoint,
                setGoogleOAuth2Token: (token) => {
                  this.profileData.googleOAuth2Token = token;
                },
                // HACK: `this` is determined by the dynamic scope within the callback.
                registerObsidianProtocolHandler: this.plugin.registerObsidianProtocolHandler.bind(
                  this.plugin,
                ),
              });
            }
          });
        })
        .addButton((button) => {
          button.setButtonText(t('settings_googleOAuth2ValidateTokenButtonText')).onClick(() => {
            if (this.profileData.googleOAuth2Token) {
              this.oauth2Client
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
          .onClick(() => {
            this.createFullProfile()
              .then((fullProfile) => {
                this.onSubmit(fullProfile, this.atIndex);
                this.close();
              })
              .catch((e) => {
                showError(e);
              });
          }),
      );
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profileModal_title') });

    const content = contentEl.createEl('div');
    renderProfile();
  };

  onClose = () => {
    const { contentEl } = this;
    contentEl.empty();
  };

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
    const fresh_token = await this.oauth2Client.ensureFreshToken(googleOAuth2Token);
    const blogId = await fetchBlogId(endpoint, fresh_token);
    const isDefault = this.profileData.isDefault ?? false;
    return { name, endpoint, blogId, googleOAuth2Token, isDefault };
  };
}
