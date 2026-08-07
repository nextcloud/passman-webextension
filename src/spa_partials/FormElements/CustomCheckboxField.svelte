<script lang="ts">
	import ShowFieldErrors from './ShowFieldErrors.svelte';
	import type { IFormFieldError } from "@binsky/passman-client-ts/lib/Exception/FormFieldError";

	export let required = false;
	export let readonly = false;
	export let disabled = false;

	export let id;
	export let value: boolean;
	export let name = '';
	export let placeholder = '';
	export let label;
	export let errors: IFormFieldError[] = [];
</script>

<div class="flex items-start">
	<div class="flex shrink-0 items-center h-5">
		<input
			type="checkbox"
			{name}
			{id}
			bind:checked={value}
			class="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block size-3.5
       focus:ring-cyan-600 focus:border-cyan-600 read-only:cursor-default disabled:bg-gray-200"
			{placeholder}
			{required}
			{readonly}
			{disabled}
		/>
	</div>
	{#if label !== undefined}
		<div class="min-w-0 text-sm ml-3">
			<label for={id} class="font-medium text-primary-light-text dark:text-primary-dark-text"
				>{label}</label
			>
		</div>
	{/if}
</div>
<ShowFieldErrors bind:errors showForName={name} />
