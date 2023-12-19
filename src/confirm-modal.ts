import { Modal, Setting } from 'obsidian';
import BloggerPlugin from './main';
import { TranslateKey } from './i18n';
import { AppState } from './app-state';

export enum ConfirmCode {
  Cancel,
  Confirm,
}

export interface ConfirmModalMessages {
  message: string;
  cancelText?: string;
  confirmText?: string;
}

export function openConfirmModal(
  messages: ConfirmModalMessages,
  plugin: BloggerPlugin,
): Promise<{ code: ConfirmCode }> {
  return new Promise((resolve, reject) => {
    const modal = new ConfirmModal(messages, plugin, (code, modal) => {
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
    private readonly plugin: BloggerPlugin,
    private readonly onAction: (code: ConfirmCode, modal: Modal) => void,
  ) {
    super(plugin.app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return AppState.get().i18n.t(key, vars);
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
