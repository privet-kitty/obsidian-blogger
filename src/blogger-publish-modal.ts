import { Modal, Setting } from 'obsidian';
import BloggerPlugin from './main';
import { BloggerPostParams } from './blogger-client';
import { PostStatus, PostType, PostTypeConst, Term } from './blogger-interface';
import { toNumber } from 'lodash-es';
import { TranslateKey } from './i18n';
import { MatterData } from './types';
import { ConfirmCode, openConfirmModal } from './confirm-modal';

/**
 * Blogger publish modal.
 */
export class BloggerPublishModal extends Modal {
  constructor(
    private readonly plugin: BloggerPlugin,
    private readonly categories: {
      items: Term[];
      selected: number[];
    },
    private readonly postTypes: {
      items: PostType[];
      selected: PostType;
    },
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
      postType: this.postTypes.selected,
      categories: this.categories.selected,
      tags: [],
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

    if (!this.matterData?.postId) {
      new Setting(contentEl).setName(t('publishModal_postType')).addDropdown((dropdown) => {
        this.postTypes.items.forEach((it) => {
          dropdown.addOption(it, it);
        });
        dropdown.setValue(params.postType).onChange((value) => {
          params.postType = value as PostType;
          this.display(params);
        });
      });
    }

    if (params.postType !== 'page') {
      if (this.categories.items.length > 0) {
        new Setting(contentEl).setName(t('publishModal_category')).addDropdown((dropdown) => {
          this.categories.items.forEach((it) => {
            dropdown.addOption(it.id, it.name);
          });
          dropdown.setValue(String(params.categories[0])).onChange((value) => {
            params.categories = [toNumber(value)];
          });
        });
      }
    }
    new Setting(contentEl).addButton((button) =>
      button
        .setButtonText(t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          if (
            this.matterData.postType &&
            this.matterData.postType !== PostTypeConst.Post &&
            (this.matterData.tags || this.matterData.categories)
          ) {
            openConfirmModal(
              {
                message: t('publishModal_wrongMatterDataForPage'),
              },
              this.plugin,
            ).then((result) => {
              if (result.code === ConfirmCode.Confirm) {
                this.onSubmit(params, (fm) => {
                  delete fm.categories;
                  delete fm.tags;
                });
              }
            });
          } else {
            this.onSubmit(params, (fm) => {});
          }
        }),
    );
  }
}
