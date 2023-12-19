import { I18n, LanguageWithAuto } from './i18n';
import { getDefaultMarkdownParser } from './markdown-it-default';

export class AppState {
  private static instance: AppState;

  #i18n = new I18n();
  get i18n() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#i18n!;
  }
  setLang = (lang?: LanguageWithAuto) => {
    this.#i18n = new I18n(lang);
  };

  markdownParser = getDefaultMarkdownParser();

  static get(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }
}
