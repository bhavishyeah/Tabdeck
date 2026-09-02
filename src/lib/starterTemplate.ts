import type { BoardItem } from './workspaceTypes';

const uid = () => crypto.randomUUID();
const now = () => Date.now();

function makeLink(title: string, url: string) {
  return { id: uid(), title, url, createdAt: now(), updatedAt: now() };
}

function makeBoard(name: string, links: { title: string; url: string }[], color?: string): BoardItem {
  return {
    id: uid(),
    name,
    type: 'links',
    color,
    links: links.map((l) => makeLink(l.title, l.url)),
    createdAt: now(),
    updatedAt: now(),
  };
}

export function getStarterTemplateBoards(): BoardItem[] {
  return [
    makeBoard('Development', [
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { title: 'Dev.to', url: 'https://dev.to' },
      { title: 'NPM', url: 'https://www.npmjs.com' },
      { title: 'CodePen', url: 'https://codepen.io' },
    ], '#3b82f6'),

    makeBoard('Social', [
      { title: 'Twitter / X', url: 'https://x.com' },
      { title: 'Reddit', url: 'https://www.reddit.com' },
      { title: 'YouTube', url: 'https://www.youtube.com' },
      { title: 'LinkedIn', url: 'https://www.linkedin.com' },
      { title: 'Discord', url: 'https://discord.com' },
    ], '#8b5cf6'),

    makeBoard('Design', [
      { title: 'Dribbble', url: 'https://dribbble.com' },
      { title: 'Figma', url: 'https://www.figma.com' },
      { title: 'Behance', url: 'https://www.behance.net' },
      { title: 'Coolors', url: 'https://coolors.co' },
      { title: 'Google Fonts', url: 'https://fonts.google.com' },
      { title: 'Unsplash', url: 'https://unsplash.com' },
      { title: 'Mobbin', url: 'https://mobbin.com' },
    ], '#ec4899'),

    makeBoard('Productivity', [
      { title: 'Notion', url: 'https://www.notion.so' },
      { title: 'Google Drive', url: 'https://drive.google.com' },
      { title: 'ChatGPT', url: 'https://chat.openai.com' },
      { title: 'Todoist', url: 'https://todoist.com' },
    ], '#10b981'),
  ];
}

/**
 * Returns the starter template as a JSON string for download.
 */
export function getStarterTemplateJSON(): string {
  const boards = getStarterTemplateBoards();
  const template = {
    name: 'Frontly Starter Template',
    version: '1.0',
    boards: boards.map((b) => ({
      name: b.name,
      color: b.color,
      links: b.links.map((l) => ({ title: l.title, url: l.url })),
    })),
  };
  return JSON.stringify(template, null, 2);
}
