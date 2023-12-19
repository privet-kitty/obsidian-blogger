import {
  BloggerClientResult,
  BloggerClientReturnCode,
  BloggerMediaUploadResult,
  BloggerPostParams,
  BloggerPublishResult,
  BloggerClient,
  PostStatus,
} from './blogger-client-interface';
import BloggerPlugin from './main';
import { RestClient } from './rest-client';
import { isFunction, isString, template } from 'lodash-es';
import { BloggerProfile } from './blogger-profile';
import { FormItemNameMapper, SafeAny, MatterData } from './types';
import { BLOGGER_API_ENDPOINT } from './consts';
import { OAuth2Client } from './oauth2-client';
import { Notice } from 'obsidian';
import { BloggerPublishModal } from './blogger-publish-modal';
import { WP_DEFAULT_PROFILE_NAME } from './consts';
import { openWithBrowser, processFile, showError } from './utils';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
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

  private async checkExistingProfile(matterData: MatterData) {
    const { profileName } = matterData;
    const isProfileNameMismatch = profileName && profileName !== this.profile.name;
    if (isProfileNameMismatch) {
      const confirm = await openConfirmModal(
        {
          message: AppState.get().i18n.t('error_profileNotMatch'),
          cancelText: AppState.get().i18n.t('profileNotMatch_useOld', {
            profileName: matterData.profileName,
          }),
          confirmText: AppState.get().i18n.t('profileNotMatch_useNew', {
            profileName: this.profile.name,
          }),
        },
        this.plugin.app,
      );
      if (confirm.code !== ConfirmCode.Cancel) {
        delete matterData.postId;
      }
    }
  }

  private async tryToPublish(params: {
    postParams: BloggerPostParams;
    updateMatterData?: (matter: MatterData) => void;
  }): Promise<BloggerClientResult<BloggerPublishResult>> {
    const { postParams, updateMatterData } = params;
    const result = await this.publish(
      postParams.title ?? 'A post from Obsidian!',
      AppState.get().markdownParser.render(postParams.content) ?? '',
      postParams,
    );
    if (result.code === BloggerClientReturnCode.Error) {
      throw new Error(
        AppState.get().i18n.t('error_publishFailed', {
          code: result.error.code as string,
          message: result.error.message,
        }),
      );
    } else {
      new Notice(AppState.get().i18n.t('message_publishSuccessfully'));
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
            if (isFunction(updateMatterData)) {
              updateMatterData(fm);
            }
          });
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

  async publishPost(
    defaultPostParams?: BloggerPostParams,
  ): Promise<BloggerClientResult<BloggerPublishResult>> {
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(AppState.get().i18n.t('error_noEndpoint'));
      }
      // const { activeEditor } = this.plugin.app.workspace;
      const file = this.plugin.app.workspace.getActiveFile();
      if (file === null) {
        throw new Error(AppState.get().i18n.t('error_noActiveFile'));
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
        result = await new Promise((resolve) => {
          const publishModal = new BloggerPublishModal(
            this.plugin,
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
          );
          publishModal.open();
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(AppState.get().i18n.t('message_publishFailed'));
      }
    } catch (error) {
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
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
    return postParams;
  }
}

interface BloggerRestEndpoint {
  base: string | UrlGetter;
  newPost: string | UrlGetter;
  editPost: string | UrlGetter;
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
    console.log(this.client);
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = this.profile.googleOAuth2Token;
    if (!token) {
      throw new Error(AppState.get().i18n.t('error_invalidGoogleToken'));
    }
    const fresh_token = await OAuth2Client.getGoogleOAuth2Client().ensureFreshToken(token);
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
    let method: typeof this.client.httpPut;
    if (postParams.postId) {
      url = getUrl(this.context.endpoints?.editPost, 'dummy/update/<%= postId %>', {
        postId: postParams.postId,
      });
      method = this.client.httpPut;
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'dummy/post?isDraft=<%= isDraft %>', {
        isDraft: postParams.status === PostStatus.Draft,
      });
      method = this.client.httpPost;
    }
    const resp: SafeAny = await method(
      url,
      {
        kind: 'blogger#post',
        blog: {
          id: this.profile.blogId,
        },
        title,
        content,
        labels: postParams.labels ?? [],
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
          message: AppState.get().i18n.t('error_cannotParseResponse'),
        },
        response: resp,
      };
    }
  }
}

type UrlGetter = () => string;

function getUrl(
  url: string | UrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string | number | boolean },
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
    newPost: () => `/${this.blogId}/posts?isDraft=<%= isDraft %>`,
    editPost: () => `/${this.blogId}/posts/<%= postId %>`,
  };

  constructor(private readonly blogId: string) {
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
      if (response.id) {
        if (postParams.postId !== undefined && postParams.postId !== response.id) {
          throw new Error(
            `Inconsistent post IDs. This should be a bug: ${postParams.postId} vs ${response.id}`,
          );
        }
        return {
          postId: response.id,
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
  };
}

export function getBloggerClient(
  plugin: BloggerPlugin,
  profile: BloggerProfile,
): BloggerClient | null {
  if (!profile.endpoint || profile.endpoint.length === 0) {
    showError(AppState.get().i18n.t('error_noEndpoint'));
    return null;
  }
  if (!profile.googleOAuth2Token) {
    showError(AppState.get().i18n.t('error_invalidGoogleToken'));
    return null;
  }
  if (!profile.blogId) {
    showError(AppState.get().i18n.t('error_noBlogId'));
    return null;
  }
  return new BloggerRestClient(
    plugin,
    profile,
    new BloggerRestClientGoogleOAuth2Context(profile.blogId),
  );
}
