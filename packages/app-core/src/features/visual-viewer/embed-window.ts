import { deepEqual } from 'fast-equals';

/**
 * Decide whether the "embed in flight" window should open (`viewReady` set
 * false) for a newly memoized spec.
 *
 * `useVegaEmbed` re-embeds on DEEP inequality of its spec (it uses
 * `useDeepCompareEffect`), but the spec memo in `VegaEmbed` recomputes — and
 * produces a NEW object — whenever the compilation result's identity changes,
 * and `handleCompile` in the compilation slice creates a fresh result object on
 * EVERY `compile()` call, even when the compiled content is unchanged (e.g. a
 * JSONC comment/whitespace edit). Opening the window on spec IDENTITY change
 * would therefore set `viewReady = false` for a deep-equal spec that
 * `useVegaEmbed` never re-embeds — and nothing would ever flip `viewReady` back
 * to true, deadlocking every subsequent data update into 'defer'.
 *
 * This predicate mirrors `useVegaEmbed`'s deep-compare semantics so the window
 * opens exactly when a real re-embed will follow:
 *
 * - `nextSpec === null` never opens the window (nothing will embed).
 * - A deep-equal spec (new identity, same content) never opens the window
 *   (`useVegaEmbed` will skip the re-embed).
 * - Only a genuinely different spec opens it — and a spec deep-change is
 *   guaranteed to re-embed, whose completion closes the window via
 *   `setViewReady(true)`.
 */
export const shouldOpenEmbedWindow = (
    previousSpec: object | null,
    nextSpec: object | null
): boolean => nextSpec !== null && !deepEqual(previousSpec, nextSpec);
