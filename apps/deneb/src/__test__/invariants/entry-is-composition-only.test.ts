// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ROOT } from './_packages';

/**
 * Canary: the visual's entry (`src/index.ts`) stays composition-only —
 * lifecycle logic lives in the kernel base class, and the entry forwards
 * options plus its config to it.
 */

describe('the entry is composition-only', () => {
    const entrySource = readFileSync(join(APP_ROOT, 'src', 'index.ts'), 'utf8');

    it('exports `class Deneb extends VisualKernel`', () => {
        expect(entrySource).toMatch(/class Deneb extends VisualKernel/);
    });

    it('contains no dataset-resolution dispatch logic', () => {
        expect(entrySource).not.toContain('resolveDatasetUpdateAction');
    });

    it('contains no safety-net wiring', () => {
        expect(entrySource).not.toContain('SAFETY_NET');
    });

    it('contains no teardown logic', () => {
        expect(entrySource).not.toContain('destroy(');
    });

    it('does not call the editor state install directly', () => {
        expect(entrySource).not.toContain('installEditorState(');
    });
});

describe('the kernel installs config state before any store read', () => {
    const kernelSource = readFileSync(
        join(APP_ROOT, 'src', 'kernel', 'visual-kernel.ts'),
        'utf8'
    );

    it('calls config.installState before the first store read in the constructor', () => {
        const constructorStart = kernelSource.indexOf('constructor(');
        expect(constructorStart).toBeGreaterThanOrEqual(0);

        const installIndex = kernelSource.indexOf(
            'config.installState?.()',
            constructorStart
        );
        expect(installIndex).toBeGreaterThan(constructorStart);

        const firstStoreReadIndex = kernelSource.indexOf(
            'getDenebState(',
            constructorStart
        );
        expect(firstStoreReadIndex).toBeGreaterThan(constructorStart);

        expect(installIndex).toBeLessThan(firstStoreReadIndex);
    });

    it('calls config.installState after the root element is captured, so a throw from it still leaves the construction-failure path an element to render into', () => {
        const constructorStart = kernelSource.indexOf('constructor(');
        expect(constructorStart).toBeGreaterThanOrEqual(0);

        const hostElementCaptureIndex = kernelSource.indexOf(
            'this.#hostElement = element;',
            constructorStart
        );
        expect(hostElementCaptureIndex).toBeGreaterThan(constructorStart);

        const installIndex = kernelSource.indexOf(
            'config.installState?.()',
            constructorStart
        );
        expect(installIndex).toBeGreaterThan(constructorStart);

        expect(hostElementCaptureIndex).toBeLessThan(installIndex);
    });

    it('re-seeds the settings slice from the bound model class after bind and before the next store read', () => {
        const constructorStart = kernelSource.indexOf('constructor(');
        expect(constructorStart).toBeGreaterThanOrEqual(0);

        const bindIndex = kernelSource.indexOf(
            'VisualFormattingSettingsService.bind(',
            constructorStart
        );
        expect(bindIndex).toBeGreaterThan(constructorStart);

        const reseedIndex = kernelSource.indexOf(
            'useDenebVisualState.setState({',
            bindIndex
        );
        expect(reseedIndex).toBeGreaterThan(bindIndex);

        // No visual-state or app-core read should sit between the bind call
        // and the re-seed — that would read the settings slice while it
        // still reflects the generic `HostSettingsModel` seeded at module
        // load, before `bind` told the formatting service which class to
        // use.
        const nextVisualStateRead = kernelSource.indexOf(
            'getDenebVisualState(',
            bindIndex
        );
        const nextAppCoreRead = kernelSource.indexOf(
            'getDenebState(',
            bindIndex
        );
        for (const nextRead of [nextVisualStateRead, nextAppCoreRead]) {
            if (nextRead !== -1) {
                expect(reseedIndex).toBeLessThan(nextRead);
            }
        }
    });
});
