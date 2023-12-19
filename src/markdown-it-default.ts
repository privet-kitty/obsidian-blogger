import MarkdownIt from 'markdown-it';
import { MarkdownItImagePluginInstance } from './markdown-it-image-plugin';
import { isEmpty, trim } from 'lodash-es';
import { BloggerPluginSettings } from './plugin-settings';
import MarkdownItMathJax3Plugin from './markdown-it-mathjax3-plugin';
import footnote from 'markdown-it-footnote';

export const getDefaultMarkdownParser = () => {
  const markdownParser = new MarkdownIt().use(MarkdownItImagePluginInstance.plugin).use(footnote);
  markdownParser.renderer.rules.image = (tokens, idx) => {
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
  return markdownParser;
};

export const setupMarkdownParser = (
  markdownParser: MarkdownIt,
  settings: BloggerPluginSettings,
): void => {
  markdownParser.use(MarkdownItMathJax3Plugin, {
    outputType: settings.mathJaxOutputType,
  });
};
