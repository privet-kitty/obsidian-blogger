import { Platform, Plugin } from 'obsidian';
import { BloggerSettingTab } from './setting-tab';
import { addIcons } from './icons';
import { BloggerPostParams, PostStatus } from './blogger-client-interface';
import { openProfileChooserModal } from './blogger-profile-chooser-modal';
import {
  DEFAULT_SETTINGS,
  SettingsVersion,
  upgradeSettings,
  PluginSettings,
} from './plugin-settings';
import { showError } from './utils';
import { isString } from 'lodash-es';
import { BloggerProfile } from './blogger-profile';
import { getBloggerClient } from './blogger-client';
import { getGlobalMarkdownParser, setupMarkdownParser } from './markdown-it-default';
import { getGlobalI18n, setGlobalLang } from './i18n';
import { MobileOAuth2Helper } from './blogger-oauth2-client';

const doClientPublish = (
  plugin: BloggerPlugin,
  profileOrName: BloggerProfile | string,
  defaultPostParams?: BloggerPostParams,
): void => {
  let profile: BloggerProfile | undefined;
  if (isString(profileOrName)) {
    profile = plugin.settings.profiles.find((it) => it.name === profileOrName);
  } else {
    profile = profileOrName;
  }
  if (profile) {
    const client = getBloggerClient(plugin.app, plugin.settings, plugin.saveSettings, profile);
    if (client) {
      client.publishPost(defaultPostParams).then();
    }
  } else {
    const noSuchProfileMessage = getGlobalI18n().t('error_noSuchProfile', {
      profileName: String(profileOrName),
    });
    showError(noSuchProfileMessage);
    throw new Error(noSuchProfileMessage);
  }
};

export default class BloggerPlugin extends Plugin {
  #settings: PluginSettings | undefined;
  get settings() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#settings!;
  }

  private ribbonBloggerIcon: HTMLElement | null = null;

  onload = async () => {
    await this.loadSettings();
    // lang should be load early, but after settings
    setGlobalLang(this.#settings?.lang);
    setupMarkdownParser(getGlobalMarkdownParser(), this.settings);
    addIcons();
    if (Platform.isMobile) {
      MobileOAuth2Helper.setUp(this);
    }

    // this.registerProtocolHandler();
    this.updateRibbonIcon();

    this.addCommand({
      id: 'defaultPublish',
      name: getGlobalI18n().t('command_publishWithDefault'),
      editorCallback: () => {
        const defaultProfile = this.#settings?.profiles.find((it) => it.isDefault);
        if (defaultProfile) {
          const params: BloggerPostParams = {
            status: this.#settings?.defaultPostStatus ?? PostStatus.Draft,
            labels: [],
            title: '',
            content: '',
          };
          doClientPublish(this, defaultProfile, params);
        } else {
          showError(getGlobalI18n().t('error_noDefaultProfile') ?? 'No default profile found.');
        }
      },
    });

    this.addCommand({
      id: 'LIVE',
      name: getGlobalI18n().t('command_publish'),
      editorCallback: () => {
        this.openProfileChooser();
      },
    });

    this.addSettingTab(
      new BloggerSettingTab(
        this.app,
        this.settings,
        this.saveSettings,
        this,
        this.updateRibbonIcon,
      ),
    );
  };

  onunload = () => {};

  loadSettings = async () => {
    this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const { needUpgrade, settings } = await upgradeSettings(this.#settings, SettingsVersion.V1);
    this.#settings = settings;
    if (needUpgrade) {
      await this.saveSettings();
    }

    getGlobalMarkdownParser().set({
      html: this.#settings?.enableHtml ?? false,
    });
  };

  saveSettings = async () => {
    await this.saveData(this.settings);
  };

  updateRibbonIcon = () => {
    const ribbonIconTitle = getGlobalI18n().t('ribbon_iconTitle') ?? 'Blogger';
    if (this.#settings?.showRibbonIcon) {
      if (!this.ribbonBloggerIcon) {
        this.ribbonBloggerIcon = this.addRibbonIcon('blogger-logo', ribbonIconTitle, () => {
          this.openProfileChooser();
        });
      }
    } else {
      if (this.ribbonBloggerIcon) {
        this.ribbonBloggerIcon.remove();
        this.ribbonBloggerIcon = null;
      }
    }
  };

  private openProfileChooser = async () => {
    if (this.settings.profiles.length === 1) {
      doClientPublish(this, this.settings.profiles[0]);
    } else if (this.settings.profiles.length > 1) {
      const profile = await openProfileChooserModal(this.app, this.settings.profiles);
      doClientPublish(this, profile);
    } else {
      showError(getGlobalI18n().t('error_noProfile'));
    }
  };
}
