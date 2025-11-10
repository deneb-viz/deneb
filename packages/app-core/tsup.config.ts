import { defineConfig, type Options } from 'tsup';
import fs from 'fs';

export default defineConfig((options: Options) => ({
    entryPoints: ['src/index.ts'],
    dts: true,
    format: ['esm'],
    define: {
        global: 'globalThis'
    },
    sourcemap: true,
    splitting: false,
    outDir: 'dist',
    loader: { '.png': 'dataurl' },
    esbuildPlugins: [
        {
            // Ensure that workers are loaded as raw files.
            name: 'raw',
            setup(build) {
                build.onLoad(
                    { filter: /[\\/]worker[\\/].*\.worker\.js$/ },
                    (args) => {
                        return {
                            contents: fs.readFileSync(args.path, 'utf8'),
                            loader: 'text'
                        };
                    }
                );
            }
        }
    ],
    ...options
}));
