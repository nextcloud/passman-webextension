// @ts-ignore
import NotFound from "./spa_components/NotFound.svelte";
import Loading from "./spa_components/Loading.svelte";
import IndexPage from "./spa_components/IndexPage.svelte";
import Unlock from "./spa_components/Unlock.svelte";
import Setup from "./spa_components/Setup.svelte";
import NextcloudServerSetup from "./spa_components/Settings/NextcloudServerSetup.svelte";
import LegacySettingsMigrate from "./spa_components/Settings/LegacySettingsMigrate.svelte";
import CredentialEdit from "./spa_components/CredentialEdit.svelte";
import Settings from "./spa_components/Settings/Settings.svelte";
import PasswordGenerator from "./spa_components/PasswordGenerator.svelte";
import CredentialAdd from "./spa_components/CredentialAdd.svelte";
import VaultRecovery from "./spa_components/VaultRecovery.svelte";

const routes = {
    '/': Loading,

    '/setup/server': NextcloudServerSetup,
    '/setup/migrate': LegacySettingsMigrate,
    '/setup/start/:isInPopup': Setup,

    '/unlock': Unlock,

    '/home': IndexPage,
    '/credential/edit/:guid': CredentialEdit,
    '/credential/add': CredentialAdd,

    '/generator': PasswordGenerator,
    '/settings': Settings,

    '/vaultRecovery': VaultRecovery,

    // Catch-all
    // This is optional, but if present it must be the last
    '*': NotFound,
}

export { routes }
