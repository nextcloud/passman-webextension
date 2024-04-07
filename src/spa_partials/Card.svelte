<script>
	export let additionalClasses = '';
	export let paddingClasses = 'p-4 sm:p-6 xl:p-8';
</script>

<div
	class="bg-primary-light dark:bg-primary-dark-card dark:text-primary-dark-text shadow rounded-lg {paddingClasses} {additionalClasses}"
>
	<slot />
</div>
