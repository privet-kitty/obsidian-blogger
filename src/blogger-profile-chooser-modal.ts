import { App, Modal, Setting } from 'obsidian';
import { BloggerProfile, rendererProfile } from './blogger-profile';
import { TranslateKey, getGlobalI18n } from './i18n';

export function openProfileChooserModal(
  app: App,
  profiles: BloggerProfile[],
): Promise<BloggerProfile> {
  return new Promise<BloggerProfile>((resolve, reject) => {
    const modal = new BloggerProfileChooserModal(app, profiles, (profile) => {
      resolve(profile);
    });
    modal.open();
  });
}

/**
 * Blogger profiles chooser modal.
 */
class BloggerProfileChooserModal extends Modal {
  constructor(
    readonly app: App,
    private readonly profiles: BloggerProfile[],
    private readonly onChoose: (profile: BloggerProfile) => void,
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const chooseProfile = (profile: BloggerProfile): void => {
      this.onChoose(profile);
      this.close();
    };

    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile) => {
        const setting = rendererProfile(profile, content);
        setting.settingEl.addEventListener('click', () => {
          chooseProfile(profile);
        });
      });
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profilesChooserModal_title') });

    new Setting(contentEl).setName(t('profilesChooserModal_pickOne'));
    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
