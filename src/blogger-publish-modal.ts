import { Modal, Setting } from 'obsidian';
import BloggerPlugin from './main';
import { BloggerPostParams } from './blogger-client-interface';
import { PostStatus } from './blogger-interface';
import { TranslateKey } from './i18n';
import { MatterData } from './types';

/**
 * Blogger publish modal.
 */
export class BloggerPublishModal extends Modal {
  constructor(
    private readonly plugin: BloggerPlugin,
    private readonly onSubmit: (
      params: BloggerPostParams,
      updateMatterData: (matter: MatterData) => void,
    ) => void,
    private readonly matterData: MatterData,
  ) {
    super(plugin.app);
  }

  onOpen() {
    const params: BloggerPostParams = {
      status: this.plugin.settings.defaultPostStatus,
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
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.empty();
    contentEl.createEl('h1', { text: t('publishModal_title') });

    new Setting(contentEl).setName(t('publishModal_postStatus')).addDropdown((dropdown) => {
      dropdown
        .addOption(PostStatus.Draft, t('publishModal_postStatusDraft'))
        .addOption(PostStatus.Publish, t('publishModal_postStatusPublish'))
        // .addOption(PostStatus.Future, 'future')
        .setValue(this.plugin.settings.defaultPostStatus)
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
