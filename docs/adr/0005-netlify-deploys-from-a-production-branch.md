# 0005. Netlify builds from a `production` branch; GitHub Actions only checks

- Status: accepted
- Date: 2026-09-20 (`8089fde`), CI added 2026-09-30

## Context

The site is hosted on Netlify, connected to the GitHub repository. Netlify's free plan has a limited number of build minutes, and every build of a Next.js site uses several of them.

Without `netlify.toml`, Netlify published the repository as is, without running `next build`, and the site answered 404 everywhere. The Next.js adapter, which Netlify should install by itself, was also missing from the build log.

## Decision

- `netlify.toml` sets the build command (`npm run build`), the publish directory and the `@netlify/plugin-nextjs` adapter explicitly. It overrides the settings in the Netlify UI.
- Netlify deploys only the `production` branch. Branch deploys and deploy previews are turned off. Pushing to `main` builds nothing; `git push origin main:production` ships.
- GitHub Actions (`.github/workflows/ci.yml`) runs lint, types, tests and a production build on every push to `main` and every pull request. It never deploys and needs no secret.

A deploy step in GitHub Actions (Netlify CLI or action) was considered and rejected. It would build a second time what Netlify already builds from Git, and it would need a Netlify token stored in GitHub.

## Consequences

- Build minutes are spent only on deliberate releases.
- There are no deploy previews for pull requests: changes are checked by CI and locally with `npm run dev`.
- `main` can be ahead of the live site. Ship by pushing `main` to `production` once CI is green.
