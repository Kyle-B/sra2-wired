import { join } from "node:path";

import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// The svelte plugin compiles `.svelte.ts` runes modules so they can be unit-tested headlessly;
// `conditions: ['browser']` makes svelte resolve to its client (runes) runtime even though
// Vitest runs in Node.
export default defineConfig({
    plugins: [svelte({ preprocess: [vitePreprocess({ script: true })] })],
    resolve: {
        tsconfigPaths: true,
        alias: { tests: join(import.meta.dirname, "tests") },
        ...(process.env.VITEST ? { conditions: ["browser"] } : {}),
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        // Stand-in for Foundry's data model classes, so tests can construct real models.
        setupFiles: ["tests/setup/foundry-mocks.ts"],
        globals: false,
        // The only unit spec is the strippable example (removed by `npm run remove-example-files`
        // alongside ExampleApp). Stay green afterwards until you add your own specs.
        passWithNoTests: true,
    },
});
