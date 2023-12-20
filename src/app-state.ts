import { getDefaultMarkdownParser } from './markdown-it-default';

export class AppState {
  private static instance: AppState;
  markdownParser = getDefaultMarkdownParser();

  static get(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }
}
