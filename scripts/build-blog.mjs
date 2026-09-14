// Prerenders content/blog/<slug>/index.md into static HTML under dist/blog/,
// plus the blog index and dist/sitemap.xml. Runs after `vite build`.
//
// The pages are plain HTML (no React) so crawlers get the full article without
// running JavaScript. Anything structurally wrong with a post (missing field,
// broken internal link, missing image) fails the build, so a bad post never
// replaces the live site: Vercel keeps serving the last good deployment.
//
//   node scripts/build-blog.mjs           build into dist/
//   node scripts/build-blog.mjs --check   validate only, write nothing

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content', 'blog');
const DIST = join(ROOT, 'dist');
const CHECK_ONLY = process.argv.includes('--check');

const SITE = 'https://www.meownoteapp.com';
const APP_URL = 'https://apps.apple.com/app/id6776287385';
const APP_ID = '6776287385';
const COMPANY_URL =
  'https://demind-inc.notion.site/Company-Info-f7164ebf909b4c42a38ae6951d8376b2?source=copy_link';
const TITLE_SUFFIX = ' | meow note';
const MAX_TITLE = 58; // + suffix stays inside Google's ~70-char title display
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE_WARN_BYTES = 500_000;

const errors = [];
const warnings = [];

// ---------------------------------------------------------------- parsing

function parseFrontmatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) {
    errors.push(`${file}: missing --- frontmatter block`);
    return { data: {}, body: raw };
  }
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) {
      errors.push(`${file}: bad frontmatter line "${line}"`);
      continue;
    }
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        errors.push(`${file}: ${key} is not a valid double-quoted string`);
      }
    }
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    data[key] = value;
  }
  return { data, body: m[2] };
}

function loadPosts() {
  if (!existsSync(CONTENT)) return [];
  const posts = [];
  for (const slug of readdirSync(CONTENT).sort()) {
    const dir = join(CONTENT, slug);
    if (!statSync(dir).isDirectory()) continue;
    const file = `content/blog/${slug}/index.md`;
    const mdPath = join(dir, 'index.md');
    if (!existsSync(mdPath)) {
      errors.push(`${file}: missing`);
      continue;
    }
    const { data, body } = parseFrontmatter(readFileSync(mdPath, 'utf8'), file);
    if (data.draft === true) continue;

    if (!SLUG_RE.test(slug)) errors.push(`${file}: folder name "${slug}" is not a valid slug`);
    for (const key of ['title', 'description', 'date', 'keyword', 'cover', 'coverAlt']) {
      if (!data[key]) errors.push(`${file}: frontmatter "${key}" is required`);
    }
    if (data.title && data.title.length > MAX_TITLE) {
      errors.push(`${file}: title is ${data.title.length} chars, max ${MAX_TITLE}`);
    }
    if (data.description && (data.description.length < 70 || data.description.length > 160)) {
      errors.push(`${file}: description is ${data.description.length} chars, want 70-160`);
    }
    for (const key of ['date', 'updated']) {
      if (data[key] && !/^\d{4}-\d{2}-\d{2}$/.test(data[key])) {
        errors.push(`${file}: ${key} must be YYYY-MM-DD`);
      }
    }
    if (data.cover && !existsSync(join(dir, data.cover))) {
      errors.push(`${file}: cover "${data.cover}" not found in the post folder`);
    }
    if (/^#\s/m.test(body)) errors.push(`${file}: body must not contain an H1 (the title is the H1)`);

    const assets = readdirSync(dir).filter((f) => f !== 'index.md' && !f.startsWith('.'));
    for (const a of assets) {
      const size = statSync(join(dir, a)).size;
      if (/\.(png|jpe?g|webp|gif)$/i.test(a) && size > IMAGE_WARN_BYTES) {
        warnings.push(`${file}: ${a} is ${Math.round(size / 1024)}KB, compress it`);
      }
    }
    posts.push({ slug, dir, file, body, assets, ...data });
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

// ---------------------------------------------------------------- rendering

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const headingId = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function renderBody(post, slugs) {
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${headingId(inner)}">${inner}</h${depth}>\n`;
      },
      image({ href, title, text }) {
        let src = href;
        if (!/^(https?:)?\/\//.test(href) && !href.startsWith('/')) {
          if (!post.assets.includes(href)) errors.push(`${post.file}: image "${href}" not found in the post folder`);
          src = `/blog/${post.slug}/${href}`;
        }
        if (!text) errors.push(`${post.file}: image "${href}" has no alt text`);
        const caption = title ? `<figcaption>${esc(title)}</figcaption>` : '';
        return `<figure><img src="${esc(src)}" alt="${esc(text)}" loading="lazy" decoding="async">${caption}</figure>`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const t = title ? ` title="${esc(title)}"` : '';
        const internal = href.match(/^\/blog\/([^/#?]+)/);
        if (internal && !slugs.has(internal[1])) {
          errors.push(`${post.file}: internal link ${href} points at a post that does not exist`);
        }
        if (/^https?:\/\//.test(href) && !href.startsWith(SITE)) {
          return `<a href="${esc(href)}"${t} target="_blank" rel="noopener">${inner}</a>`;
        }
        return `<a href="${esc(href)}"${t}>${inner}</a>`;
      },
    },
  });
  // Wide comparison tables scroll inside their own box instead of the page.
  return marked
    .parse(post.body)
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>');
}

const wordCount = (md) => md.replace(/[#>*_`[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length;

const formatDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

function related(post, posts) {
  const words = (p) => new Set(`${p.keyword} ${p.title}`.toLowerCase().match(/[a-z]{4,}/g) || []);
  const mine = words(post);
  return posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: [...words(p)].filter((w) => mine.has(w)).length }))
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, 3)
    .map(({ p }) => p);
}

