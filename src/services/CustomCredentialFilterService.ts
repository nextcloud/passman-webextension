import { ParserService } from "./ParserService";
import ExtensionSettingsService, { ExtensionSettingsOptions } from "./ExtensionSettingsService";
import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";
import PageRulesService, { CombinedSettingsResponse } from "./PageRulesService";
import { logger } from "~/services/ConsoleLoggingService";
import { CredentialFilterService, FILTERS } from "@binsky/passman-client-ts/lib/Service/CredentialFilterService";

export class CustomCredentialFilterService {
    /**
     * Creates and returns a new array of credentials that can be associated with the given tab url.
     *
     * Makes use of CredentialFilterService.getFilteredCredentials with the FILTERS.SHOW_ALL base filter and the urlFilterCallback as additional filter.
     *
     * Returns an empty array, if the tab url is missing or an empty string.
     *
     * @param userTabUrl
     * @param credentials All credentials, to filter for. (Usually all credentials of the vault.)
     * @returns An array of credentials that can be associated with the given tab url, or null if an error occurred.
     */
    public static getCredentialsByUrl = async (userTabUrl: string, credentials: Credential[]) => {
        try {
            const urlFilterCallback = await this.getCredentialsByUrlFilterCallback(userTabUrl, false);
            return CredentialFilterService.getFilteredCredentials(
                credentials, 
                FILTERS.SHOW_ALL,
                undefined,
                undefined,
                [urlFilterCallback]
            );
        } catch (e) {
            // this is not necessarily a real problem, since like about:debugging is not a valid/parseable URL, but it's a valid URL for Firefox
            // instead of panicking, just return null to indicate an error
            return null;
        }
    }

    public static getCredentialsByUrlFilterCallback = async (userTabUrl: string, ignoreParseExceptionEntry = true): Promise<((credential: Credential) => boolean)> => {
        const negativeIdentityFilter = (credential: Credential): boolean => false;
        if (!userTabUrl || userTabUrl === '') {
            // identity filter, will not filter any credentials (filter logic won't return anything)
            return negativeIdentityFilter;
        }

        let combinedSettings: CombinedSettingsResponse;
        try {
            new URL(userTabUrl);
            combinedSettings = await PageRulesService.getCombinedSettingsResponse(userTabUrl);
        } catch (e) {
            // early return, since the tab url is not a valid, parseable URL
            if (ignoreParseExceptionEntry) {
                return negativeIdentityFilter;
            }
            // re-throw the exception, since we want to know about it (and handle it in the caller most likely with a null return)
            throw e;
        }

        const ignoreProtocol = combinedSettings.mergedPageRules.ignoreProtocol ?? false;
        const ignoreSubdomain = combinedSettings.mergedPageRules.ignoreSubdomain ?? false;
        const ignorePath = combinedSettings.mergedPageRules.ignorePath ?? true;
        const ignorePort = combinedSettings.mergedPageRules.ignorePort ?? false;

        let url;
        try {
            url = ParserService.processURL(userTabUrl, ignoreProtocol, ignoreSubdomain, ignorePath, ignorePort);
        } catch (e) {
            if (ignoreParseExceptionEntry) {
                return negativeIdentityFilter;
            } else {
                // this is not necessarily a real problem, since like about:debugging is not a valid/parseable URL, but it's a valid URL for Firefox
                logger.error("Error processing URL", e);
                throw e;
            }
        }

        return (credential: Credential): boolean => {
            try {    
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
                        return true;
                    }
                }
            } catch (e) {
                if (!ignoreParseExceptionEntry) {
                    // this is not necessarily a real problem, since like about:debugging is not a valid/parseable URL, but it's a valid URL for Firefox
                    logger.error("Error processing URL", e);
                    throw e;
                }
            }
            return false;
        }
    }

    public static getCredentialsByLabelOnly = (searchInput: string, credentials: Credential[]) => {
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
