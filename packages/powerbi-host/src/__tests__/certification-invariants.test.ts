// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Canary: certification ceiling and constructor-order invariants over the
 * kernel base class (`src/app/visual-kernel.ts`), where a well-meaning edit
 * could silently break them.
 */

const KERNEL_SOURCE_PATH = path.resolve(
    __dirname,
    '..',
    'app',
    'visual-kernel.ts'
);

describe('safety-net bound is the certification ceiling', () => {
    it('SAFETY_NET_BOUND_MS is present and <= 10_000ms', () => {
        const source = readFileSync(KERNEL_SOURCE_PATH, 'utf8');
        const match = source.match(/SAFETY_NET_BOUND_MS\s*=\s*([\d_]+)\s*;/);
        // Fail loud if the constant is renamed/removed rather than pass vacuously.
        if (!match) {
            throw new Error(
                'SAFETY_NET_BOUND_MS not found in src/app/visual-kernel.ts'
            );
        }
        const value = Number(match[1].replace(/_/g, ''));
        expect(value).toBeLessThanOrEqual(10_000);
    });
});

describe('the kernel installs config state before any store read', () => {
    const kernelSource = readFileSync(KERNEL_SOURCE_PATH, 'utf8');

    it('takes the application name and version from its config rather than importing the manifest', () => {
        expect(kernelSource).not.toMatch(/pbiviz\.json/);
        expect(kernelSource).not.toMatch(/lib\/application/);
    });

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

    it('assigns the application version inside the constructor try block, ahead of the migration that consumes it', () => {
        const constructorStart = kernelSource.indexOf('constructor(');
        expect(constructorStart).toBeGreaterThanOrEqual(0);

        const tryIndex = kernelSource.indexOf('try {', constructorStart);
        expect(tryIndex).toBeGreaterThan(constructorStart);

        const versionAssignIndex = kernelSource.indexOf(
            'this.#applicationVersion = config.application.version',
            constructorStart
        );
        expect(versionAssignIndex).toBeGreaterThan(tryIndex);

        expect(kernelSource).toContain(
            'handlePropertyMigration(settings, isReadMode, this.#applicationVersion)'
        );
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
