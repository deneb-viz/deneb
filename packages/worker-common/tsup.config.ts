import { defineConfig } from 'tsup';
import fs from 'fs';

export default defineConfig({
    entry: ['src/index.ts'],
    dts: true,
    format: ['cjs'],
    esbuildPlugins: [
        {
            name: 'raw',
            setup(build) {
                build.onLoad({ filter: /\.js$/ }, (args) => {
                    return {
                        contents: fs.readFileSync(args.path, 'utf8'),
                        loader: 'text'
                    };
                });
            }
        }
    ],
    onSuccess: 'npx tsc --emitDeclarationOnly --declaration'
});
