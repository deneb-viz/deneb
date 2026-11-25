/**
 * Measures how long each report page takes, in Power BI Desktop, from clicking its page tab
 * to the first paint of each custom visual on it. Use it to compare two pages that hold the
 * same chart in different visuals, or (with `--swap-visual` and the compare script) one report
 * with every Deneb visual swapped to one package and then to another.
 *
 * Start of a visit: a real mouse click on the page tab, sent through the browser's input
 * pipeline. First paint: the browser's own `first-contentful-paint` entry for the visual's
 * sandbox document. Power BI creates a new sandbox document for every visual on every page
 * visit, so each visit is measured from a fresh start. The time Vega's `.marks` element is
 * added is reported too; a first paint before it means something other than the chart
 * painted first. A page's time is that of its slowest visual: the moment every chart on it
 * has appeared.
 *
 * The pages are visited in order, once unmeasured, then `--runs` times measured.
 *
 * Usage:
 *   node benchmarks/desktop-page-paint.mjs --report <report.pbix|report.pbip> [--pages "A,B"] [--runs 10]
 *   node benchmarks/desktop-page-paint.mjs --report <report.pbip> --swap-visual <visual.pbiviz> --out results.json
 *   node benchmarks/desktop-page-paint.mjs --port 9223 --pages "A,B"
 *
 * With `--report`, the report is copied to a temporary folder of its own (the original is never
 * opened or saved over) and opened in a Desktop instance of its own, with a debugging port and a
 * new WebView2 profile. Desktop is closed and the folder removed at the end, Ctrl+C included.
 * A `.pbip` is copied with the rest of its folder.
 * The profile is new on every launch because Desktop does not always host visual sandboxes
 * the same way: in the report's own process or in separate ones. A new profile has given the
 * same answer each time, and the answer is printed and saved with the results.
 *
 * `--swap-visual` (`.pbip` only) adds the package to the copy as a private visual and points
 * every Deneb and Deneb Runtime visual (of any channel) at it.
 *
 * Without `--report`, it attaches to a Desktop already started with the environment variables
 * WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<port> and
 * WEBVIEW2_USER_DATA_FOLDER=<a folder of its own>. A Desktop that shares the default profile
 * with an instance that is already open joins that instance's browser and ignores the port.
 *
 * Options:
 *   --pages <a,b,...>  two or more page names, in visiting order (default: every page, in tab order).
 *                      A visit is a click on another page's tab, so one page alone measures nothing.
 *   --runs <n>         measured visits per page (default 10)
 *   --out <file>       write the visits and the summary as JSON, for desktop-page-paint-compare.mjs
 *   --timeout <ms>     longest wait for a page's visuals to paint (default 15000)
 *   --quiet <ms>       wait after the last paint before the next visit (default 1500)
 *   --desktop <path>   PBIDesktop.exe (default: the Program Files install)
 *   --verbose          log every visual of every visit, and every target the debugger attaches to
 */
