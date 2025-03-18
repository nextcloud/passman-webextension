This is an approach of a more modern webextension for the Passman Nextcloud app, using the [Plasmo](https://docs.plasmo.com/) framework.

It uses [Svelte](https://svelte.dev/) for the UI, and [Typescript](https://www.typescriptlang.org/) at all, since it is just very good! :)

The so called project "Passman Webextension v3" will replace the current Passman extension, once it's finished. Until then, you can use this one to test it.

# Getting Started as Tester

Please be careful with this, since it is a development version and might not work as expected. Expect bugs and missing features.

**Do always backup your vault!!!**

Since google takes some time to approve the new extension, you can test it already today using the following manual steps:

1. Download the latest version of the extension from the [releases page](https://gitlab.com/binsky08/passman-webextension-v3/-/releases)
    - optionally you can ownload the very latest (development) version of the extension from the [artifacts page](https://gitlab.com/binsky08/passman-webextension-v3/-/artifacts) (use the latest build artifact with a size of ~ 3-4 MB called `artifacts.zip`)
2. Unzip the file into an empty folder of your choice (`passman-webextension-v3` could be a good name)
3. Open the extension page in your browser (e.g. chrome://extensions/)
4. Enable "Developer mode" if it is not already enabled
5. Click on "Load unpacked"
6. Select the unzipped folder
7. You should now see the extension icon in the toolbar


# Development

## Getting Started

### Precondition: Get bun installed
Take a look at to documentation for installation instructions: https://bun.sh/docs/installation

Optionally use pnpm (recommended by Plasmo, but not me): https://pnpm.io/installation

### Install dependencies

```bash
bun install
```

If you get something like this: `Blocked 4 postinstalls. Run 'bun pm untrusted' for details`, make sure to run these postinstalls:

```bash
bun pm untrusted
bun pm trust --all
```

### Run the development server

```bash
bun run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
bun run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

For some reason the build failed with bun v1.2.3 but worked with bun v1.1.31.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
