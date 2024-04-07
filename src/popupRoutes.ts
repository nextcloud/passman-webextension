// @ts-ignore
import NotFound from "~spa_components/NotFound.svelte";
import Loading from "~spa_components/Loading.svelte";
import IndexPage from "~spa_components/IndexPage.svelte";
import Unlock from "~spa_components/Unlock.svelte";
import Setup from "~spa_components/Setup.svelte";
import NextcloudLogin from "~spa_components/NextcloudLogin.svelte";

const routes = {
    '/': Loading,

    '/setup/login': NextcloudLogin,
    '/setup/start/:isInPopup': Setup,

    '/unlock': Unlock,

    '/home': IndexPage,

    // Catch-all
    // This is optional, but if present it must be the last
    '*': NotFound,
}

export { routes }
