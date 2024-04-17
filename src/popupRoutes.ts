// @ts-ignore
import NotFound from "~spa_components/NotFound.svelte";
import Loading from "~spa_components/Loading.svelte";
import IndexPage from "~spa_components/IndexPage.svelte";
import Unlock from "~spa_components/Unlock.svelte";
import Setup from "~spa_components/Setup.svelte";
import NextcloudServerSetup from "~spa_components/NextcloudServerSetup.svelte";
import CredentialEdit from "~spa_components/CredentialEdit.svelte";
import Settings from "~spa_components/Settings.svelte";

const routes = {
    '/': Loading,

    '/setup/server': NextcloudServerSetup,
    '/setup/start/:isInPopup': Setup,

    '/unlock': Unlock,

    '/home': IndexPage,
    '/credential/edit/:guid': CredentialEdit,

    '/settings': Settings,

    // Catch-all
    // This is optional, but if present it must be the last
    '*': NotFound,
}

export { routes }
