import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { LanguageWithAuto, TranslateKey } from './i18n';
import { buildMarked } from './utils';
import { WpProfileManageModal } from './wp-profile-manage-modal';
import { WpProfile } from './wp-profile';


export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_miniOrange = 'miniOrange',
  RestApi_ApplicationPasswords = 'application-passwords',
  RestApi_WpComOAuth2 = 'WpComOAuth2'
}

export const enum MathJaxOutputType {
  TeX = 'tex',
  SVG = 'svg'
}

export interface WordpressPluginSettings {

  /**
   * Plugin language.
   */
  lang: LanguageWithAuto;

  profiles: WpProfile[];

  // /**
  //  * API type.
  //  */
  // apiType: ApiType;
  //
  // /**
  //  * Endpoint.
  //  */
  // endpoint: string;
  //
  // /**
  //  * XML-RPC path.
  //  */
  // xmlRpcPath: string;
  //
  // /**
  //  * WordPress username.
  //  */
  // username?: string;
  //
  // /**
  //  * WordPress password.
  //  */
  // password?: string;
  //
  // wpComOAuth2Token?: WordPressOAuth2Token;
  //
  // /**
  //  * Save username to local data.
  //  */
  // saveUsername: boolean;
  //
  // /**
  //  * Save user password to local data.
  //  */
  // savePassword: boolean;

  /**
   * Show plugin icon in side.
   */
  showRibbonIcon: boolean;

  /**
   * Default post status.
   */
  defaultPostStatus: PostStatus;

  /**
   * Default comment status.
   */
  defaultCommentStatus: CommentStatus;

  // /**
  //  * Last selected post categories.
  //  */
  // lastSelectedCategories: number[];

  /**
   * Remember last selected post categories.
   */
  rememberLastSelectedCategories: boolean;

  /**
   * If WordPress edit confirm modal will be shown when published successfully.
   */
  showWordPressEditConfirm: boolean;

  mathJaxOutputType: MathJaxOutputType;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  lang: 'auto',
  profiles: [],
  // apiType: ApiType.XML_RPC,
  // endpoint: '',
  // xmlRpcPath: '/xmlrpc.php',
  // saveUsername: false,
  // savePassword: false,
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  defaultCommentStatus: CommentStatus.Open,
  rememberLastSelectedCategories: true,
  showWordPressEditConfirm: false,
  mathJaxOutputType: MathJaxOutputType.SVG
}

export class WordpressSettingTab extends PluginSettingTab {

	constructor(
    app: App,
    private readonly plugin: WordpressPlugin
  ) {
		super(app, plugin);
	}

