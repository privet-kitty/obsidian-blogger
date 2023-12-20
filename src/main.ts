import { Plugin } from 'obsidian';
import { BloggerSettingTab } from './settings';
import { addIcons } from './icons';
import { BloggerPostParams, PostStatus } from './blogger-client-interface';
import { openProfileChooserModal } from './blogger-profile-chooser-modal';
import { AppState } from './app-state';
import {
  DEFAULT_SETTINGS,
  SettingsVersion,
  BloggerPluginSettings,
  upgradeSettings,
} from './plugin-settings';
import { PassCrypto } from './pass-crypto';
import { showError } from './utils';
import { cloneDeep, isString } from 'lodash-es';
import { BloggerProfile } from './blogger-profile';
import { getBloggerClient } from './blogger-client';
import { setupMarkdownParser } from './markdown-it-default';
import { getGlobalI18n, setGlobalLang } from './i18n';

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
    const client = getBloggerClient(plugin, profile);
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
  #settings: BloggerPluginSettings | undefined;
  get settings() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#settings!;
  }

  private ribbonBloggerIcon: HTMLElement | null = null;

  async onload() {
    console.log('loading obsidian-wordpress plugin');

    await this.loadSettings();
    // lang should be load early, but after settings
    setGlobalLang(this.#settings?.lang);

    setupMarkdownParser(AppState.get().markdownParser, this.settings);

    addIcons();

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
      id: 'publish',
      name: getGlobalI18n().t('command_publish'),
      editorCallback: () => {
        this.openProfileChooser();
      },
    });

    this.addSettingTab(new BloggerSettingTab(this));
  }

  onunload() {}

  async loadSettings() {
    this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const { needUpgrade, settings } = await upgradeSettings(this.#settings, SettingsVersion.V1);
    this.#settings = settings;
    if (needUpgrade) {
      await this.saveSettings();
    }

    const crypto = new PassCrypto();
    const count = this.#settings?.profiles.length ?? 0;
    for (let i = 0; i < count; i++) {
      const profile = this.#settings?.profiles[i];
      const enPass = profile.encryptedPassword;
      if (enPass) {
        profile.password = await crypto.decrypt(enPass.encrypted, enPass.key, enPass.vector);
      }
    }

    AppState.get().markdownParser.set({
      html: this.#settings?.enableHtml ?? false,
    });
  }

  async saveSettings() {
    const settings = cloneDeep(this.settings);
    for (let i = 0; i < settings.profiles.length; i++) {
      const profile = settings.profiles[i];
      const password = profile.password;
      if (password) {
        const crypto = new PassCrypto();
        profile.encryptedPassword = await crypto.encrypt(password);
        delete profile.password;
      }
    }
    await this.saveData(settings);
  }

  updateRibbonIcon(): void {
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
  }

  private async openProfileChooser() {
    if (this.settings.profiles.length === 1) {
      doClientPublish(this, this.settings.profiles[0]);
    } else if (this.settings.profiles.length > 1) {
      const profile = await openProfileChooserModal(this);
      doClientPublish(this, profile);
    } else {
      showError(getGlobalI18n().t('error_noProfile'));
    }
  }
}
