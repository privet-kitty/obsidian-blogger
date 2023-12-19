import { addIcon } from 'obsidian';

const icons: Record<string, string> = {
  'blogger-logo': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <g fill="currentColor">
    <path d="M 7.109375 50 C 7.109375 66.976562 16.976562 81.648438 31.28125 88.601562 L 10.820312 32.542969 C 8.441406 37.878906 7.109375 43.78125 7.109375 50 Z M 7.109375 50 "/>
    <path d="M 78.957031 47.835938 C 78.957031 42.535156 77.054688 38.863281 75.421875 36.003906 C 73.246094 32.472656 71.207031 29.480469 71.207031 25.945312 C 71.207031 22.003906 74.199219 18.332031 78.410156 18.332031 C 78.601562 18.332031 78.78125 18.355469 78.96875 18.367188 C 71.335938 11.375 61.167969 7.105469 50 7.105469 C 35.015625 7.105469 21.832031 14.796875 14.164062 26.441406 C 15.167969 26.472656 16.117188 26.492188 16.921875 26.492188 C 21.410156 26.492188 28.355469 25.949219 28.355469 25.949219 C 30.667969 25.8125 30.941406 29.207031 28.628906 29.480469 C 28.628906 29.480469 26.304688 29.753906 23.722656 29.890625 L 39.339844 76.351562 L 48.726562 48.199219 L 42.042969 29.886719 C 39.734375 29.753906 37.546875 29.480469 37.546875 29.480469 C 35.234375 29.34375 35.507812 25.808594 37.816406 25.945312 C 37.816406 25.945312 44.902344 26.492188 49.117188 26.492188 C 53.601562 26.492188 60.546875 25.945312 60.546875 25.945312 C 62.859375 25.808594 63.132812 29.207031 60.824219 29.480469 C 60.824219 29.480469 58.492188 29.753906 55.914062 29.886719 L 71.414062 75.996094 L 75.691406 61.699219 C 77.546875 55.765625 78.957031 51.507812 78.957031 47.835938 Z M 78.957031 47.835938 "/>
    <path d="M 50.753906 53.75 L 37.882812 91.148438 C 41.726562 92.277344 45.789062 92.894531 50 92.894531 C 54.996094 92.894531 59.785156 92.03125 64.246094 90.464844 C 64.128906 90.28125 64.027344 90.085938 63.941406 89.871094 Z M 50.753906 53.75 "/>
    <path d="M 87.636719 29.417969 C 87.824219 30.785156 87.925781 32.253906 87.925781 33.832031 C 87.925781 38.183594 87.113281 43.074219 84.667969 49.195312 L 71.5625 87.074219 C 84.316406 79.640625 92.894531 65.824219 92.894531 50 C 92.894531 42.542969 90.988281 35.53125 87.636719 29.417969 Z M 87.636719 29.417969 "/>
    <path d="M 50 0 C 22.433594 0 0 22.429688 0 50 C 0 77.570312 22.433594 100 50 100 C 77.570312 100 100.003906 77.570312 100.003906 50 C 100.003906 22.429688 77.570312 0 50 0 Z M 50 97.707031 C 23.695312 97.707031 2.292969 76.304688 2.292969 50 C 2.292969 23.695312 23.695312 2.292969 50 2.292969 C 76.304688 2.292969 97.707031 23.695312 97.707031 50 C 97.707031 76.304688 76.304688 97.707031 50 97.707031 Z M 50 97.707031 "/>
  </g>
</svg>`,
};

export const addIcons = (): void => {
  Object.keys(icons).forEach((key) => {
    addIcon(key, icons[key]);
  });
};
