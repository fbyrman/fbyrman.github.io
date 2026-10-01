# fbyrman.github.io

Personal site: research and projects. Built with Astro, deployed to GitHub Pages on every push to `main`.

## Add an entry

Write one Markdown file:

- `src/content/research/<slug>.md` for academic work
- `src/content/projects/<slug>.md` for everything else

The fields are defined in `src/content.config.ts`. Set `draft: true` to hide an entry.
Images go in `public/` and are referenced as `/name.png`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
```

## Deploy

1. Create the repo `fbyrman/fbyrman.github.io` on GitHub and push.
2. Settings, Pages, Source: GitHub Actions.
