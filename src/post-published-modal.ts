import { App, Modal, Setting } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';

export function openPostPublishedModal(app: App): Promise<void> {
  return new Promise((resolve, reject) => {
    new PostPublishedModal(app, (modal) => {
      resolve();
      modal.close();
    });
  });
}

/**
 * Blogger post published modal.
 */
class PostPublishedModal extends Modal {
  constructor(readonly app: App, private readonly onOpenClicked: (modal: Modal) => void) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('publishedModal_title') });

    new Setting(contentEl).setName(t('publishedModal_confirmEditInBlogger'));
    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText(t('publishedModal_cancel')).onClick(() => {
          this.close();
        }),
      )
      .addButton((button) =>
        button
          .setButtonText(t('publishedModal_open'))
          .setCta()
          .onClick(() => {
            this.onOpenClicked(this);
          }),
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
