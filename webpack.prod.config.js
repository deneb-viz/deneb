const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { getCommonConfig } = require('./webpack.common.config');

// Set ANALYZE_MODULES=true to disable scope hoisting for detailed module analysis
const analyzeModules = process.env.ANALYZE_MODULES === 'true';

/**
 * Production webpack configuration
 * Optimized for bundle size and performance
 */
module.exports = merge(
    getCommonConfig({
        isProduction: true,
        devMode: false,
        generatePbiviz: true,
        generateResources: true
    }),
    {
        mode: 'production',
        devtool: 'source-map', // Full source maps for debugging production issues

        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        compress: {
                            drop_console: false, // Keep console logs for Power BI telemetry
                            drop_debugger: true,
                            pure_funcs: ['console.debug', 'console.trace']
                        },
                        mangle: {
                            safari10: true
                        },
                        format: {
                            comments: false
                        }
                    },
                    extractComments: false
                })
            ],
            concatenateModules: !analyzeModules, // Disable for module analysis
            usedExports: true,
            sideEffects: true
        },

        performance: {
            maxEntrypointSize: 1024000, // 1MB - Power BI limit
            maxAssetSize: 1024000,
            hints: 'warning'
        },

        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('production')
            }),
            new BundleAnalyzerPlugin({
                reportFilename: path.join(__dirname, 'webpack.statistics.html'),
                openAnalyzer: false,
                analyzerMode: 'static',
                defaultSizes: 'gzip',
                // Show all modules within concatenated chunks
                excludeAssets: null
            }),
            // Generate detailed stats JSON for external analysis
            {
                apply(compiler) {
                    compiler.hooks.done.tapAsync(
                        'StatsPlugin',
                        (stats, callback) => {
                            const statsJson = stats.toJson({
                                all: true,
                                modules: true,
                                reasons: true,
                                modulesSort: 'size',
                                // Don't concatenate in stats output
                                optimizationBailout: true
                            });
                            const fs = require('fs');
                            fs.writeFileSync(
                                path.join(__dirname, 'webpack.stats.json'),
                                JSON.stringify(statsJson, null, 2)
                            );
                            callback();
                        }
                    );
                }
            }
        ],

        stats: {
            all: false,
            errors: true,
            warnings: true,
            assets: true,
            modules: false,
            timings: true,
            colors: true,
            performance: true
        }
    }
);
