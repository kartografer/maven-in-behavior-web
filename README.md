# Maven in Behavior Website

Welcome to the Maven in Behavior website repository. This project contains the public-facing website built with Angular and deployed with Firebase Hosting.

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Commands](#available-commands)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Project Overview

This is a single-page Angular application for Maven in Behavior. The site presents:

- Services and programs
- Insurance information
- Team profiles
- Contact and location details

## Technology Stack

- Framework: Angular 20
- Language: TypeScript 5.9
- Styling: SCSS + UIKit classes
- Hosting: Firebase Hosting
- Build Tool: Angular CLI 20
- Testing: Jasmine + Karma
- Linting: ESLint with Angular ESLint
- Formatting/Hooks: Prettier + Husky pre-commit hook

## Prerequisites

Before starting, install:

- Node.js 24.x (matches CI)
- npm 11+
- Git

Check versions:

```bash
node --version
npm --version
git --version
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Start development server

```bash
npm start
```

App runs at `http://localhost:4200`.

## Available Commands

### Development

| Command        | Description                                 |
| -------------- | ------------------------------------------- |
| `npm start`    | Start dev server on `http://localhost:4200` |
| `npm run lint` | Run ESLint checks                           |

### Build

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `npm run build`      | Build app output to `dist/web`     |
| `npm run build:prod` | Production build with optimization |

### Test

| Command    | Description                       |
| ---------- | --------------------------------- |
| `npm test` | Run unit tests in headless Chrome |

### Deploy

| Command                 | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `npm run deploy:github` | Deploy static build to GitHub Pages with `/web/` base href |

### Formatting

| Command                 | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run pretty:staged` | Format staged files (used by pre-commit hook) |

## Project Structure

```text
maven-in-behavior-web/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   ├── assets/
│   │   ├── css/
│   │   ├── img/
│   │   └── favicon/
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html
│   ├── main.ts
│   ├── styles.scss
│   └── polyfills.ts
├── angular.json
├── package.json
├── tsconfig.json
├── firebase.json
└── README.md
```

## Development Workflow

1. Create a feature branch.
2. Run `npm start` and make your changes.
3. Run `npm run lint` and `npm test` before opening a PR.
4. Commit normally; Husky runs formatting + lint checks on pre-commit.

## CI/CD Pipeline

GitHub Actions workflow is defined in `.github/workflows/node.js.yml`.

- Triggered on pushes and pull requests to `main`
- Uses Node.js 24.x
- Runs clean install (`npm ci`), build, and tests
- Deploys to Firebase Hosting on `main` after successful build/test job

## Deployment

- Firebase Hosting config is in `firebase.json`
- Production artifacts are generated at `dist/web`
- Live deployment is handled by GitHub Actions using `FirebaseExtended/action-hosting-deploy`

## Troubleshooting

- If dependencies fail to install, remove `node_modules` and `package-lock.json`, then run `npm install`.
- If Chrome test startup fails locally, rerun with a clean install and ensure Puppeteer downloaded its browser.
- If lint fails unexpectedly after dependency upgrades, run `npm install` and re-run `npm run lint`.
