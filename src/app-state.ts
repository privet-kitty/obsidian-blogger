import MarkdownIt from 'markdown-it';
import { MarkdownItImagePluginInstance } from './markdown-it-image-plugin';
import { isEmpty, trim } from 'lodash-es';
import { I18n, LanguageWithAuto } from './i18n';

export class AppState {
  private static instance: AppState;

  markdownParser = new MarkdownIt().use(MarkdownItImagePluginInstance.plugin);
  #i18n = new I18n();
  get i18n() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#i18n!;
  }
  setLang = (lang?: LanguageWithAuto) => {
    this.#i18n = new I18n(lang);
  };

  private constructor() {
    this.markdownParser.renderer.rules.image = (tokens, idx) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      const src = token.attrs ? token.attrs[srcIndex][1] : '';
      const altText = token.content;

      const [alt, size] = altText.split('|');
      let width;
      let height;
      if (!isEmpty(size)) {
        const sepIndex = size.indexOf('x'); // width x height
        if (sepIndex > 0) {
          width = trim(size.substring(0, sepIndex));
          height = trim(size.substring(sepIndex + 1));
        } else {
          width = trim(size);
        }
      }
      if (width) {
        if (height) {
          return `<img src="${src}" width="${width}" height="${height}" alt="${alt}">`;
        }
        return `<img src="${src}" width="${width}" alt="${alt}">`;
      } else {
        return `<img src="${src}" alt="${alt}">`;
      }
    };
  }

  static get(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }
}