import { spawn, execFileSync } from 'node:child_process';
import {
    copyFileSync,
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    renameSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import {
    basename,
    dirname,
    extname,
    isAbsolute,
    join,
    relative,
    resolve,
    sep
} from 'node:path';
import { parseArgs } from 'node:util';

const { values: options } = parseArgs({
    options: {
        report: { type: 'string' },
        'swap-visual': { type: 'string' },
        port: { type: 'string', default: '9223' },
        pages: { type: 'string' },
        runs: { type: 'string', default: '10' },
        out: { type: 'string' },
        timeout: { type: 'string', default: '15000' },
        quiet: { type: 'string', default: '1500' },
        desktop: {
            type: 'string',
            default:
                'C:\\Program Files\\Microsoft Power BI Desktop\\bin\\PBIDesktop.exe'
        },
        verbose: { type: 'boolean', default: false }
    }
});
const requestedPages = options.pages?.split(',').map((page) => page.trim());
const runs = Number(options.runs);
const timeoutMs = Number(options.timeout);
const quietMs = Number(options.quiet);
const debuggingUrl = `http://127.0.0.1:${options.port}`;

/** How long a visit waits for any visual sandbox to start before deciding the page has none. */
const NO_VISUALS_AFTER_MS = 3000;

/** The visual type of Deneb or Deneb Runtime, release or channel build. */
const DENEB_VISUAL_TYPE =
    /^(ALPHA|BETA|STANDALONE)?(deneb7E15AEF80B9E4D4F8E12924291ECE89A|denebRuntime)$/;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findReportView = async () => {
    try {
        const targets = await (await fetch(`${debuggingUrl}/json/list`)).json();
        return targets.find(
            (target) =>
                target.type === 'page' && /reportView\.html/.test(target.url)
        );
    } catch {
        return undefined;
    }
};

if (options['swap-visual'] && extname(options.report ?? '') !== '.pbip') {
    console.error('--swap-visual needs --report <report.pbip>');
    process.exit(2);
}

// Desktop is started only when given a report, from a temporary folder of its own. Both are
// removed at the end: Desktop with its child processes, and the folder with everything in it.
let desktopProcess;
let workFolder;
let swappedVisualGuid = null;

const cleanUp = () => {
    if (desktopProcess) {
        try {
            execFileSync(
                'taskkill',
                ['/PID', String(desktopProcess.pid), '/T', '/F'],
                { stdio: 'ignore' }
            );
        } catch {
            // Already closed.
        }
    }
    if (workFolder) {
        try {
            // Desktop's processes can hold files for a moment after they are ended.
            rmSync(workFolder, {
                recursive: true,
                force: true,
                maxRetries: 10,
                retryDelay: 500
            });
        } catch {
            console.error(`Could not remove ${workFolder}`);
        }
    }
};
// Ctrl+C ends the process without running `finally`, so the cleanup runs here as well.
process.on('SIGINT', () => {
    cleanUp();
    process.exit(130);
});

try {
    if (requestedPages) checkPages(requestedPages);
    if (options.report) await openReportInDesktop();
    await measure();
} finally {
    cleanUp();
}
process.exit(0);

/** A visit is a click on another page's tab: clicking the tab of the page already shown loads nothing. */
function checkPages(pages) {
    if (pages.length < 2 || new Set(pages).size !== pages.length) {
        throw new Error(
            'Pages to visit must be two or more different pages; to time one page, also name a page to visit in between.'
        );
    }
}

async function openReportInDesktop() {
    if (await findReportView()) {
        throw new Error(
            `Port ${options.port} is already in use by a Desktop; close it or pass another --port.`
        );
    }
    workFolder = mkdtempSync(join(tmpdir(), 'deneb-desktop-page-paint-'));
    const reportCopy = copyReport(options.report);
    if (options['swap-visual']) {
        const { guid, visualCount } = swapDenebVisuals(
            reportCopy,
            options['swap-visual']
        );
        swappedVisualGuid = guid;
        console.log(`Pointed ${visualCount} Deneb visuals at ${guid}`);
    }
    const profileFolder = join(workFolder, 'webview2-profile');
    desktopProcess = spawn(options.desktop, [reportCopy], {
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            // The backgrounding switches keep frames painting while Desktop is behind another window.
            WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: [
                `--remote-debugging-port=${options.port}`,
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ].join(' '),
            WEBVIEW2_USER_DATA_FOLDER: profileFolder
        }
    });
    console.log(
        `Opened a copy of ${basename(options.report)} in Desktop (process ${desktopProcess.pid})`
    );
}

/** Copies a .pbix, or a .pbip with the rest of its folder, into the work folder; returns the copy's path. */
function copyReport(reportPath) {
    const copyFolder = join(workFolder, 'report');
    if (extname(reportPath) === '.pbix') {
        mkdirSync(copyFolder, { recursive: true });
        copyFileSync(reportPath, join(copyFolder, basename(reportPath)));
    } else if (extname(reportPath) === '.pbip') {
        cpSync(dirname(reportPath), copyFolder, {
            recursive: true,
            filter: (source) => basename(source) !== '.git'
        });
    } else {
        throw new Error(`Expected a .pbix or .pbip report: ${reportPath}`);
    }
    return join(copyFolder, basename(reportPath));
}

