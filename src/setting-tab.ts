import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';
import { BloggerProfileManageModal } from './blogger-profile-manage-modal';
import { MathJaxOutputType, PluginSettings } from './plugin-settings';
import { getGlobalMarkdownParser, setupMarkdownParser } from './markdown-it-default';
import { PostStatus } from './blogger-client-interface';

export class BloggerSettingTab extends PluginSettingTab {
  constructor(
    readonly app: App,
    private readonly settings: PluginSettings,
    private readonly saveSettings: () => Promise<void>,
    readonly plugin: Plugin,
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

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.settings.mathJaxOutputType);

    new Setting(containerEl)
      .setName(t('settings_clientId'))
      .setDesc(t('settings_clientIdDesc'))
      .addText((text) =>
        text.setValue(this.settings.clientId ?? '').onChange(async (value) => {
          if (this.settings.clientId !== value) {
            this.settings.clientId = value;
            await this.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_clientSecret'))
      .setDesc(t('settings_clientSecretDesc'))
      .addText((text) =>
        text.setValue(this.settings.clientSecret ?? '').onChange(async (value) => {
          if (this.settings.clientSecret !== value) {
            this.settings.clientSecret = value;
            await this.saveSettings();
          }
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton((button) =>
        button.setButtonText(t('settings_profilesModal')).onClick(() => {
          new BloggerProfileManageModal(this.plugin, this.settings, this.saveSettings).open();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(PostStatus.Live, t('settings_defaultPostStatusLive'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.settings.defaultPostStatus = value as PostStatus;
            await this.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_openPublishedPageWithBrowser'))
      .setDesc(t('settings_openPublishedPageWithBrowserDesc'))
      .addToggle((toggle) =>
        toggle.setValue(this.settings.openPublishedPageWithBrowser).onChange(async (value) => {
          this.settings.openPublishedPageWithBrowser = value;
          await this.saveSettings();
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
            await this.saveSettings();
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
          await this.saveSettings();

          getGlobalMarkdownParser().set({
            html: this.settings.enableHtml,
          });
        }),
      );
  }
}
