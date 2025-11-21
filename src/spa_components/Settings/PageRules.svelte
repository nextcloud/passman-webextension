<script lang="ts">
    import { onMount } from "svelte";
    import Card from "~/spa_partials/Card.svelte";
    import Loading from "~/spa_components/Loading.svelte";
    import OnClickButton from "~/spa_partials/InteractionElements/OnClickButton.svelte";
    import ExtensionUnlockService from "~/services/ExtensionUnlockService";
    import PageRulesService, {
        type PageRulesInterface,
        type PageRulesStorageInterface
    } from "~/services/PageRulesService";
    import NotyService from "~/services/frontend/NotyService";
    import { i18n } from "~/lib/i18n";
    import PageRulesEditor from "./PageRulesEditor.svelte";
    // @ts-expect-error
    import { push } from "~/Router.svelte";

    let pageIsLoading = true;
    let pageRules: PageRulesStorageInterface = {};
    let searchTerm = '';
    let viewMode: 'list' | 'editor' = 'list';
    let editorMode: 'create' | 'edit' = 'create';
    let editorInitialUrl: string = '';
    let editorInitialRule: PageRulesInterface = PageRulesService.getFreshPageRules();
    let lockSaveButton = false;
    let lockDeleteButton = false;

    let sortedPageRuleEntries: [string, PageRulesInterface][] = [];
    let filteredPageRuleEntries: [string, PageRulesInterface][] = [];

    const overridesCount = (rule: PageRulesInterface) => {
        return ['ignoreProtocol', 'ignoreSubdomain', 'ignorePath', 'ignorePort', 'autofillEnabled', 'enableEmailAsUsernameFallbackFilling']
            .reduce((count, key) => {
                const value = rule[key as keyof PageRulesInterface];
                return value === undefined ? count : count + 1;
            }, 0);
    };

    const loadPageRules = async () => {
        const rules = await PageRulesService.getAllPageRules();
        pageRules = { ...rules };
    };

    const openListView = () => {
        viewMode = 'list';
        lockSaveButton = false;
        lockDeleteButton = false;
    };

    const startCreate = () => {
        editorMode = 'create';
        editorInitialUrl = '';
        editorInitialRule = PageRulesService.getFreshPageRules();
        viewMode = 'editor';
    };

    const startEdit = (pageUrl: string) => {
        const existingRule = pageRules[pageUrl];
        if (!existingRule) {
            return;
        }
        editorMode = 'edit';
        editorInitialUrl = pageUrl;
        editorInitialRule = {
            ...PageRulesService.getFreshPageRules(),
            ...existingRule
        };
        viewMode = 'editor';
    };

    const handleEditorSave = async (event: CustomEvent<{ initialUrl: string, url: string, rule: PageRulesInterface }>) => {
        const normalizedUrl = event.detail.url.trim();
        if (!normalizedUrl) {
            NotyService.notyError(i18n.getMessage('page_rules_url_required'));
            return;
        }
        lockSaveButton = true;
        try {
            if (editorMode === 'edit' && initialUrl && initialUrl !== normalizedUrl) {
                await PageRulesService.deletePageRules(initialUrl);
            }
            await PageRulesService.setPageRules(normalizedUrl, { ...event.detail.rule });
            await loadPageRules();
            NotyService.notySuccess(i18n.getMessage('page_rules_rule_saved'));
            openListView();
        } catch (error) {
            console.error('Failed to save page rule', error);
            NotyService.notyError(i18n.getMessage('page_rules_save_failed'));
        } finally {
            lockSaveButton = false;
        }
    };

    const handleEditorDelete = async (event: CustomEvent<{ initialUrl: string }>) => {
        if (editorMode !== 'edit' || !initialUrl) {
            return;
        }
        lockDeleteButton = true;
        try {
            await PageRulesService.deletePageRules(initialUrl);
            await loadPageRules();
            NotyService.notySuccess(i18n.getMessage('page_rules_rule_deleted'));
            openListView();
        } catch (error) {
            console.error('Failed to delete page rule', error);
            NotyService.notyError(i18n.getMessage('page_rules_delete_failed'));
        } finally {
            lockDeleteButton = false;
        }
    };

    const handleEditorCancel = () => {
        openListView();
    };

    $: sortedPageRuleEntries = Object.entries(pageRules)
        .sort((a, b) => a[0].localeCompare(b[0]));

    $: filteredPageRuleEntries = sortedPageRuleEntries.filter(([url]) => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) {
            return true;
        }
        return url.toLowerCase().includes(normalizedSearch);
    });

    onMount(() => {
        ExtensionUnlockService.isSetupDone().then(async (isSetupDone) => {
            if (!isSetupDone) {
                push('/setup/server');
                return;
            }
            if (!await ExtensionUnlockService.isUnlocked()) {
                push('/unlock');
                return;
            }
            try {
                await loadPageRules();
            } catch (error) {
                console.error('Failed to load page rules', error);
                NotyService.notyError(i18n.getMessage('page_rules_load_failed'));
            } finally {
                pageIsLoading = false;
            }
        });
    });
