# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Package Manager

This project currently uses **npm** as the documented and verified package manager.

Requirements:

- Node.js `>=20.0`
- npm (bundled with Node.js)

## Installation

```bash
npm install
```

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Type Check

```bash
npm run typecheck
```

## Deployment

Using SSH:

```bash
USE_SSH=true npm run deploy
```

Not using SSH:

```bash
GIT_USER=<Your GitHub username> npm run deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

## Notes

- The previous `yarn` commands were removed because the current environment and project state do not guarantee Yarn is installed.
- If you still want to use Yarn locally, enable it explicitly with `corepack`, but the default supported workflow for this repository is now npm.
