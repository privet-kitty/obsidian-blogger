import { App, Notice, Setting, TFile } from 'obsidian';
import { BloggerProfile } from './blogger-profile';
import { AppState } from './app-state';
import { BloggerPluginSettings } from './plugin-settings';
import MarkdownItMathJax3Plugin from './markdown-it-mathjax3-plugin';
import { BloggerClientResult, BloggerClientReturnCode } from './blogger-client-interface';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { format } from 'date-fns';
import { MatterData, SafeAny } from './types';

export function openWithBrowser(
  url: string,
  queryParams: Record<string, undefined | number | string> = {},
): void {
  window.open(`${url}?${generateQueryString(queryParams)}`);
}

export function generateQueryString(params: Record<string, undefined | number | string>): string {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== undefined)) as Record<
      string,
      string
    >,
  ).toString();
}

export function isPromiseFulfilledResult<T>(obj: SafeAny): obj is PromiseFulfilledResult<T> {
  return !!obj && obj.status === 'fulfilled' && obj.value;
}

export function rendererProfile(profile: BloggerProfile, container: HTMLElement): Setting {
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }
  let desc = profile.endpoint;
  if (profile.googleOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  } else {
    if (profile.saveUsername) {
      desc += ` / 🆔 ${profile.username}`;
    }
    if (profile.savePassword) {
      desc += ' / 🔒 ******';
    }
  }
  return new Setting(container).setName(name).setDesc(desc);
}

export function isValidUrl(url: string): boolean {
  try {
    return Boolean(new URL(url));
  } catch (e) {
    return false;
  }
}

export function getBoundary(): string {
  return `----obsidianBoundary${format(new Date(), 'yyyyMMddHHmmss')}`;
}

export function showError<T>(error: unknown): BloggerClientResult<T> {
  let errorMessage: string;
  if (isString(error)) {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = (error as SafeAny).toString();
  }
  new Notice(errorMessage, ERROR_NOTICE_TIMEOUT);
  return {
    code: BloggerClientReturnCode.Error as const,
    error: {
      code: BloggerClientReturnCode.Error,
      message: errorMessage,
    },
  };
}

export async function processFile(
  file: TFile,
  app: App,
): Promise<{ content: string; matter: MatterData }> {
  let fm = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!fm) {
    await app.fileManager.processFrontMatter(file, (matter) => {
      fm = matter;
    });
  }
  const raw = await app.vault.read(file);
  return {
    content: raw.replace(/^---[\s\S]+?---/, '').trim(),
    matter: fm ?? {},
  };
}
