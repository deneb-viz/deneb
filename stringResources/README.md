# String Resources

`en-US/resources.resjson` is the authoritative source of truth for all localized strings in this visual. Every other locale directory in this folder contains an intentional placeholder `{}` file, pending translation.

Power BI falls back to `en-US` at runtime for any string that is missing (or absent entirely) from a locale's `resources.resjson`, so the empty placeholders do not cause missing or broken UI text — they simply mean that locale currently renders in English.

Do not delete the placeholder directories or files: `pbiviz` packaging expects the full locale directory set to be present, even where the resource file itself is empty.
