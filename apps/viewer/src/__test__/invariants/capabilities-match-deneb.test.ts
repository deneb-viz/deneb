// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { APP_ROOT, readAppJson } from './_files';

/**
 * Canary: this visual's capabilities stay in step with Deneb's, so a
 * template behaves the same in either visual and the two format panes
 * share one set of objects and strings. The only intended differences are
 * the editor object and advanced edit mode (Deneb only), the template
 * object (this visual only), and the privileges each one requests.
 *
 * Skipped when Deneb's app is absent, as in a tree pruned to this visual.
 */
type Capabilities = {
    objects: Record<string, unknown>;
} & Record<string, unknown>;

const DENEB_CAPABILITIES = join('..', 'deneb', 'capabilities.json');
const INTENDED_DIFFERENCES = [
    'objects',
    'privileges',
    'advancedEditModeSupport'
];

const withoutIntendedDifferences = (capabilities: Capabilities) =>
    Object.fromEntries(
        Object.entries(capabilities).filter(
            ([key]) => !INTENDED_DIFFERENCES.includes(key)
        )
    );

// Read inside each test: vitest still runs a skipped suite's callback to
// collect its tests, so a read there would throw when Deneb is absent.
const readBoth = () => ({
    viewer: readAppJson<Capabilities>('capabilities.json'),
    deneb: readAppJson<Capabilities>(DENEB_CAPABILITIES)
});

describe.skipIf(!existsSync(join(APP_ROOT, DENEB_CAPABILITIES)))(
    "capabilities match Deneb's",
    () => {
        it('shares every top-level entry except objects, privileges and advanced edit mode', () => {
            const { viewer, deneb } = readBoth();
            expect(withoutIntendedDifferences(viewer)).toEqual(
                withoutIntendedDifferences(deneb)
            );
        });

        it("has Deneb's objects, without the editor and with the template", () => {
            const { viewer, deneb } = readBoth();
            const { editor, ...denebObjects } = deneb.objects;
            const { template, ...viewerObjects } = viewer.objects;
            expect(editor).toBeDefined();
            expect(template).toBeDefined();
            expect(viewerObjects).toEqual(denebObjects);
        });
    }
);
