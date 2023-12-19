import {
  BloggerClientResult,
  BloggerClientReturnCode,
  BloggerMediaUploadResult,
  BloggerPostParams,
  BloggerPublishResult,
} from './wp-client';
import { AbstractBloggerClient } from './abstract-wp-client';
import BloggerPlugin from './main';
import { PostType, Term } from './wp-api';
import { RestClient } from './rest-client';
import { isFunction, isNumber, isString, template } from 'lodash-es';
import { WpProfile } from './wp-profile';
import { FormItemNameMapper, FormItems, Media, SafeAny } from './types';
import { BLOGGER_API_ENDPOINT } from './consts';
import { OAuth2Client } from './oauth2-client';

interface WpRestEndpoint {
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

export class WpRestClient extends AbstractBloggerClient {
  private readonly client: RestClient;

  constructor(
    readonly plugin: BloggerPlugin,
    readonly profile: WpProfile,
    private readonly context: WpRestClientContext,
  ) {
    super(plugin, profile);
    this.name = 'WpRestClient';
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint)),
    });
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = this.profile.googleOAuth2Token;
    if (!token) {
      throw new Error(this.plugin.i18n.t('error_invalidGoogleToken'));
    }
    const fresh_token = await OAuth2Client.getWpOAuth2Client(this.plugin).ensureFreshToken(token);
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
      url = getUrl(this.context.endpoints?.editPost, 'wp-json/wp/v2/posts/<%= postId %>', {
        postId: postParams.postId,
      });
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'wp-json/wp/v2/posts');
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
    console.log('WpRestClient response', resp);
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
      getUrl(this.context.endpoints?.getCategories, 'wp-json/wp/v2/categories'),
      {
        headers: await this.getHeaders(),
      },
    );
    return this.context.responseParser.toTerms(data);
  }

  async getPostTypes(): Promise<PostType[]> {
    const data: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getPostTypes, 'wp-json/wp/v2/types'),
      {
        headers: await this.getHeaders(),
      },
    );
    return this.context.responseParser.toPostTypes(data);
  }

  async getTag(name: string): Promise<Term> {
    const termResp: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getTag, 'wp-json/wp/v2/tags?number=1&search=<%= name %>', {
        name,
      }),
    );
    const exists = this.context.responseParser.toTerms(termResp);
    if (exists.length === 0) {
      const resp = await this.client.httpPost(
        getUrl(this.context.endpoints?.newTag, 'wp-json/wp/v2/tags'),
        {
          name,
        },
        {
          headers: await this.getHeaders(),
        },
      );
      console.log('WpRestClient newTag response', resp);
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
        getUrl(this.context.endpoints?.uploadFile, 'wp-json/wp/v2/media'),
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

interface WpRestClientContext {
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

  endpoints?: Partial<WpRestEndpoint>;

  needLoginModal?: boolean;

  formItemNameMapper?: FormItemNameMapper;
}

export class WpRestClientGoogleOAuth2Context implements WpRestClientContext {
  name = 'WpRestClientGoogleOAuth2Context';

  needLoginModal = false;

  endpoints: WpRestEndpoint = {
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
