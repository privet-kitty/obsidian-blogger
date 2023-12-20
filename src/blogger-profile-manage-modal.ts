import { Modal, Setting } from 'obsidian';
import BloggerPlugin from './main';
import { BloggerProfile, rendererProfile } from './blogger-profile';
import { TranslateKey, getGlobalI18n } from './i18n';
import { openProfileModal } from './blogger-profile-modal';
import { isNil } from 'lodash-es';

/**
 * Blogger profiles manage modal.
 */
export class BloggerProfileManageModal extends Modal {
  private readonly profiles: BloggerProfile[];

  constructor(private readonly plugin: BloggerPlugin) {
    super(plugin.app);

    this.profiles = plugin.settings.profiles;
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile, index) => {
        const setting = rendererProfile(profile, content);
        if (!profile.isDefault) {
          setting.addButton((button) =>
            button.setButtonText(t('profilesManageModal_setDefault')).onClick(() => {
              this.profiles.forEach((it) => (it.isDefault = false));
              profile.isDefault = true;
              renderProfiles();
              this.plugin.saveSettings().then();
            }),
          );
        }
        setting.addButton((button) =>
          button.setButtonText(t('profilesManageModal_showDetails')).onClick(async () => {
            const { profile: newProfile, atIndex } = await openProfileModal(
              this.plugin,
              profile,
              index,
            );
            console.log('updateProfile', newProfile, atIndex);
            if (!isNil(atIndex) && atIndex > -1) {
              if (newProfile.isDefault) {
                this.profiles.forEach((it) => (it.isDefault = false));
              }
              this.profiles[atIndex] = newProfile;
              renderProfiles();
              this.plugin.saveSettings().then();
            }
          }),
        );
        setting.addExtraButton((button) =>
          button
            .setIcon('lucide-trash')
            .setTooltip(t('profilesManageModal_deleteTooltip'))
            .onClick(() => {
              this.profiles.splice(index, 1);
              if (profile.isDefault) {
                if (this.profiles.length > 0) {
                  this.profiles[0].isDefault = true;
                }
              }
              renderProfiles();
              this.plugin.saveSettings().then();
            }),
        );
      });
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profilesManageModal_title') });

    new Setting(contentEl)
      .setName(t('profilesManageModal_create'))
      .setDesc(t('profilesManageModal_createDesc'))
      .addButton((button) =>
        button
          .setButtonText(t('profilesManageModal_create'))
          .setCta()
          .onClick(async () => {
            const { profile } = await openProfileModal(this.plugin);
            console.log('appendProfile', profile);
            // if no profile, make the first one default
            if (this.profiles.length === 0) {
              profile.isDefault = true;
            }
            if (profile.isDefault) {
              this.profiles.forEach((it) => (it.isDefault = false));
            }
            this.profiles.push(profile);
            renderProfiles();
            await this.plugin.saveSettings();
          }),
      );

    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
