export interface IPowerBIExpression {
    name: string;
    method: any;
}

export interface IPowerBISchemes {
    name: string;
    values: string[] | ((t: number) => string);
}
