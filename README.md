<div align="center">
<h1>imtaotao.me</h1>

[![build status](https://github.com/imtaotao/website/actions/workflows/deploy.yml/badge.svg?branch=master)](https://github.com/imtaotao/website/actions/workflows/deploy.yml)

Source code for my personal website, blog, and resume.

[https://imtaotao.me](https://imtaotao.me)

</div>

## What Is This

This is the source repository for my personal website. It currently includes:

- Home: a lightweight entry point for visitors.
- Blog: articles shaped by frontend work, engineering practice, and long-term maintenance.
- Resume: a structured-data-driven resume page with export support.

## Repository Structure

```text
.
├── app/                       # Vite + React frontend app
├── blog/                      # MDX blog content
├── docs/codex/                # Project conventions and feature notes
├── packages/kernel-blog/      # Blog domain package
├── packages/kernel-resume/    # Resume domain package
├── packages/kernel-shared/    # Shared cross-domain package
├── scripts/                   # Local checks and helper scripts
└── resume.yaml                # Resume data source
```

## Tech Stack

- pnpm workspace
- Vite
- React
- TypeScript
- MDX
- Radix UI
- Tailwind CSS

## Local Development

This project requires Node `>=22` and pnpm `10.27.0`.

```shell
pnpm install
pnpm dev
```

Common commands:

```shell
pnpm build
pnpm preview
pnpm dev:packages
pnpm build:packages
```

## Content Conventions

Blog posts live under `blog/`. Each post keeps its content and local image assets in its own directory. Resume-related implementation follows the documents under `docs/codex/`; reusable logic should live in `packages/kernel-resume/` instead of being mixed into the app entry.

## Codex Notes

- Site experience roadmap: `docs/codex/site-experience.md`
- Resume behavior: `docs/codex/resume-function.md`
- Resume UI direction: `docs/codex/resume-ui.md`
- Local code style: `docs/codex/style.md`
