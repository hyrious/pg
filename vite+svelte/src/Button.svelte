<script lang="ts">
    export let name: string;
</script>

<label><button title={name}>{name}</button><slot /></label>
