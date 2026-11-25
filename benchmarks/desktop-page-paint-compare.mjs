/**
 * Compares two result files written by desktop-page-paint.mjs (`--out`), page by page, and
 * prints the comparison as a Markdown table. A page's time is the median, over its measured
 * visits, of the time from the tab click to the first paint of its slowest visual.
 *
 * Usage:
 *   node benchmarks/desktop-page-paint-compare.mjs <baseline.json> <candidate.json>
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
    console.error(
        'Usage: node benchmarks/desktop-page-paint-compare.mjs <baseline.json> <candidate.json>'
    );
    process.exit(2);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const candidate = JSON.parse(readFileSync(candidatePath, 'utf8'));
const label = (results, path) => results.visual ?? basename(path, '.json');
const baselineLabel = label(baseline, baselinePath);
const candidateLabel = label(candidate, candidatePath);

const warnings = [];
if (baseline.separateProcess !== candidate.separateProcess) {
    warnings.push(
        'The two runs hosted visual sandboxes differently (one in the report process, one in ' +
            'separate processes), which moves every page time; the comparison is not like for like.'
    );
}

const range = (page) => `${page.medianMs} (${page.minMs}–${page.maxMs})`;
const signed = (value) => `${value > 0 ? '+' : ''}${value}`;

// Only pages measured in both runs are compared; the total says so when the runs differ.
const pageNames = (results) => results.summary.map((page) => page.page);
const pagesMissingFrom = (results, other) =>
    pageNames(other).filter((page) => !pageNames(results).includes(page));
const missingFromCandidate = pagesMissingFrom(candidate, baseline);
const missingFromBaseline = pagesMissingFrom(baseline, candidate);
for (const page of missingFromCandidate) {
    warnings.push(`"${page}" is missing from ${candidateLabel}.`);
}
for (const page of missingFromBaseline) {
    warnings.push(`"${page}" is missing from ${baselineLabel}.`);
}
const samePages = !missingFromCandidate.length && !missingFromBaseline.length;

const rows = [];
const pagesWithoutVisuals = [];
const ratios = [];
let baselineTotal = 0;
let candidateTotal = 0;
for (const before of baseline.summary) {
    const after = candidate.summary.find((page) => page.page === before.page);
    if (!after) continue;
    if (!before.visuals && !after.visuals) {
        pagesWithoutVisuals.push(before.page);
        continue;
    }
    if (before.visuals !== after.visuals) {
        warnings.push(
            `"${before.page}" has ${before.visuals} visuals in ${baselineLabel} and ${after.visuals} in ${candidateLabel}.`
        );
    }
    for (const [results, page] of [
        [baselineLabel, before],
        [candidateLabel, after]
    ]) {
        if (page.visitsWithUnpaintedVisuals) {
            warnings.push(
                `"${page.page}" in ${results}: ${page.visitsWithUnpaintedVisuals} visits had a visual that ` +
                    'never painted, so its time covers only the visuals that did.'
            );
        }
    }
    if (before.medianMs === undefined || after.medianMs === undefined) {
        rows.push(
            `| ${before.page} | ${before.visuals} | ${before.medianMs === undefined ? 'nothing painted' : range(before)} ` +
                `| ${after.medianMs === undefined ? 'nothing painted' : range(after)} | | |`
        );
        continue;
    }
    const difference = after.medianMs - before.medianMs;
    const percent = Math.round((difference / before.medianMs) * 100);
    const ratio = before.medianMs / after.medianMs;
    ratios.push(ratio);
    baselineTotal += before.medianMs;
    candidateTotal += after.medianMs;
    rows.push(
        `| ${before.page} | ${before.visuals} | ${range(before)} | ${range(after)} ` +
            `| ${signed(difference)} ms (${signed(percent)}%) | ${ratio.toFixed(2)}× |`
    );
}

const totalDifference = candidateTotal - baselineTotal;
const sortedRatios = [...ratios].sort((a, b) => a - b);
const medianRatio = sortedRatios.length
    ? sortedRatios.length % 2
        ? sortedRatios[Math.floor(sortedRatios.length / 2)]
        : (sortedRatios[sortedRatios.length / 2 - 1] +
              sortedRatios[sortedRatios.length / 2]) /
          2
    : undefined;

console.log(
    `## ${candidateLabel} compared with ${baselineLabel}\n\n` +
        `Time from clicking a page tab until every custom visual on the page has painted: ` +
        `median over ${baseline.runs} and ${candidate.runs} visits, ms (fastest–slowest). ` +
        `Speed-up is how many times as fast ${candidateLabel} is.\n`
);
console.log(
    `| Page | Visuals | ${baselineLabel} | ${candidateLabel} | Difference | Speed-up |`
);
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const row of rows) console.log(row);
if (ratios.length) {
    console.log(
        `| **${samePages ? 'Every page once' : 'Every page in both runs, once'}** ` +
            `| | **${baselineTotal}** | **${candidateTotal}** ` +
            `| **${signed(totalDifference)} ms (${signed(Math.round((totalDifference / baselineTotal) * 100))}%)** ` +
            `| **${(baselineTotal / candidateTotal).toFixed(2)}×** |`
    );
    console.log(
        `\nMedian speed-up across ${ratios.length} pages: ${medianRatio.toFixed(2)}× ` +
            `(range ${sortedRatios[0].toFixed(2)}×–${sortedRatios.at(-1).toFixed(2)}×).`
    );
}
if (pagesWithoutVisuals.length) {
    console.log(
        `\nPages without custom visuals (not timed): ${pagesWithoutVisuals.join(', ')}.`
    );
}
console.log(
    `\nVisual sandboxes in a separate process: ${baselineLabel} ${baseline.separateProcess ? 'yes' : 'no'}, ` +
        `${candidateLabel} ${candidate.separateProcess ? 'yes' : 'no'}.`
);
if (warnings.length) {
    console.log('\n**Warnings**\n');
    for (const warning of warnings) console.log(`- ${warning}`);
}
