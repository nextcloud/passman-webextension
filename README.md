# Passman Webextension

> **Migration notice:** Development is moving from GitLab ([binsky08/passman-webextension-v3](https://gitlab.com/binsky08/passman-webextension-v3)) into the official Nextcloud repository ([nextcloud/passman-webextension](https://github.com/nextcloud/passman-webextension)) on branch `v3` (planned to become `master`). The legacy MV2 extension remains on `master` until cutover. During the transition, store listings and some links may be incorrect or still use the temporary “v3” name.

[Latest Release](https://github.com/nextcloud/passman-webextension/releases)
[CI Status](https://github.com/nextcloud/passman-webextension/actions)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://opensource.org/license/agpl-v3)


### Old extension links (deprecated)
![Build Status](https://passman.cc/webextension-version.php)


[![Chrome webstore](https://img.passman.cc/assets/chromewebstore.png)](https://chrome.google.com/webstore/detail/passman/hlpjhlifkgmoibhollggngbbhbejecph) | [![AMO](https://img.passman.cc/assets/AMO-button_1.png)](https://addons.mozilla.org/en-US/firefox/addon/passman/)    
-----------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
<img align="left" src="https://img.shields.io/chrome-web-store/users/hlpjhlifkgmoibhollggngbbhbejecph.svg"> <img align="right" src="https://img.shields.io/chrome-web-store/rating/hlpjhlifkgmoibhollggngbbhbejecph.svg">| <img align="left" src="https://img.shields.io/amo/users/passman.svg"> <img align="right" src="https://img.shields.io/amo/rating/passman.svg">


## About the project

This is a modern, fully rewritten webextension for the [Passman](https://github.com/nextcloud/passman) Nextcloud app, using the [WXT](https://wxt.dev/) framework.

It uses [Svelte](https://svelte.dev/) for the UI and [TypeScript](https://www.typescriptlang.org/) throughout.

The previous (legacy) extension source remains available on the [`master` branch](https://github.com/nextcloud/passman-webextension/tree/master).

## Features

- Ability to connect to a Nextcloud instance and Passman vault
- Extension popup (and options page)
  - Show a list of all vault credentials (with search and automatic filtering for the current tab)
  - Credential management (CRUD operations)
  - Password generator
  - Extension settings
- Auto fill form fields on websites (for a single matching credential)
  - (using webextension content scripts)
- Password picker (the password picker is a small in-page-popup that can be opened by clicking a small icon in detected input fields)
  - Search / select a credential to fill the input field
  - Add new credentials from the password picker
  - Password generator
- Support for all Chromium-based browsers (Chrome, Vivaldi, Brave, etc.), the Firefox browser and its derivatives (like Waterfox, Floorp, etc.) supporting manifest v3

### Experimental Features

- Page rules
    - Ability to overwrite global settings and extension behavior for a specific website
- Passkey support (coming soon - very soon)

# Getting Started as Tester

Please be careful with this, since it is a development version and might no longer be updated after the migration.

**Do always backup your vault!!!**

You can easily get the latest released developer version of the extension from

- the chrome web store: [https://chromewebstore.google.com/detail/passman-webextension-v3/ofngoamnbkaglfcpacagjdlmdhachdlc](https://chromewebstore.google.com/detail/passman-webextension-v3/ofngoamnbkaglfcpacagjdlmdhachdlc)
- the firefox addon store: [https://addons.mozilla.org/de/firefox/addon/passman-webextension-v3/](https://addons.mozilla.org/de/firefox/addon/passman-webextension-v3/)
- the [releases page](https://github.com/nextcloud/passman-webextension/releases)

# Development

## Getting Started

### Precondition: Get bun installed

Take a look at to documentation for installation instructions: [https://bun.sh/docs/installation](https://bun.sh/docs/installation)

Bun is the recommended package manager for this project, but something like pnpm should also work well.

### Install dependencies

```bash
bun install
```

If you get something like this: `Blocked 1 postinstall. Run 'bun pm untrusted' for details`, you can just ignore it. All required packages that needs to be trusted are already declared at `trustedDependencies` in the `package.json`.

Sure, if you have build issues, run `bun pm untrusted` and the postinstalls with `bun pm trust --all`, but this should not be needed! - on my system it causes some issues with the build process (and ends in a segfault).

### Run the development server

```bash
bun run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `.output/chrome-mv3-dev`.

The extension will auto-reload as you make changes. You can start editing entrypoints in the `src/entrypoints/` directory. To add an options page, create an entrypoint in `src/entrypoints/options/`. Likewise, content scripts go in `src/entrypoints/content/`.

For further guidance, [visit the WXT Documentation](https://wxt.dev/)

## Extension development in Firefox

I recommend installing the [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)
or at least using another browser profile to get a clean development environment.

You can also use the Firefox development command:

```bash
bun run dev:firefox
```

Open the `about:debugging` page in Firefox and load the `.output/firefox-mv2-dev` folder as temporary extension.

Note that the release version for Firefox is using manifest v3, but the development version is using manifest v2 due to "dev mode" compatibility reasons.

## Making production build

Run the following:

```bash
bun run build
bun run build:firefox
```

This should create production bundles for the extension, ready to be zipped and published to the stores.

## Submit to the webstores

You can build and zip the extension using:

```bash
bun run zip         # For Chrome/Chromium
bun run zip:firefox # For Firefox
```

The built zip files will be in the `.output/` directory. These are ready to be uploaded to the respective web stores or to be installed manually in the browser.

CI builds and tagged releases are handled by GitHub Actions (see `.github/workflows/`). Store submission on tags needs the `ENV_SUBMIT` repository secret (contents of a WXT `.env.submit` file).
