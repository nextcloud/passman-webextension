<script lang="ts">
    import { i18n } from "~/lib/i18n";
    import OnClickButton from "../InteractionElements/OnClickButton.svelte";
    import { CREDENTIAL_EDIT_SECTIONS } from "~/lib/Utils";
    import type Credential from "@binsky/passman-client-ts/lib/Model/Credential";

    type SectionButton = {
        type: CREDENTIAL_EDIT_SECTIONS,
        label: string
    }

    const sectionButtons: SectionButton[] = [
        { type: CREDENTIAL_EDIT_SECTIONS.GENERAL, label: i18n.getMessage('general') },
        { type: CREDENTIAL_EDIT_SECTIONS.FILES, label: i18n.getMessage('files') },
        { type: CREDENTIAL_EDIT_SECTIONS.CUSTOM_FIELDS, label: i18n.getMessage('custom_fields') },
        { type: CREDENTIAL_EDIT_SECTIONS.OTP, label: i18n.getMessage('one_time_password') }
    ]

    let { 
        openSection,
        credential
    }: { 
        openSection: (section: CREDENTIAL_EDIT_SECTIONS) => void,
        credential: Credential | null
    } = $props();

    let wrapSectionButtons = $state(false);

    /**
     * Prefer a single row while labels fit; otherwise use a symmetric 2x2 grid.
     * Intrinsic widths are measured off-layout so wrapped mode cannot skew the decision.
     */
     const sectionButtonsLayout = (node: HTMLDivElement) => {
        const gapPx = 8; // gap-2
        const labels = () => sectionButtons.map(section => section.label);

        const update = () => {
            const availableWidth = node.clientWidth;
            if (availableWidth <= 0) {
                return;
            }

            const measure = document.createElement('button');
            measure.type = 'button';
            measure.className = 'border border-gray-300 font-medium rounded-lg text-sm px-3 py-2 text-center';
            measure.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;white-space:nowrap;width:max-content;height:auto;';
            node.appendChild(measure);

            let neededWidth = 0;
            labels().forEach((label, index) => {
                measure.textContent = label;
                neededWidth += measure.getBoundingClientRect().width;
                if (index > 0) {
                    neededWidth += gapPx;
                }
            });
            measure.remove();

            const shouldWrap = neededWidth > availableWidth + 0.5;
            if (shouldWrap !== wrapSectionButtons) {
                wrapSectionButtons = shouldWrap;
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(update);
        });
        resizeObserver.observe(node);
        update();

        return {
            destroy() {
                resizeObserver.disconnect();
            }
        };
    };

    const sectionButtonClasses = () =>
        wrapSectionButtons
            ? '!w-full h-full min-w-0 max-w-full overflow-hidden whitespace-normal break-words p-1 smaller-button-line-height'
            : 'shrink-0 max-w-full overflow-hidden whitespace-nowrap';
</script>

<div class="min-w-0 flex-1 h-[stretch]" use:sectionButtonsLayout>
    <div class="{wrapSectionButtons ? 'grid grid-cols-2 grid-rows-2 gap-2' : 'flex flex-nowrap items-center justify-around h-[stretch]'}">
        {#each sectionButtons as section (section.type)}
            <OnClickButton  
                callback={() => openSection(section.type)}
                title={section.label}
                additionalClasses={sectionButtonClasses()}
                disabled={!credential}
                noPadding={wrapSectionButtons}
            >
                <span class="block max-w-full [overflow-wrap:anywhere] button-label-auto-shrink">
                    {section.label}
                </span>
            </OnClickButton>
        {/each}
    </div>
    <style>
        /* 
        This class allows the text to shrink if it exceeds the button width.
        It uses CSS clamp to ensure a readable minimum size.
        */
        .button-label-auto-shrink {
            display: block;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .smaller-button-line-height .button-label-auto-shrink {
            line-height: 1.2;
        }
    </style>
</div>
