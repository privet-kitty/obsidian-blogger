import { addIcon } from 'obsidian';

const icons: Record<string, string> = {
  'blogger-logo': `
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
  <svg xmlns="http://www.w3.org/2000/svg" style="background-color: rgb(255, 255, 255);" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100px" height="100px" viewBox="-0.5 -0.5 100 100" content="&lt;mxfile host=&quot;app.diagrams.net&quot; modified=&quot;2023-12-22T22:37:23.594Z&quot; agent=&quot;Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0&quot; version=&quot;22.1.11&quot; etag=&quot;9i-i_tWQHQ03LrWQvptQ&quot; type=&quot;google&quot;&gt;&lt;diagram name=&quot;ページ1&quot; id=&quot;y5oS7SAGg9v04mdGWV13&quot;&gt;jZNNb4MwDIZ/DXcgatcdR7dul506aeeIuCRaEqM0LXS/fqY4BVRVWi4kj+34Iy+Z2Lr+PchWf6ICm5W56jPxmpVlka9y+gzkMpJ1vhpBE4xipwnszS+kSKYno+C4cIyINpp2CWv0Huq4YDIE7JZuB7TLrK1s4A7sa2nv6bdRUY90Uz5N/ANMo1PmYv08WpxMztzJUUuF3QyJt0xsA2Icd67fgh2Gl+Yyxu0eWG+FBfDxPwHlGHCW9sS9VVxYvKRuI/R0V6WjswQK2h5jwB/YosVAxKMnz+pgrE0oK8X6uohLaxpPrKaSgIzVGUI0NMwXNjij1JCr6rSJsG9lPSTuSDrEAp68ArVInGYuhqzoIwtkk/N5VsXuupjvpDN2kNyX1OhkiuZOeXZDddA/HGdxeyRSN6CDGC7kwgFiw+/KwhY5n7tJJkViei6RBCVLs7ndPb0ebfgB03ESytU2+93E2x8=&lt;/diagram&gt;&lt;/mxfile&gt;"><defs/><g><rect x="0" y="0" width="100" height="100" rx="15" ry="15" fill="#666666" stroke="none" pointer-events="all"/><g transform="translate(-0.5 -0.5)"><switch><foreignObject style="overflow: visible; text-align: left;" pointer-events="none" width="100%" height="100%" requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"><div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; align-items: unsafe center; justify-content: unsafe center; width: 98px; height: 1px; padding-top: 50px; margin-left: 1px;"><div style="box-sizing: border-box; font-size: 0px; text-align: center;" data-drawio-colors="color: #FFFFFF; "><div style="display: inline-block; font-size: 80px; font-family: Tahoma; color: rgb(255, 255, 255); line-height: 1.2; pointer-events: all; font-weight: bold; white-space: normal; overflow-wrap: normal;">B</div></div></div></foreignObject><text x="50" y="74" fill="#FFFFFF" font-family="Tahoma" font-size="80px" text-anchor="middle" font-weight="bold">B</text></switch></g></g><switch><g requiredFeatures="http://www.w3.org/TR/SVG11/feature#Extensibility"/><a transform="translate(0,-5)" xlink:href="https://www.drawio.com/doc/faq/svg-export-text-problems" target="_blank"><text text-anchor="middle" font-size="10px" x="50%" y="100%">Text is not SVG - cannot display</text></a></switch></svg>`,
};

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
};
