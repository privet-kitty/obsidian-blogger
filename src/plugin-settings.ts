import { LanguageWithAuto } from './i18n';
import { BloggerProfile } from './blogger-profile';
import { isNil, isUndefined } from 'lodash-es';
import { SafeAny } from './types';
import { PassCrypto } from './pass-crypto';
import { WP_DEFAULT_PROFILE_NAME } from './consts';
import { PostStatus } from './blogger-client-interface';

export const enum SettingsVersion {
  V2 = '2',
}

export const enum MathJaxOutputType {
  TeX = 'tex',
  SVG = 'svg',
}

export interface BloggerPluginSettings {
  version?: SettingsVersion;

  /**
   * Plugin language.
   */
  lang: LanguageWithAuto;

  profiles: BloggerProfile[];

  /**
   * Show plugin icon in side.
   */
  showRibbonIcon: boolean;

  /**
   * Default post status.
   */
  defaultPostStatus: PostStatus;

  /**
   * If Blogger edit confirm modal will be shown when published successfully.
   */
  showBloggerEditConfirm: boolean;

  mathJaxOutputType: MathJaxOutputType;

  enableHtml: boolean;

  /**
   * Whether media links should be replaced after uploading to Blogger.
   */
  replaceMediaLinks: boolean;
}

export const DEFAULT_SETTINGS: BloggerPluginSettings = {
  lang: 'auto',
  profiles: [],
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  showBloggerEditConfirm: false,
  mathJaxOutputType: MathJaxOutputType.SVG,
  enableHtml: false,
  replaceMediaLinks: true,
};

export async function upgradeSettings(
  existingSettings: SafeAny,
  to: SettingsVersion,
): Promise<{ needUpgrade: boolean; settings: BloggerPluginSettings }> {
  console.log(existingSettings, to);
  if (isUndefined(existingSettings.version)) {
    // V1
    if (to === SettingsVersion.V2) {
      const newSettings: BloggerPluginSettings = Object.assign({}, DEFAULT_SETTINGS, {
        version: SettingsVersion.V2,
        lang: existingSettings.lang,
        showRibbonIcon: existingSettings.showRibbonIcon,
        defaultPostStatus: existingSettings.defaultPostStatus,
        showBloggerEditConfirm: existingSettings.showBloggerEditConfirm,
        mathJaxOutputType: existingSettings.mathJaxOutputType,
      });
      if (existingSettings.endpoint) {
        const endpoint = existingSettings.endpoint;
        const xmlRpcPath = existingSettings.xmlRpcPath;
        const username = existingSettings.username;
        const password = existingSettings.password;
        const crypto = new PassCrypto();
        const encryptedPassword = await crypto.encrypt(password);
        const profile = {
          name: WP_DEFAULT_PROFILE_NAME,
          endpoint: endpoint,
          xmlRpcPath: xmlRpcPath,
          saveUsername: !isNil(username),
          savePassword: !isNil(password),
          isDefault: true,
          username: username,
          encryptedPassword: encryptedPassword,
        };
        newSettings.profiles = [profile];
      } else {
        newSettings.profiles = [];
      }
      return {
        needUpgrade: true,
        settings: newSettings,
      };
    }
  }
  return {
    needUpgrade: false,
    settings: existingSettings,
  };
}
