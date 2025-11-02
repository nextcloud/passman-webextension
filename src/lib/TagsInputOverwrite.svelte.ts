import { type Tag, TagsInput, type TagsInputProps } from "@binsky/melt/builders";
// @ts-ignore
import { Synced } from "@binsky/melt/dist/Synced.svelte";

/**
 * Required overwriting to get props.onTagsChange called on every tag change (add and delete).
 */
export class TagsInputOverwrite extends TagsInput {
    #tags!: Synced<Tag[]>;
    #onTC: ((value: Tag[]) => void) | undefined;

    constructor(props: TagsInputProps) {
        super(props);
        this.#onTC = props.onTagsChange;
    }

    async addTag(v: string) {
        const result = await super.addTag(v);
        if (result) {
            this.#onTC?.(this.tags);
        }
        return result;
    }
}