/**
 * Adds a .pbiviz package to a PBIP report as a private visual, the way Desktop stores one, and
 * points every Deneb or Deneb Runtime visual at it. Packages of those visuals already in the
 * report, private or AppSource, are removed.
 */
function swapDenebVisuals(pbipPath, pbivizPath) {
    const projectFolder = dirname(pbipPath);
    const pbip = JSON.parse(readFileSync(pbipPath, 'utf8'));
    const reportPath = pbip.artifacts?.find((artifact) => artifact.report)
        ?.report.path;
    if (!reportPath) throw new Error(`${basename(pbipPath)} names no report`);
    // Only the copied project may change. A report path that leads out of it would point the
    // swap at another report, such as the original.
    const reportFolder = resolve(projectFolder, reportPath);
    if (!isInsideFolder(projectFolder, reportFolder)) {
        throw new Error(
            `The report folder "${reportPath}" is outside the project folder, so the swap would change files outside the copy.`
        );
    }
    const customVisualsFolder = join(reportFolder, 'CustomVisuals');
    const unpackFolder = join(workFolder, 'unpacked-visual');
    mkdirSync(unpackFolder, { recursive: true });
    // Windows' own tar reads zip archives, which a .pbiviz is.
    execFileSync(join(process.env.SystemRoot, 'System32', 'tar.exe'), [
        '-xf',
        pbivizPath,
        '-C',
        unpackFolder
    ]);
    const { guid } = JSON.parse(
        readFileSync(join(unpackFolder, 'package.json'), 'utf8')
    ).visual;

    mkdirSync(customVisualsFolder, { recursive: true });
    for (const folder of readdirSync(customVisualsFolder)) {
        if (DENEB_VISUAL_TYPE.test(folder)) {
            rmSync(join(customVisualsFolder, folder), {
                recursive: true,
                force: true
            });
        }
    }
    renameSync(unpackFolder, join(customVisualsFolder, guid));

    const reportJsonPath = join(reportFolder, 'definition', 'report.json');
    const report = JSON.parse(readFileSync(reportJsonPath, 'utf8'));
    report.publicCustomVisuals = (report.publicCustomVisuals ?? []).filter(
        (visualType) => !DENEB_VISUAL_TYPE.test(visualType)
    );
    if (!report.publicCustomVisuals.length) delete report.publicCustomVisuals;
    report.resourcePackages = (report.resourcePackages ?? []).filter(
        (resourcePackage) =>
            !(
                resourcePackage.type === 'CustomVisual' &&
                DENEB_VISUAL_TYPE.test(resourcePackage.name)
            )
    );
    report.resourcePackages.push({
        name: guid,
        type: 'CustomVisual',
        items: [
            {
                name: `${guid}.pbiviz.json`,
                path: `${guid}.pbiviz.json`,
                type: 'CustomVisualMetadata'
            }
        ]
    });
    writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));

    // Visuals, and bookmarks that hold a snapshot of a visual, name its visual type.
    let visualCount = 0;
    const definitionFolder = join(reportFolder, 'definition');
    const visualTypeProperty = /("visualType"\s*:\s*")([^"]+)(")/g;
    for (const file of readdirSync(definitionFolder, { recursive: true })) {
        if (!file.endsWith('.json') || file === 'report.json') continue;
        const filePath = join(definitionFolder, file);
        const text = readFileSync(filePath, 'utf8');
        const swapped = text.replace(
            visualTypeProperty,
            (property, start, visualType, end) => {
                if (!DENEB_VISUAL_TYPE.test(visualType)) return property;
                if (file.endsWith('visual.json')) visualCount++;
                return `${start}${guid}${end}`;
            }
        );
        if (swapped !== text) writeFileSync(filePath, swapped);
    }
    return { guid, visualCount };
}

