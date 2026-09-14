# meow note landing page

Vite + React landing page for [meownoteapp.com](https://www.meownoteapp.com), deployed on Vercel
(push to `main` deploys).

## Blog

Posts live in `content/blog/<slug>/index.md`, with the cover and any images in the same folder.
`npm run build` runs `scripts/build-blog.mjs` after `vite build`, which prerenders every post to
static HTML at `/blog/<slug>` (no JavaScript needed to read it), writes the `/blog` index, and
generates `dist/sitemap.xml`. Styles are in `scripts/blog.css` and are inlined into each page.

Frontmatter (all required except `updated` and `draft`):

```
---
title: "How to Stop Overthinking at Night: 7 Gentle Fixes"   # max 58 chars
description: "..."                                            # 70-160 chars
date: 2026-09-15
updated: 2026-10-01
keyword: how to stop overthinking at night
type: guide                                                   # guide | listicle | comparison
cover: cover.jpg
coverAlt: "..."
draft: true                                                   # skips the post
---
```

The build fails on a missing field, a broken `/blog/<slug>` link, a missing image or an H1 in the
body, so a bad post never replaces the live site. `npm run blog:check` validates without building.

Posts are written daily by the `meownote-blog-seo` automation on the Mac mini, which commits and
pushes here.

## Template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
