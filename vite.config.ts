import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

import systemManifest from "./system.json" with { type: "json" };

const SYSTEM_ID = systemManifest.id;

const PROXY_PORT = 31006;
const FOUNDRY_PORT = 31007;
const FOUNDRY_HOST = "localhost";
const FOUNDRY_URL = `http://${FOUNDRY_HOST}:${FOUNDRY_PORT}`;
const ALLOWED_HOST = "fvtt-dev.yggdrasil.fyi";

export default defineConfig(({ command, mode }) => {
    const buildMode = mode === "production" ? "production" : "development";
    // Setup shared plugins
    const plugins = [svelte({ preprocess: [vitePreprocess({ script: true })] })];

    // Setup prod vs dev plugins
    if (buildMode === "production") {
        plugins.push(
            viteStaticCopy({
                targets: [
                    { src: "system.json", dest: "." },
                    { src: "README.md", dest: "." },
                    { src: "CONTRIBUTING.md", dest: "." },
                ],
            }),
        );
    } else {
        plugins.push();
    }

    return {
        base: command === "build" ? "./" : `/systems/${SYSTEM_ID}/`,
        publicDir: "static",
        resolve: { tsconfigPaths: true },
        build: {
            emptyOutDir: false,
            sourcemap: buildMode === "development",
            minify: false,
            target: "es2024",
            lib: {
                name: SYSTEM_ID,
                entry: "src/sra2-wired.ts",
                formats: ["es"],
                fileName: SYSTEM_ID,
            },
            rolldownOptions: {
                output: {
                    assetFileNames: (asset) => {
                        const name = asset.names?.[0] ?? "";
                        return name.endsWith(".css")
                            ? `styles/${SYSTEM_ID}.css`
                            : "[name][extname]";
                    },
                    chunkFileNames: "[name].mjs",
                    entryFileNames: `${SYSTEM_ID}.mjs`,
                },
            },
        },
        // root is src/, so point the plugin at the repo-root config (shared with svelte-check).
        plugins: [],
        // `npm run dev` runs this as a reverse proxy in front of Foundry: open
        // http://localhost:30001/game (NOT :30000) and Vite serves our system's source with
        // HMR while proxying everything else — Foundry routes, the socket, our static files —
        // to the real server on FOUNDRY_PORT. Ignored by `vite build`.
        server: {
            port: PROXY_PORT,
            open: "/game",
            allowedHosts: [ALLOWED_HOST],
            proxy: {
                // The built entry doesn't exist in dev: bounce Foundry's
                // request for it back to Vite as src/index.ts (base maps
                // /system/<id>/ → src/), served with HMR. We will get some
                // 404s looking for the system css file, but those can be
                // ignored, Vite will handle compiling the scss referened from
                // the src/**.ts files.
                [`/systems/${SYSTEM_ID}/${SYSTEM_ID}.mjs`]: {
                    target: `http://localhost:${PROXY_PORT}/systems/${SYSTEM_ID}`,
                    rewrite: () => `src/sra2-wired.ts`,
                },
                // Our static files live on disk under the dist/, not in Vite's src/ root — Foundry serves them.
                [`^/systems/${SYSTEM_ID}/(lang|packs|assets)/`]: FOUNDRY_URL,
                // Everything outside our system (Foundry core, other modules).
                [`^(?!/systems/${SYSTEM_ID}/)`]: FOUNDRY_URL,
                "/socket.io": { target: `ws://${FOUNDRY_HOST}:${FOUNDRY_PORT}`, ws: true },
            },
        },
    };
});
