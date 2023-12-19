import { Notice, TFile } from 'obsidian';
import BloggerPlugin from './main';
import {
  BloggerClient,
  BloggerClientResult,
  BloggerClientReturnCode,
  BloggerMediaUploadResult,
  BloggerPostParams,
  BloggerPublishResult,
} from './wp-client';
import { WpPublishModal } from './wp-publish-modal';
import { PostType, PostTypeConst, Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT, WP_DEFAULT_PROFILE_NAME } from './consts';
import {
  isPromiseFulfilledResult,
  isValidUrl,
  openWithBrowser,
  processFile,
  showError,
} from './utils';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import fileTypeChecker from 'file-type-checker';
import { MatterData, Media, SafeAny } from './types';
import { openPostPublishedModal } from './post-published-modal';
import { isFunction } from 'lodash-es';

export abstract class AbstractBloggerClient implements BloggerClient {
  /**
   * Client name.
   */
  name = 'AbstractBloggerClient';

  protected constructor(
    protected readonly plugin: BloggerPlugin,
    protected readonly profile: WpProfile,
  ) {}

  abstract publish(
    title: string,
    content: string,
    postParams: BloggerPostParams,
  ): Promise<BloggerClientResult<BloggerPublishResult>>;

  abstract getCategories(): Promise<Term[]>;

  abstract getPostTypes(): Promise<PostType[]>;

  abstract getTag(name: string): Promise<Term>;

  abstract uploadMedia(media: Media): Promise<BloggerClientResult<BloggerMediaUploadResult>>;

  private async checkExistingProfile(matterData: MatterData) {
    const { profileName } = matterData;
    const isProfileNameMismatch = profileName && profileName !== this.profile.name;
    if (isProfileNameMismatch) {
      const confirm = await openConfirmModal(
        {
          message: this.plugin.i18n.t('error_profileNotMatch'),
          cancelText: this.plugin.i18n.t('profileNotMatch_useOld', {
            profileName: matterData.profileName,
          }),
          confirmText: this.plugin.i18n.t('profileNotMatch_useNew', {
            profileName: this.profile.name,
          }),
        },
        this.plugin,
      );
      if (confirm.code !== ConfirmCode.Cancel) {
        delete matterData.postId;
        matterData.categories = this.profile.lastSelectedCategories ?? [1];
      }
    }
  }

