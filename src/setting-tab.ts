import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';
import { BloggerProfileManageModal } from './blogger-profile-manage-modal';
import { MathJaxOutputType, PluginSettingsWithSaver } from './plugin-settings';
import { getGlobalMarkdownParser, setupMarkdownParser } from './markdown-it-default';
import { PostStatus } from './blogger-client-interface';

export class BloggerSettingTab extends PluginSettingTab {
  constructor(
    readonly app: App,
    private readonly settings: PluginSettingsWithSaver,
    private readonly plugin: Plugin,
    private readonly updateRibbonIcon: () => void,
  ) {
    super(plugin.app, plugin);
  }

  display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const getMathJaxOutputTypeDesc = (type: MathJaxOutputType): string => {
      switch (type) {
        case MathJaxOutputType.TeX:
          return t('settings_MathJaxOutputTypeTeXDesc');
        case MathJaxOutputType.SVG:
          return t('settings_MathJaxOutputTypeSVGDesc');
        default:
          return '';
      }
    };

    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.settings.mathJaxOutputType);

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton((button) =>
        button.setButtonText(t('settings_profilesModal')).onClick(() => {
          new BloggerProfileManageModal(this.app, this.settings).open();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.showRibbonIcon).onChange(async (value) => {
          this.settings.showRibbonIcon = value;
          await this.settings.save();

          this.updateRibbonIcon();
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
          .setValue(this.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.settings.defaultPostStatus = value as PostStatus;
            await this.settings.save();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_showBloggerEditPageModal'))
      .setDesc(t('settings_showBloggerEditPageModalDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.showBloggerEditConfirm).onChange(async (value) => {
          this.settings.showBloggerEditConfirm = value;
          await this.settings.save();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_mathJaxOutputType'))
      .setDesc(t('settings_mathJaxOutputTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(MathJaxOutputType.TeX, t('settings_mathJaxOutputTypeTeX'))
          .addOption(MathJaxOutputType.SVG, t('settings_mathJaxOutputTypeSVG'))
          .setValue(this.settings.mathJaxOutputType)
          .onChange(async (value) => {
            this.settings.mathJaxOutputType = value as MathJaxOutputType;
            mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.settings.mathJaxOutputType);
            await this.settings.save();
            this.display();

            setupMarkdownParser(getGlobalMarkdownParser(), this.settings);
          });
      });
    containerEl.createEl('p', {
      text: mathJaxOutputTypeDesc,
      cls: 'setting-item-description',
    });

    new Setting(containerEl)
      .setName(t('settings_enableHtml'))
      .setDesc(t('settings_enableHtmlDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.enableHtml).onChange(async (value) => {
          this.settings.enableHtml = value;
          await this.settings.save();

          getGlobalMarkdownParser().set({
            html: this.settings.enableHtml,
          });
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_replaceMediaLinks'))
      .setDesc(t('settings_replaceMediaLinksDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.replaceMediaLinks).onChange(async (value) => {
          this.settings.replaceMediaLinks = value;
          await this.settings.save();
        }),
      );
  }
}
