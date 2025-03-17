This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

### Precondition: Get bun installed
Take a look at to documentation for installation instructions: https://bun.sh/docs/installation

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