const badgeSvg = readFileSync(join(ROOT, 'src', 'assets', 'download-ios.svg'), 'utf8')
  .replace(/<\?xml[^>]*>/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<!DOCTYPE[^>]*>/, '')
  .trim();
const badgeDataUri = `data:image/svg+xml;base64,${Buffer.from(badgeSvg).toString('base64')}`;

const CSS = readFileSync(join(ROOT, 'scripts', 'blog.css'), 'utf8');

function layout({ title, description, canonical, ogType, ogImage, jsonLd, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="theme-color" content="#161334" />
    <meta name="apple-itunes-app" content="app-id=${APP_ID}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="meow note" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@700;800&family=Nunito+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
    <style>${CSS}</style>
    ${jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n    ')}
  </head>
  <body>
    <header class="nav">
      <div class="nav__inner">
        <a class="brand" href="/"><img src="/favicon.ico" alt="" width="28" height="28" /><span>meow note</span></a>
        <nav class="nav__links" aria-label="Main">
          <a href="/blog">Blog</a>
          <a class="nav__cta" href="${APP_URL}">Get the app</a>
        </nav>
      </div>
    </header>
${body}
    <footer class="footer">
      <div class="footer__inner">
        <span>Copyright ${new Date().getUTCFullYear()} © DeMind Inc.</span>
        <nav aria-label="Footer">
          <a href="/">Home</a>
          <a href="/blog">Blog</a>
          <a href="${COMPANY_URL}" target="_blank" rel="noopener noreferrer">Company</a>
          <a href="mailto:contact@demind-inc.com">Contact</a>
        </nav>
      </div>
    </footer>
  </body>
</html>
`;
}

function cta() {
  return `<aside class="cta" aria-label="Download meow note">
          <div class="cta__copy">
            <p class="cta__title">Put the day down before bed.</p>
            <p class="cta__text">meow note is a calming bedtime journal for iPhone. Speak or write what is on your mind, check in on your mood, and fall asleep lighter.</p>
          </div>
          <a class="cta__badge" href="${APP_URL}"><img src="${badgeDataUri}" alt="Download on the App Store" width="135" height="40" /></a>
        </aside>`;
}

function card(p) {
  return `<a class="card" href="/blog/${p.slug}">
            <img src="/blog/${p.slug}/${p.cover}" alt="${esc(p.coverAlt)}" loading="lazy" decoding="async" />
            <span class="card__body">
              <span class="card__date">${formatDate(p.date)}</span>
              <span class="card__title">${esc(p.title)}</span>
              <span class="card__desc">${esc(p.description)}</span>
            </span>
          </a>`;
}

function postPage(post, posts, html) {
  const url = `${SITE}/blog/${post.slug}`;
  const image = `${SITE}/blog/${post.slug}/${post.cover}`;
  const minutes = Math.max(1, Math.round(wordCount(post.body) / 220));
  const rel = related(post, posts);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'meow note', url: SITE },
      publisher: {
        '@type': 'Organization',
        name: 'DeMind Inc.',
        logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  const body = `    <main class="post">
      <div class="post__head">
        <p class="crumbs"><a href="/blog">Blog</a></p>
        <h1>${esc(post.title)}</h1>
        <p class="post__meta">${post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.date)} · ${minutes} min read</p>
      </div>
      <img class="post__cover" src="/blog/${post.slug}/${post.cover}" alt="${esc(post.coverAlt)}" fetchpriority="high" />
      <article class="paper">
        <div class="prose">
${html}
        </div>
        ${cta()}
      </article>
${
  rel.length
    ? `      <section class="more" aria-label="More from the blog">
        <h2>Keep reading</h2>
        <div class="grid">
          ${rel.map(card).join('\n          ')}
        </div>
      </section>`
    : ''
}
    </main>`;
  return layout({
    title: post.title + TITLE_SUFFIX,
    description: post.description,
    canonical: url,
    ogType: 'article',
    ogImage: image,
    jsonLd,
    body,
  });
}

function indexPage(posts) {
  const title = 'Bedtime Journaling & Better Sleep Blog | meow note';
  const description =
    'Guides on bedtime journaling, quieting a racing mind at night, and building a wind-down routine that helps you sleep. From the makers of meow note.';
  const body = `    <main class="index">
      <div class="post__head">
        <h1>The meow note blog</h1>
        <p class="index__lede">Gentle, practical guides for the hour before sleep: journaling, letting go of the day, and quieting a busy mind.</p>
      </div>
      ${
        posts.length
          ? `<div class="grid">
          ${posts.map(card).join('\n          ')}
        </div>`
          : '<p class="index__empty">The first posts are on their way.</p>'
      }
    </main>`;
  return layout({
    title,
    description,
    canonical: `${SITE}/blog`,
    ogType: 'website',
    ogImage: `${SITE}/og-image.png`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'The meow note blog',
        url: `${SITE}/blog`,
        description,
      },
    ],
    body,
  });
}

function sitemap(posts) {
  const urls = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/blog`, lastmod: posts[0]?.updated || posts[0]?.date },
    ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.updated || p.date })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------- main

const posts = loadPosts();
const slugs = new Set(posts.map((p) => p.slug));
const rendered = posts.map((p) => ({ post: p, html: renderBody(p, slugs) }));

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\nblog build failed: ${errors.length} error(s)`);
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log(`blog check ok: ${posts.length} post(s)`);
  process.exit(0);
}

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ is missing, run `vite build` first');
  process.exit(1);
}

mkdirSync(join(DIST, 'blog'), { recursive: true });
writeFileSync(join(DIST, 'blog', 'index.html'), indexPage(posts));
for (const { post, html } of rendered) {
  const out = join(DIST, 'blog', post.slug);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), postPage(post, posts, html));
  for (const a of post.assets) {
    if (extname(a)) copyFileSync(join(post.dir, a), join(out, a));
  }
}
writeFileSync(join(DIST, 'sitemap.xml'), sitemap(posts));
console.log(`blog built: ${posts.length} post(s) → dist/blog/`);
