import { LanguageWithAuto } from './i18n';
import { BloggerProfile } from './blogger-profile';
import { SafeAny } from './types';
import { PostStatus } from './blogger-client-interface';

export const SettingsVersion = {
  V1: '1',
} as const;
export type SettingsVersion = (typeof SettingsVersion)[keyof typeof SettingsVersion];

export const MathJaxOutputType = {
  TeX: 'tex',
  SVG: 'svg',
} as const;
export type MathJaxOutputType = (typeof MathJaxOutputType)[keyof typeof MathJaxOutputType];

export type PluginSettings = {
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
};

export type PluginSettingsWithSaver = PluginSettings & {
  /**
   * Save settings to storage.
   */
  save: () => Promise<void>;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  lang: 'auto',
  profiles: [],
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  showBloggerEditConfirm: false,
  mathJaxOutputType: MathJaxOutputType.SVG,
  enableHtml: false,
  replaceMediaLinks: true,
};

// Currently we only have one version
export async function upgradeSettings(
  existingSettings: SafeAny,
  to: SettingsVersion,
): Promise<{ needUpgrade: boolean; settings: PluginSettings }> {
  return {
    needUpgrade: false,
    settings: existingSettings,
  };
}
