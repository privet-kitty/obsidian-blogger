import { LanguageWithAuto } from './i18n';
import { BloggerProfile } from './blogger-profile';
import { SafeAny } from './types';
import { PostStatus } from './blogger-client-interface';

export const enum SettingsVersion {
  V1 = '1',
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
  return {
    needUpgrade: false,
    settings: existingSettings,
  };
}
