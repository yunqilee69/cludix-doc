import type {LoadContext, Plugin} from '@docusaurus/types';
import type {LoadedContent as DocsLoadedContent} from '@docusaurus/plugin-content-docs';
import type {BlogPost} from '@docusaurus/plugin-content-blog';

export type RecentUpdate = {
  date: string;
  kind: string;
  title: string;
  to: string;
};

type Candidate = RecentUpdate & {
  timestamp: number;
  group: string;
  isIndex: boolean;
};

type BlogPluginContent = {blogPosts: BlogPost[]};

const LIMIT = 6;
const ROOT_INDEX = /\/(tutorials|troubleshooting|finance|projects)\/?$/;

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function kindFromPermalink(permalink: string): string {
  if (permalink.startsWith('/blog')) {
    return '专题';
  }
  if (permalink.startsWith('/docs/nebula')) {
    return 'Nebula';
  }
  if (permalink.startsWith('/docs/projects')) {
    return '项目';
  }
  if (permalink.startsWith('/docs/troubleshooting')) {
    return '踩坑';
  }
  if (permalink.startsWith('/docs/finance')) {
    return '金融';
  }
  if (permalink.startsWith('/docs/tutorials')) {
    return '教程';
  }
  return '文档';
}

function pickGroupRep(items: Candidate[]): Candidate {
  const newest = Math.max(...items.map(item => item.timestamp));
  const index = items.find(item => item.isIndex);
  const chosen = index ?? items.find(item => item.timestamp === newest) ?? items[0];
  return {...chosen, timestamp: newest, date: formatDate(new Date(newest))};
}

function collectDocs(content: DocsLoadedContent | undefined): Candidate[] {
  if (!content?.loadedVersions) {
    return [];
  }

  return content.loadedVersions.flatMap(version =>
    version.docs.flatMap(doc => {
      if (doc.draft || doc.unlisted || ROOT_INDEX.test(doc.permalink)) {
        return [];
      }
      const date = parseDate(doc.frontMatter.date);
      if (!date) {
        return [];
      }
      return [
        {
          date: formatDate(date),
          kind: kindFromPermalink(doc.permalink),
          title: doc.title,
          to: doc.permalink,
          timestamp: date.getTime(),
          group: `docs:${doc.sourceDirName}`,
          isIndex: doc.source.endsWith('/index.md') || doc.source.endsWith('/index.mdx'),
        },
      ];
    }),
  );
}

function collectBlog(content: BlogPluginContent | undefined): Candidate[] {
  if (!content?.blogPosts) {
    return [];
  }

  return content.blogPosts.flatMap(post => {
    if (post.metadata.unlisted) {
      return [];
    }
    const date = parseDate(post.metadata.date);
    if (!date) {
      return [];
    }
    return [
      {
        date: formatDate(date),
        kind: '专题',
        title: post.metadata.title,
        to: post.metadata.permalink,
        timestamp: date.getTime(),
        group: `blog:${post.metadata.permalink}`,
        isIndex: false,
      },
    ];
  });
}

export default function recentUpdatesPlugin(_context: LoadContext): Plugin {
  return {
    name: 'recent-updates',
    async allContentLoaded({allContent, actions}) {
      const docsContent = allContent['docusaurus-plugin-content-docs']
        ?.default as DocsLoadedContent | undefined;
      const blogContent = allContent['docusaurus-plugin-content-blog']
        ?.default as BlogPluginContent | undefined;

      const grouped = new Map<string, Candidate[]>();
      for (const item of [...collectDocs(docsContent), ...collectBlog(blogContent)]) {
        const bucket = grouped.get(item.group);
        if (bucket) {
          bucket.push(item);
        } else {
          grouped.set(item.group, [item]);
        }
      }

      const updates: RecentUpdate[] = [...grouped.values()]
        .map(pickGroupRep)
        .sort((a, b) => {
          if (a.timestamp === b.timestamp) {
            return a.title.localeCompare(b.title, 'zh');
          }
          return b.timestamp - a.timestamp;
        })
        .slice(0, LIMIT)
        .map(({date, kind, title, to}) => ({date, kind, title, to}));

      actions.setGlobalData({updates});
    },
  };
}
