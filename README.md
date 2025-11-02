# Passman Webextension v3

[![Latest Release](https://gitlab.com/binsky08/passman-webextension-v3/-/badges/release.svg?order_by=release_at)](https://gitlab.com/binsky08/passman-webextension-v3/-/releases)
[![Pipeline Status](https://gitlab.com/binsky08/passman-webextension-v3/badges/master/pipeline.svg)](https://gitlab.com/binsky08/passman-webextension-v3/-/pipelines)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://opensource.org/license/agpl-v3)

## About the project

This is an approach of a more modern webextension for the Passman Nextcloud app, using the [WXT](https://wxt.dev/) framework.

It uses [Svelte](https://svelte.dev/) for the UI, and [Typescript](https://www.typescriptlang.org/) at all, since it is just very good! :)

The so called project "Passman Webextension v3" will replace the current Passman extension, once it's finished. Until then, you can use this one to test it.

## Features
- Ability to connect to a (single) Nextcloud instance and Passman vault
- Extension popup (and options page)
    - Show a list of all vault credentials (with search and automatic filtering for the current tab)
    - Ability to add new credentials
    - Ability to edit and delete existing credentials
    - Password generator
    - Extension settings
- Auto fill form fields on websites (for a single matching credential)
    - (using webextension content scripts)
- Password picker (the password picker is a small in-page-popup that can be opened by clicking a small icon in detected input fields)
    - Search / select a credential to fill the input field
    - Add new credentials from the password picker
    - Password generator
- Support for all Chromium-based browsers (Chrome, Vivaldi, Brave, etc.), the Firefox browser and its derivatives (like Waterfox, Floorp, etc.) supporting manifest v3

# Getting Started as Tester

Please be careful with this, since it is a development version and might not work as expected. Expect bugs and missing features.

**Do always backup your vault!!!**

You can easily get the latest released developer version of the extension from
- the chrome web store: https://chromewebstore.google.com/detail/passman-webextension-v3/ofngoamnbkaglfcpacagjdlmdhachdlc
- the firefox addon store: https://addons.mozilla.org/de/firefox/addon/passman-webextension-v3/
- the [releases page](https://gitlab.com/binsky08/passman-webextension-v3/-/releases)

To load the extension manually (not from a store - you won't get updates from there) use the following manual steps:

1. Download the latest version of the extension from the [releases page](https://gitlab.com/binsky08/passman-webextension-v3/-/releases)
    - optionally you can download the very latest (development) version of the extension from the [artifacts page](https://gitlab.com/binsky08/passman-webextension-v3/-/artifacts) (use the latest build artifact with a size of ~4 MB called `artifacts.zip`)
2. Unzip the file into an empty folder of your choice (`passman-webextension-v3` could be a good name)
3. Open the extension page in your browser ([chrome://extensions/](chrome://extensions/) or [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox) in Firefox)
4. Enable "Developer mode" if it is not already enabled
5. Click on "Load unpacked" (in Chromium) or "Load temporary add-on" (in Firefox)
6. Select the unzipped folder
7. You should now see the extension icon in the toolbar


# Development

## Getting Started

### Precondition: Get bun installed
Take a look at to documentation for installation instructions: https://bun.sh/docs/installation

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
