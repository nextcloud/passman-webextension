<script lang="ts">
    import { onMount } from "svelte";
    import { PasswordPickerService } from "~services/frontend/PasswordPickerService";
    import { sendToBackground } from "@plasmohq/messaging";
    import { ExtensionUnlockState } from "~stores/extensionUnlockStateStore";
    import Icon from "svelte-awesome/package/components/Icon.svelte";
    import { ban, list, plus, search, times } from "svelte-awesome/package/icons";
    import refresh from "svelte-awesome/icons/refresh";

    let extensionIsUnlocked = false;
    let customPickerStyle = "display: none;";

    const showPickerCallback = (left: number, top: number, maxZ: any) => {
        /*const picker = document.getElementById('password_picker');
        console.log(picker);
        picker.style.position = 'absolute';
        picker.style.left = left + 'px';
        picker.style.zIndex = "" + maxZ + 10;
        picker.style.top = top + 'px';*/
        customPickerStyle = 'position: absolute; left: ' + left + 'px; top: ' + top + 'px; z-index: ' + maxZ + 10 + ';';
    };

    const hidePickerCallback = () => {
        customPickerStyle = "display: none;";
    }

    const loadPickerForCurrentTab = () => {
        console.debug("picker svelte initialized");

        sendToBackground({
            name: "getExtensionUnlockState"
        }).then((value) => {
            extensionIsUnlocked = false;
            if (value.status === ExtensionUnlockState.UNLOCKED) {
                extensionIsUnlocked = true;
                console.debug("is unlocked");

                document.addEventListener('click', function (event) {
                    let shadowRootContainer = document.getElementsByTagName('plasmo-csui').item(0);
                    let targetEl = event.target as Element; // clicked element
                    do {
                        if (targetEl == shadowRootContainer) {
                            // This is a click inside, does nothing, just return.
                            // console.debug("Clicked inside!");
                            return;
                        }
                        // Go up the DOM
                        targetEl = targetEl.parentNode as Element;
                    } while (targetEl);
                    // console.debug("Clicked outside!");
                    hidePickerCallback();
                });

                PasswordPickerService.initPickerForPage(showPickerCallback, hidePickerCallback);
            }
        });
    }

    // this is injected and executed on every page / tab load
    onMount(() => {
        document.addEventListener('visibilitychange', function (event) {
            if (!document.hidden && !extensionIsUnlocked) {
                // tab is now visible and extension was not unlocked before current visibility change
                loadPickerForCurrentTab();
            }
        });

        loadPickerForCurrentTab();
    })
</script>


<link rel="stylesheet" type="text/css" href="{chrome.runtime.getURL('/assets/content_styles/password_picker.css')}"/>