  private async tryToPublish(params: {
    postParams: BloggerPostParams;
    updateMatterData?: (matter: MatterData) => void;
  }): Promise<BloggerClientResult<BloggerPublishResult>> {
    const { postParams, updateMatterData } = params;
    const tagTerms = await this.getTags(postParams.tags);
    postParams.tags = tagTerms.map((term) => term.id);
    await this.updatePostImages(postParams);
    const result = await this.publish(
      postParams.title ?? 'A post from Obsidian!',
      AppState.getInstance().markdownParser.render(postParams.content) ?? '',
      postParams,
    );
    if (result.code === BloggerClientReturnCode.Error) {
      throw new Error(
        this.plugin.i18n.t('error_publishFailed', {
          code: result.error.code as string,
          message: result.error.message,
        }),
      );
    } else {
      new Notice(this.plugin.i18n.t('message_publishSuccessfully'));
      // post id will be returned if creating, true if editing
      const postId = result.data.postId;
      if (postId) {
        // const modified = matter.stringify(postParams.content, matterData, matterOptions);
        // this.updateFrontMatter(modified);
        const file = this.plugin.app.workspace.getActiveFile();
        if (file) {
          await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
            fm.profileName = this.profile.name;
            fm.postId = postId;
            fm.postType = postParams.postType;
            if (postParams.postType === PostTypeConst.Post) {
              fm.categories = postParams.categories;
            }
            if (isFunction(updateMatterData)) {
              updateMatterData(fm);
            }
          });
        }

        if (this.plugin.settings.rememberLastSelectedCategories) {
          this.profile.lastSelectedCategories = (result.data as SafeAny).categories;
          await this.plugin.saveSettings();
        }

        if (this.plugin.settings.showBloggerEditConfirm) {
          openPostPublishedModal(this.plugin).then(() => {
            openWithBrowser(`${this.profile.endpoint}/wp-admin/post.php`, {
              action: 'edit',
              post: postId,
            });
          });
        }
      }
    }
    return result;
  }

  private async updatePostImages(postParams: BloggerPostParams): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile === null) {
      throw new Error(this.plugin.i18n.t('error_noActiveFile'));
    }
    const { activeEditor } = this.plugin.app.workspace;
    if (activeEditor && activeEditor.editor) {
      // process images
      const images = getImages(postParams.content);
      for (const img of images) {
        if (!img.srcIsUrl) {
          const splitFile = img.src.split('.');
          const ext = splitFile.pop();
          const fileName = splitFile.join('.');
          // @ts-expect-error
          let filePath = (await this.plugin.app.vault.getAvailablePathForAttachments(
            fileName,
            ext,
            activeFile,
          )) as string;
          const pathRegex = /(.*) \d+\.(.*)/;
          filePath = filePath.replace(pathRegex, '$1.$2');
          const imgFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
          if (imgFile instanceof TFile) {
            const content = await this.plugin.app.vault.readBinary(imgFile);
            const fileType = fileTypeChecker.detectFile(content);
            const result = await this.uploadMedia({
              mimeType: fileType?.mimeType ?? 'application/octet-stream',
              fileName: imgFile.name,
              content: content,
            });
            if (result.code === BloggerClientReturnCode.OK) {
              if (this.plugin.settings.replaceMediaLinks) {
                postParams.content = postParams.content.replace(
                  img.original,
                  `![${imgFile.name}](${result.data.url})`,
                );
              }
            } else {
              if (result.error.code === BloggerClientReturnCode.ServerInternalError) {
                new Notice(result.error.message, ERROR_NOTICE_TIMEOUT);
              } else {
                new Notice(
                  this.plugin.i18n.t('error_mediaUploadFailed', {
                    name: imgFile.name,
                  }),
                  ERROR_NOTICE_TIMEOUT,
                );
              }
            }
          }
          activeEditor.editor.setValue(postParams.content);
        } else {
          // src is a url, skip uploading
        }
      }
    }
  }

  async publishPost(
    defaultPostParams?: BloggerPostParams,
  ): Promise<BloggerClientResult<BloggerPublishResult>> {
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(this.plugin.i18n.t('error_noEndpoint'));
      }
      // const { activeEditor } = this.plugin.app.workspace;
      const file = this.plugin.app.workspace.getActiveFile();
      if (file === null) {
        throw new Error(this.plugin.i18n.t('error_noActiveFile'));
      }

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.plugin.app);

      // check if profile selected is matched to the one in note property,
      // if not, ask whether to update or not
      await this.checkExistingProfile(matterData);

      // now we're preparing the publishing data
      let postParams: BloggerPostParams;
      let result: BloggerClientResult<BloggerPublishResult> | undefined;
      if (defaultPostParams) {
        postParams = this.readFromFrontMatter(title, matterData, defaultPostParams);
        postParams.content = content;
        result = await this.tryToPublish({
          postParams,
        });
      } else {
        const categories = await this.getCategories();
        const selectedCategories = (matterData.categories as number[]) ??
          this.profile.lastSelectedCategories ?? [1];
        const postTypes = await this.getPostTypes();
        if (postTypes.length === 0) {
          postTypes.push(PostTypeConst.Post);
        }
        const selectedPostType = matterData.postType ?? PostTypeConst.Post;
        result = await new Promise((resolve) => {
          const publishModal = new WpPublishModal(
            this.plugin,
            { items: categories, selected: selectedCategories },
            { items: postTypes, selected: selectedPostType },
            async (
              postParams: BloggerPostParams,
              updateMatterData: (matter: MatterData) => void,
            ) => {
              postParams = this.readFromFrontMatter(title, matterData, postParams);
              postParams.content = content;
              try {
                const r = await this.tryToPublish({
                  postParams,
                  updateMatterData,
                });
                if (r.code === BloggerClientReturnCode.OK) {
                  publishModal.close();
                  resolve(r);
                }
              } catch (error) {
                if (error instanceof Error) {
                  return showError(error);
                } else {
                  throw error;
                }
              }
            },
            matterData,
          );
          publishModal.open();
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(this.plugin.i18n.t('message_publishFailed'));
      }
    } catch (error) {
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
  }

  private async getTags(tags: string[]): Promise<Term[]> {
    const results = await Promise.allSettled(tags.map((name) => this.getTag(name)));
    const terms: Term[] = [];
    results.forEach((result) => {
      if (isPromiseFulfilledResult<Term>(result)) {
        terms.push(result.value);
      }
    });
    return terms;
  }

  private readFromFrontMatter(
    noteTitle: string,
    matterData: MatterData,
    params: BloggerPostParams,
  ): BloggerPostParams {
    const postParams = { ...params };
    postParams.title = noteTitle;
    if (matterData.title) {
      postParams.title = matterData.title;
    }
    if (matterData.postId) {
      postParams.postId = matterData.postId;
    }
    postParams.profileName = matterData.profileName ?? WP_DEFAULT_PROFILE_NAME;
    if (matterData.postType) {
      postParams.postType = matterData.postType;
    } else {
      // if there is no post type in matter-data, assign it as 'post'
      postParams.postType = PostTypeConst.Post;
    }
    if (postParams.postType === PostTypeConst.Post) {
      // only 'post' supports categories and tags
      if (matterData.categories) {
        postParams.categories =
          (matterData.categories as number[]) ?? this.profile.lastSelectedCategories;
      }
      if (matterData.tags) {
        postParams.tags = matterData.tags as string[];
      }
    }
    return postParams;
  }
}

interface Image {
  original: string;
  src: string;
  altText?: string;
  width?: string;
  height?: string;
  srcIsUrl: boolean;
  startIndex: number;
  endIndex: number;
  file?: TFile;
  content?: ArrayBuffer;
}

function getImages(content: string): Image[] {
  const paths: Image[] = [];

  // for ![Alt Text](image-url)
  let regex = /(!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]\((.*?)\))/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[5],
      altText: match[2],
      width: match[3],
      height: match[4],
      original: match[1],
      startIndex: match.index,
      endIndex: match.index + match.length,
      srcIsUrl: isValidUrl(match[5]),
    });
  }

  // for ![[image-name]]
  regex = /(!\[\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]])/g;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[2],
      original: match[1],
      width: match[3],
      height: match[4],
      startIndex: match.index,
      endIndex: match.index + match.length,
      srcIsUrl: isValidUrl(match[2]),
    });
  }

  return paths;
}
