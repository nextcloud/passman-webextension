# Passman Webextension v3

[![Latest Release](https://gitlab.com/binsky08/passman-webextension-v3/-/badges/release.svg?order_by=release_at)](https://gitlab.com/binsky08/passman-webextension-v3/-/releases)
[![Pipeline Status](https://gitlab.com/binsky08/passman-webextension-v3/badges/master/pipeline.svg)](https://gitlab.com/binsky08/passman-webextension-v3/-/pipelines)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://opensource.org/license/agpl-v3)

## About the project

This is an approach of a more modern webextension for the Passman Nextcloud app, using the [Plasmo](https://docs.plasmo.com/) framework.

It uses [Svelte](https://svelte.dev/) for the UI, and [Typescript](https://www.typescriptlang.org/) at all, since it is just very good! :)

The so called project "Passman Webextension v3" will replace the current Passman extension, once it's finished. Until then, you can use this one to test it.

## Features
- Ability to connect to a (single) Nextcloud instance and Passman vault
- Extension popup
    - Show a list of all vault credentials (with search and automatic filtering for the current page)
    - Ability to add new credentials
    - Ability to edit and delete existing credentials
    - Password generator
    - Extension settings
- Auto fill form fields on websites (for a single matching credential)
    - (using webextension content scripts)
- Password picker (the password picker is a small in-page-popup that can be opened by clicking a small icon in detected input fields)
    - Search / select a credential to fill the input field
- Support for all Chromium-based browsers (Chrome, Vivaldi, Brave, etc.), the Firefox browser and its derivatives (like Waterfox, Floorp, etc.) supporting manifest v3

# Getting Started as Tester

Please be careful with this, since it is a development version and might not work as expected. Expect bugs and missing features.

**Do always backup your vault!!!**

You can easily get the latest released developer version of the extension from
- the chrome web store: https://chromewebstore.google.com/detail/passman-webextension-v3/ofngoamnbkaglfcpacagjdlmdhachdlc
- the firefox addon store: https://addons.mozilla.org/de/firefox/addon/passman-webextension-v3/
    - after installation in Firefox you need to disable and enable the extension manually in [about:addons](about:addons) to fix the service worker [issue #16](https://gitlab.com/binsky08/passman-webextension-v3/-/issues/16)
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

Optionally use pnpm (recommended by Plasmo, but not me): https://pnpm.io/installation

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

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Extension development in Firefox needs some adjustments

I recommend installing the [Firefox Developer Edition](https://www.mozilla.org/en-US/firefox/developer/)
or at least using another browser profile to get a clean development environment.

### The working way

Since the plasmo dev server does not work in Firefox, you'll need to build the extension every time you make a change.

```bash
bun run dev-build-ff
```

This command will build the extension but prevents the code from being minified to make it easier to debug.

Open the `about:debugging` page in Firefox and load the `build/firefox-mv3-prod` folder as temporary extension.

### The not working way using the plasmo dev server

When using the plasmo dev server with `bun run dev-ff`, a firefox-mv3 app is built and a plasmo server is started.
That plasmo server causes this error in Firefox: `Reading manifest: Error processing content_security_policy.extension_pages: ‘script-src’ directive contains a forbidden http: protocol source` which can only be solved (at least at the moment) by manually removing `http://localhost` from the created manifest.json file in `build/firefox-mv3-dev/manifest.json`.
It should look like this afterwards:
```
"content_security_policy":{"extension_pages":"script-src 'self';object-src 'self';"}
```
It seems that even starting the dev server with `--no-hmr` does not help.

I was playing around with disabling SCP to get the dev server working, but it did not help.

What I have tried:

**Do never disable SCP in your productive Firefox!!!! never!** (use an extra browser for development instead!)

Then open `about:config`, set:

- `security.csp.enable` to `false`
- `security.mixed_content.block_active_content` to `false`
- `network.websocket.allowInsecureFromHTTPS` to `true`

and load `dist/firefox-mv3-dev` as temporary extension.

I had hoped that this would work, but it did not.

## Making production build

Run the following:

```bash
bun run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

## Troubleshooting

- If you have a general build error, try / check the workaround described here: https://github.com/parcel-bundler/watcher/issues/159

- Sometimes the build fails with a segfault error. I did some investigations and found out that it is caused by the `@swc/core` package (at least on my system).
    - I have no idea why, but it seems to be a problem with the `@swc/core` package.
        - Try to remove node_modules and bun.lock and run `bun i` again.
    - I have tried to (force) use the `@swc/wasm` package instead, but I didn't get it work.
    - Since swc in only used by bun, try running `pnpm run build` instead.

If you want to go into further segvault investigation, you can use the following command to get started with some information:

Use `gdb` to get a backtrace of the segfault:
```bash
gdb $(command -v bun) core
(gdb) run dev-build-ff
(gdb) bt
```

Use `strace` to get more information about the child processes that are possibly causing the segfault:

```bash
strace -f -tt -s 2000 -y -o /tmp/segv.log bun run dev-build-ff

pids=( $(grep -E 'killed by SIGSEGV' /tmp/segv.log | awk -F: '{print $1}' | awk '{print $1}' | sort -u) )

for i in "${pids[@]}"; do grep -n "^${i} " /tmp/segv.log | grep execve | head -1; done
```

(increase the strace `-s` parameter to get more information like to `-s 200000`, but this will create a larger log file around 2 GB or even more)
