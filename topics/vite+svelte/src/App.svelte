<script lang="ts">
    import Button from "./Button.svelte"
    let world: string = "world"
</script>

<template>
    <h1>Hello, <Button name={world}>!</Button></h1>
    <div><input bind:value={world}></div>
</template>
