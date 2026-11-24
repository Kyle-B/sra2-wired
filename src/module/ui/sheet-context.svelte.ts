/**
 * The bridge between an ApplicationV2 sheet and its Svelte components. The sheet mounts its root
 * component once and, on every render, hands the freshly prepared context to `set()`; components
 * read `current`, so everything that depends on it updates in place (focus, open tabs and other
 * component state survive the re-render).
 */
export class SheetContext<TContext> {
    // Raw: each render prepares a new context object, so replacing it is the only change to track.
    current: TContext = $state.raw() as TContext;

    constructor(initial: TContext) {
        this.current = initial;
    }

    set(context: TContext): void {
        this.current = context;
    }
}
