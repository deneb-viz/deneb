import { createGenerator } from 'ts-json-schema-generator';
import { dirname } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const config = {
    path: 'src/types.ts',
    tsconfig: 'tsconfig.schema.json',
    type: 'UsermetaTemplate'
};

const schema = createGenerator(config).createSchema(config.type);
const schemaString = JSON.stringify(schema, null, 2);
const outputPath = 'dist/schema.deneb-template-usermeta.json';
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, schemaString);
