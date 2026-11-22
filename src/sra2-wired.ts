/// <reference types="@dfreds/foundry-types" />

import "./styles/main.scss";
import { SYSTEM_ID } from "@module/constants.ts";
//import { ExampleApp } from './ui/ExampleApp.ts';

Hooks.once("init", () => {
    console.log(`${SYSTEM_ID} | init`);
});

Hooks.once("ready", () => {
    const system = game.system;
    const version = system?.version ?? "0.0.0";
    //const api: ModuleApi = { version, open: () => ExampleApp.open() };
    // `api` is the Foundry convention for a public API, but isn't a typed field on Module.
    //if (module) (module as { api?: ModuleApi }).api = api;
    console.log(`${system.id} | ready (v${version})`);
});
