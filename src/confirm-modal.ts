import { App, Modal, Setting } from 'obsidian';
import { TranslateKey, getGlobalI18n } from './i18n';

export const ConfirmCode = {
  Confirm: 'confirm',
  Cancel: 'cancel',
} as const;
export type ConfirmCode = (typeof ConfirmCode)[keyof typeof ConfirmCode];

export interface ConfirmModalMessages {
  message: string;
  cancelText?: string;
  confirmText?: string;
}

export function openConfirmModal(
  messages: ConfirmModalMessages,
  app: App,
): Promise<{ code: ConfirmCode }> {
  return new Promise((resolve, reject) => {
    const modal = new ConfirmModal(messages, app, (code, modal) => {
      resolve({
        code,
      });
      modal.close();
    });
    modal.open();
  });
}

/**
 * Confirm modal.
 */
class ConfirmModal extends Modal {
  constructor(
    private readonly messages: ConfirmModalMessages,
    app: App,
    private readonly onAction: (code: ConfirmCode, modal: Modal) => void,
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return getGlobalI18n().t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('confirmModal_title') });

    new Setting(contentEl).setName(this.messages.message);

    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText(this.messages.cancelText ?? t('confirmModal_cancel')).onClick(() => {
          this.onAction(ConfirmCode.Cancel, this);
        }),
      )
      .addButton((button) =>
        button
          .setButtonText(this.messages.confirmText ?? t('confirmModal_confirm'))
          .setCta()
          .onClick(() => {
            this.onAction(ConfirmCode.Confirm, this);
          }),
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
