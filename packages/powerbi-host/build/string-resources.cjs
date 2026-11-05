const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.join(__dirname, '..');

const readJson = (...segments) =>
    JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, ...segments), 'utf8'));

/**
 * The en-US format pane strings every visual shares: the format pane's own,
 * plus the ones a visual's settings pane shows too. Throws if both define a
 * key, as one would silently replace the other.
 */
const readSharedStringResources = () => {
    const formatPane = readJson('stringResources', 'en-US.json').values;
    const settingsPane = readJson('src', 'i18n', 'settings-pane.en-US.json');
    const duplicates = Object.keys(settingsPane).filter(
        (key) => key in formatPane
    );
    if (duplicates.length > 0) {
        throw new Error(
            `Shared strings defined twice: ${duplicates.join(', ')}`
        );
    }
    return { ...formatPane, ...settingsPane };
};

/**
 * Writes the shared strings into `outDir` and returns the path for the
 * Power BI webpack plugin's `stringResources` option, relative to the
 * working directory as the plugin expects. The plugin keeps only the last
 * file it is given for a locale, so the strings go to it as one file.
 */
const writeSharedStringResources = (outDir) => {
    const file = path.join(outDir, 'en-US.json');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        file,
        JSON.stringify({ locale: 'en-US', values: readSharedStringResources() })
    );
    return [path.relative(process.cwd(), file)];
};

module.exports = { writeSharedStringResources };
