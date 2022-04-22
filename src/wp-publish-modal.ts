import { App, Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { PostStatus, Term } from './wp-api';

/**
 * WordPress publish modal.
 */
export class WpPublishModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly categories: Term[],
    private readonly onSubmit: (params: WordPressPostParams, modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const params: WordPressPostParams = {
      status: this.plugin.settings.defaultPostStatus
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'Publish to WordPress' });

    new Setting(contentEl)
      .setName('Post Status')
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, 'draft')
          .addOption(PostStatus.Publish, 'publish')
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value: PostStatus) => {
            params.status = value;
          });
      });
    if (this.categories.length > 0) {
      new Setting(contentEl)
        .setName('Category')
        .addDropdown((dropdown) => {
          this.categories.forEach(it => {
            dropdown.addOption(it.term_id, it.name);
          });
          dropdown
            .onChange(async (value: PostStatus) => {
              params.status = value;
            });
        });
    }
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Publish')
        .setCta()
        .onClick(() => {
          this.onSubmit(params, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