{#if extensionIsUnlocked || true}
    <div id="password_picker" style="height: 385px; width: 350px; {customPickerStyle}">
        <div class="tabs">
            <div class="tab add" data-name="add">
                <span class="fa" title="[add_account, title]">
                    <Icon data={plus} scale={1.0}/>
                </span>
            </div>
            <div class="tab list" data-name="list">
                <span class="fa" title="[accounts, title]">
                    <Icon data={list} scale={1.0}/>
                </span>
            </div>
            <div class="tab search" data-name="search">
                <span class="fa" title="[search, title]">
                    <Icon data={search} scale={1.0}/>
                </span>
            </div>
            <div class="tab generate" data-name="generate">
                <span class="fa" title="[password_generator, title]">
                    <Icon data={refresh} scale={1.0}/>
                </span>
            </div>
            <div class="tab ignore" data-name="ignore">
                <span class="fa" title="[ignore_site_tab, title]">
                    <Icon data={ban} scale={1.0}/>
                </span>
            </div>
            <div class="tab close pull-right">
                <span class="fa" title="[close, title]">
                    <Icon data={times} scale={1.0}/>
                </span>
            </div>
        </div>
        <div class="tab-content">
            <div class="tab-add-content" style="display: none">
                <h2 title="save_site"></h2>
                <div class="rrow">
                    <label title="label"></label>
                    <input type="text" class="input" name="savepw-label" id="savepw-label"/>
                </div>
                <div class="rrow">
                    <label title="username"></label>
                    <input type="text" class="input" name="savepw-username" id="savepw-username"/>
                </div>
                <div class="rrow">
                    <label title="password"></label>

                    <input type="password" class="input" name="savepw-password" id="savepw-password"/>
                    <span class="niceInputButtons">
                       <div class="cell renewpw_newac" title="[generate_password, title]">
                           <i class="fa fa-refresh"></i>
                       </div>
                       <div class="cell togglePw" title="[toggle_visibility, placeholder]">
                           <i class="fa fa-eye-slash"></i>
                       </div>
                   </span>
                </div>
                <div class="rrow">
                    <label title="vault"></label>
                    <select id="savepw-vault" class="input"></select>
                </div>
                <small title="add_hint"></small>
                <hr/>
                <button class="btn btn-success" id="savepw-save" title="save"></button>
                <button class="btn" id="savepw-cancel" title="cancel"></button>
            </div>
            <div class="tab-list-content" style="display: none">
                <div class="no-credentials">
                    <div class="btn btn-secondary save" title="btn_save_site"></div>
                    <div class="clearfix"></div>
                    <div class="btn btn-secondary search" title="btn_search"></div>
                    <div class="clearfix"></div>
                    <div class="btn btn-secondary gen" title="generate_password"></div>
                </div>
            </div>
            <div class="tab-search-content" style="display: none">
                <input type="text" class="input" id="password_search" title="[search_for, placeholder]">
                <div id="searchResults">

                </div>
            </div>
            <div class="tab-generate-content" style="display: none">
                <h2 title="generate_password"></h2>
                <div class="pw-gen">
                    <div class="input-group">
                        <input type="password" id="generated_password"/>
                        <span class="niceInputButtons">
                       <div class="cell renewpw" title="[generate_password, title]">
                           <i class="fa fa-refresh"></i>
                       </div>
                       <div class="cell togglePwVis" title="[toggle_visibility, placeholder]">
                           <i class="fa fa-eye-slash"></i>
                       </div>
                   </span>
                    </div>
                    <div class="btn btn-secondary usepwd" title="use_generated_password"></div>
                </div>
                <div class="password_settings">
                    <div>
                        <span href="#" class="adv_opt"><i class="fa fa-angle-right"></i> <span
                                title="toggle_advanced"></span></span>
                    </div>
                    <div class="pw-setting-advanced" style="display: none">
                        <form name="advancedSettings">
                            <label class="pw-len">
                                <span class="label" title="pw_length"></span><br/>
                                <input type="number" name="length" min="1"/>

                            </label>
                            <label class="pull-left clearfix">
                                <input type="checkbox"
                                       id="upper"
                                       name="useUppercase"/>
                                <span class="label sm">A-Z</span>
                            </label>
                            <label class="pull-left">
                                <input
                                        name="useLowercase" type="checkbox"
                                        id="lower"/>
                                <span class="label sm">a-z</span>
                            </label>
                            <label class="pull-left">
                                <input name="useDigits" type="checkbox"
                                       id="digits"/>
                                <span class="label sm">0-9</span>
                            </label>
                            <label class="pull-left">
                                <input type="checkbox" id="special"
                                       name="useSpecialChars"/>
                                <span class="label sm">1$%@#</span>
                            </label>
                            <label class="pull-left digits clearfix">
                                <span class="label" title="min_digits"></span><br/>
                                <input type="number" name="minimumDigitCount" min="0"/>
                            </label>
                            <label class="pull-left clearfix">
                                <input type="checkbox" id="ambig"
                                       name="avoidAmbiguousCharacters"/>
                                <span class="label sm" title="avoid_ambiguous"></span>
                            </label>

                            <label class="pull-left clearfix">
                                <input type="checkbox" name="requireEveryCharType"
                                       id="reqevery"/>
                                <span class="label sm" title="require_every_character_type"></span>
                            </label>
                        </form>
                    </div>
                </div>

            </div>
            <div class="tab-ignore-content" style="display: none">
                <h2 title="ignore_site"></h2>
                <div class="text">
                    <div style="line-height: 1.5em" title="disable_picker_text"></div>
                    <hr>
                    <div class="btn btn-warning disable-site" title="disable_site">Disable site</div>
                    <div class="btn btn-info disable-page" title="disable_page">Disable page</div>
                </div>
            </div>
            <div class="tab-unlock-content" style="display: none">
                <h2 title="browser_action_title_locked"></h2>
                <div class="text">
                    <div style="line-height: 1.5em" title="extension_locked"></div>
                </div>
            </div>
        </div>
    </div>
{:else}
    <div style="background-color: #ff2d55; width: 10%; height: 10%">
        i am the locked picker
    </div>
{/if}
