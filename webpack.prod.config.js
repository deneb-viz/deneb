const path = require('path');
const webpack = require('webpack');
const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { getCommonConfig } = require('./webpack.common.config');

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
            concatenateModules: true,
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
                defaultSizes: 'gzip'
            })
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
