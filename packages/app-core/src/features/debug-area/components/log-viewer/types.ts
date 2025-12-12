/**
 * Represents an enum member from capabilities.json
 */
export type LogLevelEnumMember = {
    value: string;
    displayName: string;
    displayNameKey?: string;
};

export type LogEntry = {
    level: number;
    message: string;
};

export type LogEntryDisplay = LogEntry & {
    i18nLevel: string;
};

export type LogLevel = {
    level: number;
    i18n: string;
};
