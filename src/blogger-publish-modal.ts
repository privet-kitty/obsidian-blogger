import { App, Modal, Setting } from 'obsidian';
import { BloggerPostParams, PostStatus } from './blogger-client-interface';
import { TranslateKey, getGlobalI18n } from './i18n';
import { MatterData } from './types';
import { PluginSettings } from './plugin-settings';

/**
 * Blogger publish modal.
 */
export class BloggerPublishModal extends Modal {
  constructor(
    readonly app: App,
    private readonly settings: PluginSettings,
    private readonly onSubmit: (
      params: BloggerPostParams,
      updateMatterData: (matter: MatterData) => void,
    ) => void,
  ) {
    super(app);
  }

  onOpen() {
    const params: BloggerPostParams = {
      status: this.settings.defaultPostStatus,
      labels: [],
      title: '',
      content: '',
    };

    this.display(params);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private display(params: BloggerPostParams): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h1', { text: t('publishModal_title') });

    new Setting(contentEl).setName(t('publishModal_postStatus')).addDropdown((dropdown) => {
      dropdown
        .addOption(PostStatus.Draft, t('publishModal_postStatusDraft'))
        .addOption(PostStatus.Publish, t('publishModal_postStatusPublish'))
        // .addOption(PostStatus.Future, 'future')
        .setValue(this.settings.defaultPostStatus)
        .onChange((value) => {
          params.status = value as PostStatus;
        });
    });

    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText(t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          this.onSubmit(params, (fm) => {});
        }),
    );
  }
}