	display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };
    // const getApiTypeDesc = (apiType: ApiType): string => {
    //   switch (apiType) {
    //     case ApiType.XML_RPC:
    //       return t('settings_apiTypeXmlRpcDesc');
    //     case ApiType.RestAPI_miniOrange:
    //       return t('settings_apiTypeRestMiniOrangeDesc');
    //     case ApiType.RestApi_ApplicationPasswords:
    //       return t('settings_apiTypeRestApplicationPasswordsDesc');
    //     case ApiType.RestApi_WpComOAuth2:
    //       return t('settings_apiTypeRestWpComOAuth2Desc');
    //     default:
    //       return '';
    //   }
    // };

    const getMathJaxOutputTypeDesc = (type: MathJaxOutputType): string => {
      switch (type) {
        case MathJaxOutputType.TeX:
          return t('settings_MathJaxOutputTypeTeXDesc');
        case MathJaxOutputType.SVG:
          return t('settings_MathJaxOutputTypeSVGDesc');
        default:
          return '';
      }
    }

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    // let apiDesc = getApiTypeDesc(this.plugin.settings.apiType);
    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton(button => button
        .setButtonText(t('settings_profilesModal'))
        .onClick(() => {
          new WpProfileManageModal(this.app, this.plugin).open();
        }));

		// new Setting(containerEl)
		// 	.setName(t('settings_url'))
		// 	.setDesc(t('settings_urlDesc'))
		// 	.addText(text => text
		// 		.setPlaceholder(t('settings_urlPlaceholder'))
		// 		.setValue(this.plugin.settings.endpoint)
		// 		.onChange(async (value) => {
    //       if (this.plugin.settings.endpoint !== value) {
    //         this.plugin.settings.endpoint = value;
    //         await this.plugin.saveSettings();
    //       }
    //     }));
    // new Setting(containerEl)
    //   .setName(t('settings_apiType'))
    //   .setDesc(t('settings_apiTypeDesc'))
    //   .addDropdown((dropdown) => {
    //     dropdown
    //       .addOption(ApiType.XML_RPC, t('settings_apiTypeXmlRpc'))
    //       .addOption(ApiType.RestAPI_miniOrange, t('settings_apiTypeRestMiniOrange'))
    //       .addOption(ApiType.RestApi_ApplicationPasswords, t('settings_apiTypeRestApplicationPasswords'))
    //       .addOption(ApiType.RestApi_WpComOAuth2, t('settings_apiTypeRestWpComOAuth2'))
    //       .setValue(this.plugin.settings.apiType)
    //       .onChange(async (value) => {
    //         let hasError = false;
    //         let newApiType = value;
    //         if (value === ApiType.RestApi_WpComOAuth2) {
    //           if (!this.plugin.settings.endpoint.includes('wordpress.com')) {
    //             new Notice(t('error_notWpCom'), ERROR_NOTICE_TIMEOUT);
    //             hasError = true;
    //             newApiType = this.plugin.settings.apiType;
    //           }
    //         }
    //         this.plugin.settings.apiType = newApiType as ApiType;
    //         apiDesc = getApiTypeDesc(this.plugin.settings.apiType);
    //         await this.plugin.saveSettings();
    //         this.display();
    //         if (!hasError) {
    //           if (value === ApiType.RestApi_WpComOAuth2) {
    //             if (this.plugin.settings.wpComOAuth2Token) {
    //               const endpointUrl = new URL(this.plugin.settings.endpoint);
    //               const blogUrl = new URL(this.plugin.settings.wpComOAuth2Token.blogUrl);
    //               if (endpointUrl.host !== blogUrl.host) {
    //                 await this.refreshWpComToken();
    //               }
    //             } else {
    //               await this.refreshWpComToken();
    //             }
    //           }
    //         }
    //       });
    //   });
    // containerEl.createEl('p', {
    //   text: apiDesc,
    //   cls: 'setting-item-description'
    // });
    // if (this.plugin.settings.apiType === ApiType.XML_RPC) {
    //   new Setting(containerEl)
    //     .setName(t('settings_xmlRpcPath'))
    //     .setDesc(t('settings_xmlRpcPathDesc'))
    //     .addText(text => text
    //       .setPlaceholder('/xmlrpc.php')
    //       .setValue(this.plugin.settings.xmlRpcPath)
    //       .onChange(async (value) => {
    //         this.plugin.settings.xmlRpcPath = value;
    //         await this.plugin.saveSettings();
    //       }));
    // } else if (this.plugin.settings.apiType === ApiType.RestApi_WpComOAuth2) {
    //   new Setting(containerEl)
    //     .setName(t('settings_wpComOAuth2RefreshToken'))
    //     .setDesc(t('settings_wpComOAuth2RefreshTokenDesc'))
    //     .addButton(button => button
    //       .setButtonText(t('settings_wpComOAuth2ValidateTokenButtonText'))
    //       .onClick(() => {
    //         if (this.plugin.settings.wpComOAuth2Token) {
    //           this.getWpOAuth2Client().validateToken({
    //             token: this.plugin.settings.wpComOAuth2Token.accessToken
    //           })
    //             .then(result => {
    //               if (result.code === WordPressClientReturnCode.Error) {
    //                 new Notice(result.data + '', ERROR_NOTICE_TIMEOUT);
    //               } else {
    //                 new Notice(t('message_wpComTokenValidated'));
    //               }
    //             });
    //         }
    //       }))
    //     .addButton(button => button
    //       .setButtonText(t('settings_wpComOAuth2RefreshTokenButtonText'))
    //       .onClick(async () => {
    //         await this.refreshWpComToken();
    //       }));
    // }
    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();

            this.plugin.updateRibbonIcon();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(PostStatus.Publish, t('settings_defaultPostStatusPublish'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultPostStatus = value as PostStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_defaultPostComment'))
      .setDesc(t('settings_defaultPostCommentDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, t('settings_defaultPostCommentOpen'))
          .addOption(CommentStatus.Closed, t('settings_defaultPostCommentClosed'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultCommentStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultCommentStatus = value as CommentStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_rememberLastSelectedCategories'))
      .setDesc(t('settings_rememberLastSelectedCategoriesDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rememberLastSelectedCategories)
          .onChange(async (value) => {
            this.plugin.settings.rememberLastSelectedCategories = value;
            if (!value) {
              this.plugin.settings.profiles.forEach(profile => {
                if (!profile.lastSelectedCategories || profile.lastSelectedCategories.length === 0) {
                  profile.lastSelectedCategories = [ 1 ];
                }
              });
            }
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_showWordPressEditPageModal'))
      .setDesc(t('settings_showWordPressEditPageModalDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showWordPressEditConfirm)
          .onChange(async (value) => {
            this.plugin.settings.showWordPressEditConfirm = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_mathJaxOutputType'))
      .setDesc(t('settings_mathJaxOutputTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(MathJaxOutputType.TeX, t('settings_mathJaxOutputTypeTeX'))
          .addOption(MathJaxOutputType.SVG, t('settings_mathJaxOutputTypeSVG'))
          .setValue(this.plugin.settings.mathJaxOutputType)
          .onChange(async (value) => {
            this.plugin.settings.mathJaxOutputType = value as MathJaxOutputType;
            mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);
            await this.plugin.saveSettings();
            this.display();

            buildMarked(this.plugin.settings);
          });
      });
    containerEl.createEl('p', {
      text: mathJaxOutputTypeDesc,
      cls: 'setting-item-description'
    });
	}

  // private async refreshWpComToken(): Promise<void> {
  //   this.codeVerifier = generateCodeVerifier();
  //   await this.getWpOAuth2Client().getAuthorizeCode({
  //     redirectUri: OAuth2RedirectUri,
  //     scope: [ 'posts', 'taxonomy', 'media' ],
  //     blog: this.plugin.settings.endpoint,
  //     codeVerifier: this.codeVerifier
  //   });
  // }

  // private getWpOAuth2Client(): OAuth2Client {
  //   if (!this.client) {
  //     this.client = new OAuth2Client({
  //       clientId: WP_OAUTH2_CLIENT_ID,
  //       clientSecret: WP_OAUTH2_CLIENT_SECRET,
  //       tokenEndpoint: WP_OAUTH2_TOKEN_ENDPOINT,
  //       authorizeEndpoint: WP_OAUTH2_AUTHORIZE_ENDPOINT,
  //       validateTokenEndpoint: WP_OAUTH2_VALIDATE_TOKEN_ENDPOINT
  //     }, this.plugin);
  //   }
  //   return this.client;
  // }

}
