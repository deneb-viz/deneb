const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { getCommonConfig } = require('./webpack.common.config');

/**
 * Development webpack configuration
 * Optimized for fast rebuilds and HMR
 */
module.exports = merge(
    getCommonConfig({
        isProduction: false,
        devMode: true,
        generatePbiviz: false,
        generateResources: false
    }),
    {
        mode: 'development',
        // Make webpack watch our linked @deneb-viz packages under node_modules
        snapshot: {
            managedPaths: [/node_modules\/(?!@deneb-viz)/]
        },
        resolve: {
            alias: {
                // Provide a shim so runtime enum property access does not fault; enums are numeric constants.
                'powerbi-visuals-api': path.resolve(
                    __dirname,
                    'webpack.powerbi-api.dev-shim.js'
                )
            }
        },
        devtool: 'cheap-module-source-map', // Fast source maps without eval (fixes powerbi-visuals-api external)

        cache: {
            type: 'filesystem',
            cacheDirectory: path.join(__dirname, '.tmp', 'webpack-cache'),
            buildDependencies: {
                config: [__filename]
            }
        },

        optimization: {
            minimize: false,
            removeAvailableModules: false,
            removeEmptyChunks: false,
            splitChunks: false
        },

        performance: {
            hints: false // Disable performance hints in dev
        },

        devServer: {
            static: {
                directory: path.join(__dirname, '.tmp', 'drop'),
                publicPath: '/assets/'
            },
            compress: true,
            port: 8080,
            allowedHosts: 'all',
            hot: false, // HMR is disabled for Power BI visuals (they don't support it properly)
            liveReload: true, // Use live reload instead
            server: {
                type: 'https',
                options: {
                    // Uncomment and configure if you have certificates
                    // pfx: fs.readFileSync(path.join(__dirname, 'node_modules/powerbi-visuals-tools/certs/PowerBICustomVisualTest_public.pfx')),
                    // passphrase: '<YOUR_PASSPHRASE>',
                }
            },
            headers: {
                'access-control-allow-origin': '*',
                'cache-control': 'public, max-age=0'
            },
            // Disable WDS client websocket injection inside Power BI iframe to prevent sandbox handshake attempts
            client: false,
            watchFiles: {
                paths: [
                    'src/**/*',
                    'style/**/*',
                    'config/**/*',
                    'packages/**/dist/**/*',
                    'node_modules/@deneb-viz/**/dist/**/*'
                ],
                options: {
                    usePolling: false,
                    interval: 100
                }
            }
        },

        watchOptions: {
            // Single regex: ignore most node_modules except our workspace scope; and ignore .tmp and coverage
            ignored:
                /(node_modules[\\\/](?!@deneb-viz[\\\/]))|([\\\/]\.tmp[\\\/])|([\\\/]coverage[\\\/])/,
            aggregateTimeout: 200
        },

        stats: {
            all: false,
            errors: true,
            warnings: true,
            assets: false,
            modules: false,
            timings: true,
            colors: true
        },

        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('development')
            })
        ]
    }
);