async function measure() {
    const reportView = await waitFor(
        findReportView,
        180000,
        'the report view on the debugging port'
    );

    const ws = new WebSocket(reportView.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));
    let nextId = 1;
    const pending = new Map();
    const eventHandlers = [];
    ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.id && pending.has(message.id)) {
            const { resolve, reject } = pending.get(message.id);
            pending.delete(message.id);
            if (message.error) reject(new Error(JSON.stringify(message.error)));
            else resolve(message.result);
        } else if (message.method) {
            for (const handler of eventHandlers) handler(message);
        }
    });
    const send = (method, params = {}, sessionId) =>
        new Promise((resolve, reject) => {
            const id = nextId++;
            pending.set(id, { resolve, reject });
            ws.send(
                JSON.stringify({
                    id,
                    method,
                    params,
                    ...(sessionId && { sessionId })
                })
            );
        });
    const evaluate = async (expression) =>
        (
            await send('Runtime.evaluate', {
                expression,
                returnByValue: true,
                awaitPromise: true
            })
        ).result.value;

    // Runs in every new document before its own scripts, and acts only in custom visual
    // sandboxes. Power BI hosts a sandbox either in the report's own process or in a separate
    // one, so the probe is installed in both places and each sandbox document names itself.
    const sandboxProbe = `(() => {
        if (!location.pathname.endsWith('/cvSandboxPack.html')) return;
        const frameId = Math.random().toString(36).slice(2);
        const plugin = new URLSearchParams(location.search).get('plugin');
        const report = (kind, time) => window.__pagePaintTiming(JSON.stringify({
            frameId, plugin, kind, epoch: performance.timeOrigin + time, width: innerWidth, height: innerHeight
        }));
        report('document-start', performance.now());
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) report(entry.name, entry.startTime);
        }).observe({ type: 'paint', buffered: true });
        const observer = new MutationObserver(() => {
            if (document.querySelector('.marks')) {
                observer.disconnect();
                report('marks-inserted', performance.now());
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    })();`;

    const installProbe = async (sessionId) => {
        await send(
            'Runtime.addBinding',
            { name: '__pagePaintTiming' },
            sessionId
        );
        await send('Runtime.enable', {}, sessionId);
        await send('Page.enable', {}, sessionId);
        await send(
            'Page.addScriptToEvaluateOnNewDocument',
            { source: sandboxProbe },
            sessionId
        );
    };

    // Each visit collects reports from the sandbox documents that start after its click.
    let currentVisit = null;
    let separateProcessFrames = 0;

    eventHandlers.push(async (message) => {
        if (message.method === 'Target.attachedToTarget') {
            const { sessionId, targetInfo, waitingForDebugger } =
                message.params;
            if (options.verbose)
                console.log(
                    'attached',
                    targetInfo.type,
                    targetInfo.url.slice(0, 100)
                );
            try {
                if (targetInfo.type === 'iframe') {
                    separateProcessFrames++;
                    await installProbe(sessionId);
                }
            } finally {
                // Every auto-attached target starts paused; one left paused freezes the report.
                if (waitingForDebugger)
                    await send(
                        'Runtime.runIfWaitingForDebugger',
                        {},
                        sessionId
                    ).catch(() => {});
            }
        }
        if (
            message.method === 'Runtime.bindingCalled' &&
            message.params.name === '__pagePaintTiming'
        ) {
            if (!currentVisit) return;
            const report = JSON.parse(message.params.payload);
            if (report.kind === 'document-start') {
                currentVisit.frames.set(report.frameId, {
                    plugin: report.plugin,
                    events: {}
                });
            }
            const frame = currentVisit.frames.get(report.frameId);
            if (!frame) return;
            frame.events[report.kind] ??= report.epoch;
            frame.size = `${report.width}x${report.height}`;
            currentVisit.lastEventAt = Date.now();
        }
    });

    await installProbe();
    await send('Target.setAutoAttach', {
        autoAttach: true,
        waitForDebuggerOnStart: true,
        flatten: true
    });

    // A page tab is named by the first line of its text: the selected tab adds a close button's "x".
    const allPages = await waitFor(
        async () => {
            const names = await evaluate(
                `[...document.querySelectorAll('div[role="tab"].section')]
                    .map((el) => el.innerText.split('\\n')[0].trim())`
            );
            return names.length ? names : undefined;
        },
        180000,
        'the page tabs'
    );
    const pages = requestedPages ?? allPages;
    const missing = pages.filter((page) => !allPages.includes(page));
    if (missing.length)
        throw new Error(`Page tabs not found: ${missing.join(', ')}`);
    checkPages(pages);
    // Lets the page that opens with the report finish loading before the first click.
    await wait(5000);

    // The page name goes to the report view as an argument, never as part of the code it runs.
    const { result: reportViewGlobal } = await send('Runtime.evaluate', {
        expression: 'globalThis'
    });
    const tabCentre = async (pageName) => {
        const { result } = await send('Runtime.callFunctionOn', {
            objectId: reportViewGlobal.objectId,
            functionDeclaration: `function (pageName) {
                const tab = [...document.querySelectorAll('div[role="tab"].section')]
                    .find((el) => el.innerText.split('\\n')[0].trim() === pageName);
                if (!tab) return null;
                tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                const box = tab.getBoundingClientRect();
                return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            }`,
            arguments: [{ value: pageName }],
            returnByValue: true
        });
        if (!result.value) throw new Error(`Page tab not found: ${pageName}`);
        return result.value;
    };

    const click = async ({ x, y }) => {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        const clickedAt = Date.now();
        await send('Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x,
            y,
            button: 'left',
            clickCount: 1
        });
        await send('Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x,
            y,
            button: 'left',
            clickCount: 1
        });
        return clickedAt;
    };

    const visit = async (pageName) => {
        const point = await tabCentre(pageName);
        currentVisit = { pageName, frames: new Map(), lastEventAt: Date.now() };
        currentVisit.clickedAt = await click(point);
        const deadline = currentVisit.clickedAt + timeoutMs;
        // A visit ends once every visual has painted and nothing has reported for quietMs.
        for (;;) {
            await wait(100);
            const frames = [...currentVisit.frames.values()];
            const allPainted =
                frames.length > 0 &&
                frames.every((frame) => frame.events['first-contentful-paint']);
            if (allPainted && Date.now() - currentVisit.lastEventAt > quietMs)
                break;
            if (
                frames.length === 0 &&
                Date.now() - currentVisit.clickedAt > NO_VISUALS_AFTER_MS
            )
                break;
            if (Date.now() > deadline) break;
        }
        const sinceClick = (epoch) =>
            epoch === undefined
                ? undefined
                : Math.round(epoch - currentVisit.clickedAt);
        const frames = [...currentVisit.frames.values()].map((frame) => ({
            plugin: frame.plugin,
            size: frame.size,
            startMs: sinceClick(frame.events['document-start']),
            marksMs: sinceClick(frame.events['marks-inserted']),
            paintMs: sinceClick(frame.events['first-contentful-paint'])
        }));
        const paintTimes = frames
            .map((frame) => frame.paintMs)
            .filter((paintMs) => paintMs !== undefined);
        currentVisit = null;
        return {
            page: pageName,
            visuals: frames.length,
            painted: paintTimes.length,
            slowestPaintMs: paintTimes.length
                ? Math.max(...paintTimes)
                : undefined,
            frames
        };
    };

    const paintedBeforeChart = (frame) =>
        frame.paintMs !== undefined &&
        frame.marksMs !== undefined &&
        frame.paintMs < frame.marksMs;

    const describeVisit = (result) => {
        if (!result.visuals) return 'no visuals';
        const unpainted = result.visuals - result.painted;
        const early = result.frames.filter(paintedBeforeChart).length;
        return [
            `${result.visuals} visuals`,
            `slowest paint ${result.slowestPaintMs ?? '-'} ms`,
            unpainted && `${unpainted} never painted`,
            early && `${early} painted before the chart`
        ]
            .filter(Boolean)
            .join(', ');
    };

    const describeFrame = (frame) =>
        `    ${frame.plugin} ${frame.size} document=${frame.startMs} marks=${frame.marksMs ?? '-'} ` +
        `paint=${frame.paintMs ?? '-'}${paintedBeforeChart(frame) ? ' (painted before the chart)' : ''}`;

    const visits = [];
    for (const pageName of pages) await visit(pageName);
    for (let run = 1; run <= runs; run++) {
        for (const pageName of pages) {
            const result = await visit(pageName);
            visits.push({ run, ...result });
            console.log(`run ${run} ${pageName}: ${describeVisit(result)}`);
            if (options.verbose)
                for (const frame of result.frames)
                    console.log(describeFrame(frame));
        }
    }
    ws.close();

    const separateProcess = separateProcessFrames > 0;
    const summary = pages.map((pageName) => {
        const pageVisits = visits.filter((v) => v.page === pageName);
        const times = pageVisits
            .map((v) => v.slowestPaintMs)
            .filter((ms) => ms !== undefined);
        return {
            page: pageName,
            visuals: Math.max(...pageVisits.map((v) => v.visuals)),
            visitsWithUnpaintedVisuals: pageVisits.filter(
                (v) => v.painted < v.visuals
            ).length,
            medianMs: times.length ? median(times) : undefined,
            minMs: times.length ? Math.min(...times) : undefined,
            maxMs: times.length ? Math.max(...times) : undefined
        };
    });

    console.log(
        `\nVisual sandboxes in a separate process: ${separateProcess ? 'yes' : 'no'}`
    );
    console.log(
        'ms from page tab click to first paint of the slowest visual on the page:'
    );
    for (const page of summary) {
        if (page.medianMs === undefined) {
            console.log(
                `  ${page.page}: ${page.visuals ? 'nothing painted' : 'no visuals'}`
            );
            continue;
        }
        const unpainted = page.visitsWithUnpaintedVisuals
            ? `; ${page.visitsWithUnpaintedVisuals} visits had a visual that never painted`
            : '';
        console.log(
            `  ${page.page}: median ${page.medianMs}, min ${page.minMs}, max ${page.maxMs} ` +
                `(${page.visuals} visuals${unpainted})`
        );
    }
    // Pages named on the command line are usually there to be compared with the first.
    const [baseline, ...others] = requestedPages
        ? summary.filter((page) => page.medianMs !== undefined)
        : [];
    for (const page of others) {
        const difference = page.medianMs - baseline.medianMs;
        console.log(
            `  ${page.page} vs ${baseline.page}: ${difference > 0 ? '+' : ''}${difference} ms, ` +
                `${(baseline.medianMs / page.medianMs).toFixed(2)}× as fast`
        );
    }

    if (options.out) {
        writeFileSync(
            options.out,
            JSON.stringify(
                {
                    report: options.report ? basename(options.report) : null,
                    visual: swappedVisualGuid,
                    measuredAt: new Date().toISOString(),
                    runs,
                    separateProcess,
                    summary,
                    visits
                },
                null,
                2
            )
        );
        console.log(`\nResults written to ${options.out}`);
    }
}

/** Whether a path is inside a folder, and is not the folder itself. */
function isInsideFolder(folder, path) {
    const fromFolder = relative(folder, path);
    return (
        fromFolder !== '' &&
        fromFolder !== '..' &&
        !fromFolder.startsWith(`..${sep}`) &&
        !isAbsolute(fromFolder)
    );
}

async function waitFor(check, timeoutMs, description) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const value = await check();
        if (value) return value;
        if (Date.now() > deadline)
            throw new Error(`Timed out waiting for ${description}`);
        await wait(1000);
    }
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
        ? sorted[middle]
        : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}