</script>

{#if pageIsLoading}
    <Loading/>
{:else}
    {#if viewMode === 'list'}
        <Card additionalClasses="text-left space-y-5 w-full">
            <div class="space-y-1">
                <h2 class="text-xl font-semibold">{i18n.getMessage('page_rules')}</h2>
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    {i18n.getMessage('page_rules_description')}
                </p>
            </div>

            <div>
                <label for="page-rules-search" class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {i18n.getMessage('page_rules_search_label')}
                </label>
                <div class="flex flex-row mt-1 justify-between gap-2">
                    <div class="grow">
                        <input
                                id="page-rules-search"
                                type="search"
                                placeholder="{i18n.getMessage('page_rules_search_placeholder')}"
                                class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-focus focus:ring-1 focus:ring-primary-focus dark:bg-neutral dark:text-primary-dark-text"
                                bind:value={searchTerm}
                        />
                    </div>
                    <OnClickButton callback={startCreate}>
                        {i18n.getMessage('page_rules_new_rule')}
                    </OnClickButton>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-semibold">{i18n.getMessage('page_rules_existing_rules')}</h3>
                    <span class="text-xs uppercase tracking-wide text-gray-500">
                        {filteredPageRuleEntries.length}/{sortedPageRuleEntries.length}
                    </span>
                </div>

                {#if sortedPageRuleEntries.length === 0}
                    <p class="text-sm text-gray-500">
                        {i18n.getMessage('page_rules_no_rules')}
                    </p>
                {:else if filteredPageRuleEntries.length === 0}
                    <p class="text-sm text-gray-500">
                        {i18n.getMessage('page_rules_no_results')}
                    </p>
                {:else}
                    <ul class="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-neutral dark:border-neutral">
                        {#each filteredPageRuleEntries as [url, rule]}
                            <li>
                                <button
                                        type="button"
                                        class="w-full text-left px-3 py-2 flex flex-col gap-1 transition hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary-focus dark:hover:bg-neutral"
                                        on:click={() => startEdit(url)}
                                >
                                    <span class="font-medium wrap-break-word">{url}</span>
                                    <span class="text-xs text-gray-500">
                                        {i18n.getMessage('page_rules_overrides_count', overridesCount(rule).toString())}
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        </Card>
    {:else}
        <Card additionalClasses="text-left space-y-5 w-full">
            <PageRulesEditor
                    mode={editorMode}
                    initialUrl={editorInitialUrl}
                    initialRule={editorInitialRule}
                    isSaving={lockSaveButton}
                    isDeleting={lockDeleteButton}
                    on:save={handleEditorSave}
                    on:cancel={handleEditorCancel}
                    on:delete={handleEditorDelete}
            />
        </Card>
    {/if}
{/if}
