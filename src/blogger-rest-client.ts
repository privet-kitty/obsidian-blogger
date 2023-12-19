import {
  BloggerClientResult,
  BloggerClientReturnCode,
  BloggerMediaUploadResult,
  BloggerPostParams,
  BloggerPublishResult,
  BloggerClient,
} from './blogger-client';
import BloggerPlugin from './main';
import { PostType, PostTypeConst, Term } from './blogger-interface';
import { RestClient } from './rest-client';
import { isFunction, isNumber, isString, template } from 'lodash-es';
import { BloggerProfile } from './blogger-profile';
import { FormItemNameMapper, FormItems, Media, SafeAny, MatterData } from './types';
import { BLOGGER_API_ENDPOINT } from './consts';
import { OAuth2Client } from './oauth2-client';
import { Notice, TFile } from 'obsidian';
import { BloggerPublishModal } from './blogger-publish-modal';
import { ERROR_NOTICE_TIMEOUT, WP_DEFAULT_PROFILE_NAME } from './consts';
import {
  isPromiseFulfilledResult,
  isValidUrl,
  openWithBrowser,
  processFile,
  showError,
} from './utils';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import fileTypeChecker from 'file-type-checker';
import { openPostPublishedModal } from './post-published-modal';

export abstract class AbstractBloggerClient implements BloggerClient {
  /**
   * Client name.
   */
  name = 'AbstractBloggerClient';

