import type { UserConfig } from "vite";
import { svelte } from "vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess"

const config: UserConfig = {
    plugins: [svelte({ preprocess: sveltePreprocess() })],
    rollupDedupe: ['svelte']
}

export default config;
