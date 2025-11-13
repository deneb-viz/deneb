import { type Command } from '../lib/commands';

export type CommandsSliceProperties = {
    [command in Command]: boolean;
};

export type CommandsSlice = {
    commands: CommandsSliceProperties;
};