  protected constructor(
    protected readonly plugin: BloggerPlugin,
    protected readonly profile: BloggerProfile,
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
            openWithBrowser(`${this.profile.endpoint}/blogger-admin/post.php`, {
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
          const publishModal = new BloggerPublishModal(
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

interface BloggerRestEndpoint {
  base: string | UrlGetter;
  byUrl: string | UrlGetter;
  newPost: string | UrlGetter;
  editPost: string | UrlGetter;
  getCategories: string | UrlGetter;
  newTag: string | UrlGetter;
  getTag: string | UrlGetter;
  uploadFile: string | UrlGetter;
  getPostTypes: string | UrlGetter;
}

export class BloggerRestClient extends AbstractBloggerClient {
  private readonly client: RestClient;

  constructor(
    readonly plugin: BloggerPlugin,
    readonly profile: BloggerProfile,
    private readonly context: BloggerRestClientContext,
  ) {
    super(plugin, profile);
    this.name = 'BloggerRestClient';
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint)),
    });
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = this.profile.googleOAuth2Token;
    if (!token) {
      throw new Error(this.plugin.i18n.t('error_invalidGoogleToken'));
    }
    const fresh_token = await OAuth2Client.getGoogleOAuth2Client(this.plugin).ensureFreshToken(
      token,
    );
    if (token !== fresh_token) {
      this.profile.googleOAuth2Token = fresh_token;
      await this.plugin.saveSettings();
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${fresh_token.accessToken}`,
    };
    return headers;
  }

  async publish(
    title: string,
    content: string,
    postParams: BloggerPostParams,
  ): Promise<BloggerClientResult<BloggerPublishResult>> {
    let url: string;
    if (postParams.postId) {
      url = getUrl(this.context.endpoints?.editPost, 'blogger-json/wp/v2/posts/<%= postId %>', {
        postId: postParams.postId,
      });
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'blogger-json/wp/v2/posts');
    }
    const resp: SafeAny = await this.client.httpPost(
      url,
      {
        title,
        content,
        status: postParams.status,
        categories: postParams.categories,
        tags: postParams.tags ?? [],
      },
      {
        headers: await this.getHeaders(),
      },
    );
    console.log('BloggerRestClient response', resp);
    try {
      const result = this.context.responseParser.toBloggerPublishResult(postParams, resp);
      return {
        code: BloggerClientReturnCode.OK,
        data: result,
        response: resp,
      };
    } catch (e) {
      return {
        code: BloggerClientReturnCode.Error,
        error: {
          code: BloggerClientReturnCode.ServerInternalError,
          message: this.plugin.i18n.t('error_cannotParseResponse'),
        },
        response: resp,
      };
    }
  }

  async getCategories(): Promise<Term[]> {
    const data = await this.client.httpGet(
      getUrl(this.context.endpoints?.getCategories, 'blogger-json/wp/v2/categories'),
      {
        headers: await this.getHeaders(),
      },
    );
    return this.context.responseParser.toTerms(data);
  }

  async getPostTypes(): Promise<PostType[]> {
    const data: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getPostTypes, 'blogger-json/wp/v2/types'),
      {
        headers: await this.getHeaders(),
      },
    );
    return this.context.responseParser.toPostTypes(data);
  }

  async getTag(name: string): Promise<Term> {
    const termResp: SafeAny = await this.client.httpGet(
      getUrl(
        this.context.endpoints?.getTag,
        'blogger-json/wp/v2/tags?number=1&search=<%= name %>',
        {
          name,
        },
      ),
    );
    const exists = this.context.responseParser.toTerms(termResp);
    if (exists.length === 0) {
      const resp = await this.client.httpPost(
        getUrl(this.context.endpoints?.newTag, 'blogger-json/wp/v2/tags'),
        {
          name,
        },
        {
          headers: await this.getHeaders(),
        },
      );
      console.log('BloggerRestClient newTag response', resp);
      return this.context.responseParser.toTerm(resp);
    } else {
      return exists[0];
    }
  }

  async uploadMedia(media: Media): Promise<BloggerClientResult<BloggerMediaUploadResult>> {
    try {
      const formItems = new FormItems();
      formItems.append('file', media);

      const response: SafeAny = await this.client.httpPost(
        getUrl(this.context.endpoints?.uploadFile, 'blogger-json/wp/v2/media'),
        formItems,
        {
          headers: {
            ...(await this.getHeaders()),
          },
          formItemNameMapper: this.context.formItemNameMapper,
        },
      );
      const result = this.context.responseParser.toBloggerMediaUploadResult(response);
      return {
        code: BloggerClientReturnCode.OK,
        data: result,
        response,
      };
    } catch (e: SafeAny) {
      console.error('uploadMedia', e);
      return {
        code: BloggerClientReturnCode.Error,
        error: {
          code: BloggerClientReturnCode.ServerInternalError,
          message: e.toString(),
        },
        response: undefined,
      };
    }
  }
}

type UrlGetter = () => string;

function getUrl(
  url: string | UrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string | number },
): string {
  let resultUrl: string;
  if (isString(url)) {
    resultUrl = url;
  } else if (isFunction(url)) {
    resultUrl = url();
  } else {
    resultUrl = defaultValue;
  }
  if (params) {
    const compiled = template(resultUrl);
    return compiled(params);
  } else {
    return resultUrl;
  }
}

interface BloggerRestClientContext {
  name: string;

  responseParser: {
    toBloggerPublishResult: (
      postParams: BloggerPostParams,
      response: SafeAny,
    ) => BloggerPublishResult;
    /**
     * Convert response to `BloggerMediaUploadResult`.
     *
     * If there is any error, throw new error directly.
     * @param response response from remote server
     */
    toBloggerMediaUploadResult: (response: SafeAny) => BloggerMediaUploadResult;
    toTerms: (response: SafeAny) => Term[];
    toTerm: (response: SafeAny) => Term;
    toPostTypes: (response: SafeAny) => PostType[];
  };

  endpoints?: Partial<BloggerRestEndpoint>;

  needLoginModal?: boolean;

  formItemNameMapper?: FormItemNameMapper;
}

export class BloggerRestClientGoogleOAuth2Context implements BloggerRestClientContext {
  name = 'BloggerRestClientGoogleOAuth2Context';

  needLoginModal = false;

  endpoints: BloggerRestEndpoint = {
    base: BLOGGER_API_ENDPOINT,
    byUrl: () => `/sites/<%= site %>/posts/suggest`,
    newPost: () => `/rest/v1.1/sites/${this.blogId}/posts/new`,
    editPost: () => `/rest/v1.1/sites/${this.blogId}/posts/<%= postId %>`,
    getCategories: () => `/rest/v1.1/sites/${this.blogId}/categories`,
    newTag: () => `/rest/v1.1/sites/${this.blogId}/tags/new`,
    getTag: () => `/rest/v1.1/sites/${this.blogId}/tags?number=1&search=<%= name %>`,
    uploadFile: () => `/rest/v1.1/sites/${this.blogId}/media/new`,
    getPostTypes: () => `/rest/v1.1/sites/${this.blogId}/post-types`,
  };

  constructor(private readonly blogId: string, private readonly accessToken: string) {
    console.log(`${this.name} loaded`);
  }

  formItemNameMapper(name: string, isArray: boolean): string {
    if (name === 'file' && !isArray) {
      return 'media[]';
    }
    return name;
  }

  responseParser = {
    toBloggerPublishResult: (
      postParams: BloggerPostParams,
      response: SafeAny,
    ): BloggerPublishResult => {
      if (response.ID) {
        return {
          postId: postParams.postId ?? response.ID,
          categories:
            postParams.categories ??
            Object.values(response.categories).map((cat: SafeAny) => cat.ID),
        };
      }
      throw new Error('xx');
    },
    toBloggerMediaUploadResult: (response: SafeAny): BloggerMediaUploadResult => {
      if (response.media.length > 0) {
        const media = response.media[0];
        return {
          url: media.link,
        };
      } else if (response.errors) {
        throw new Error(response.errors.error.message);
      }
      throw new Error('Upload failed');
    },
    toTerms: (response: SafeAny): Term[] => {
      if (isNumber(response.found)) {
        return response.categories.map((it: Term & { ID: number }) => ({
          ...it,
          id: String(it.ID),
        }));
      }
      return [];
    },
    toTerm: (response: SafeAny): Term => ({
      ...response,
      id: response.ID,
    }),
    toPostTypes: (response: SafeAny): PostType[] => {
      if (isNumber(response.found)) {
        return response.post_types.map((it: { name: string }) => it.name);
      }
      return [];
    },
  };
}
