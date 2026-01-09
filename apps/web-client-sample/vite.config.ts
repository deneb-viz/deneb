import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // Load env from workspace root
    const env = loadEnv(mode, process.cwd() + '/../..', '');

    return {
        plugins: [react()],
        server: {
            port: 3000
        },
        build: {
            outDir: 'dist'
        },
        define: {
            'process.env.LOG_LEVEL': JSON.stringify(env.LOG_LEVEL ?? ''),
            'process.env.ZUSTAND_DEV_TOOLS': JSON.stringify(
                env.ZUSTAND_DEV_TOOLS ?? ''
            ),
            'process.env.PBIVIZ_DEV_MODE': JSON.stringify(
                env.PBIVIZ_DEV_MODE ?? ''
            ),
            'process.env.PBIVIZ_DEV_OVERLAY': JSON.stringify(
                env.PBIVIZ_DEV_OVERLAY ?? ''
            ),
            'process.env.ALLOW_EXTERNAL_URI': JSON.stringify(
                env.ALLOW_EXTERNAL_URI ?? ''
            )
        }
    };
});
