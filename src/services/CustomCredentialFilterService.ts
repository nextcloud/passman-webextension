import { ParserService } from "./ParserService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "./ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import PageRulesService from "./PageRulesService";

export class CustomCredentialFilterService {
    /**
     * Creates and returns a new array of credentials that can be associated with the given tab url.
     * Returns an empty array, if the tab url is missing or an empty string.
     * @param userTabUrl
     * @param credentials All credentials, to filter for. (Usually all credentials of the vault.)
     */
    public static getCredentialsByUrl = async (userTabUrl: string, credentials: Credential[]) => {
        let found_list: Credential[] = [];

        if (!userTabUrl || userTabUrl === '') {
            return found_list;
        }

        const combinedSettings = await PageRulesService.getCombinedSettingsResponse(userTabUrl);

        const ignoreProtocol = combinedSettings.mergedPageRules.ignoreProtocol ?? false;
        const ignoreSubdomain = combinedSettings.mergedPageRules.ignoreSubdomain ?? false;
        const ignorePath = combinedSettings.mergedPageRules.ignorePath ?? true;
        const ignorePort = combinedSettings.mergedPageRules.ignorePort ?? false;

        const url = ParserService.processURL(userTabUrl, ignoreProtocol, ignoreSubdomain, ignorePath, ignorePort);

        for (const credential of credentials) {
            let credential_url = credential.url;
            if (credential_url && credential_url !== '' && userTabUrl && !/^(ht)tps?:\/\//i.test(credential_url)) {
                try {
                    const protocol = userTabUrl.split('://').shift();
                    credential_url = protocol + "://" + credential_url;
                } catch (e) {
                    //ignore
                }
            }
            credential_url = ParserService.processURL(credential_url, ignoreProtocol, ignoreSubdomain, ignorePath, ignorePort);
            if (credential_url) {
                if (credential_url.split("\n").indexOf(url) !== -1) {
                    found_list.push(credential);
                }
            }
        }

        return found_list;
    }

    public static getCredentialsByLabel = (searchInput: string, credentials: Credential[]) => {
        let filtered: Credential[] = [];
        searchInput = searchInput.toLowerCase();
        if (searchInput && searchInput.trim() !== '') {
            for (const credential of credentials) {
                if (credential.label.toLowerCase().includes(searchInput)) {
                    filtered.push(credential);
                }
            }
            return filtered;
        }
        return credentials;
    }
}
