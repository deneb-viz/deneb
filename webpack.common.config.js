const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {
    PowerBICustomVisualsWebpackPlugin
} = require('powerbi-visuals-webpack-plugin');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
// Load environment variables for build-time injection. If DOTENVX_ENV is set
// (e.g., via npm scripts), prefer that file; otherwise fall back to .env.
try {
    const { config: dotenvx } = require('@dotenvx/dotenvx');
    const envPath = process.env.DOTENVX_ENV
        ? path.resolve(__dirname, process.env.DOTENVX_ENV)
        : path.join(__dirname, '.env');
    dotenvx({
        path: envPath,
        override: true,
        quiet: true
    });
} catch (e) {
    // dotenvx is optional; proceed if not installed
}

// Import powerbi-visuals-api for schema definitions
const powerbiApi = require('powerbi-visuals-api');

// Load visual configuration
const pbivizPath = './pbiviz.json';
// Use literal requires to satisfy eslint rule powerbi-visuals/non-literal-require
const pbivizFile = require('./pbiviz.json');

// Load capabilities
const capabilitiesPath = './capabilities.json';
// Use literal requires to satisfy eslint rule powerbi-visuals/non-literal-require
const capabilities = require('./capabilities.json');

// Plugin and visual source locations
const pluginLocation = './.tmp/precompile/visualPlugin.ts';
const visualSourceLocation = '../../src/Deneb';

/**
 * Common webpack configuration shared between dev and prod
 */
function getCommonConfig(options = {}) {
    const {
        isProduction = false,
        devMode = true,
        generatePbiviz = false,
        generateResources = false
    } = options;
    // Determine certificationFix behavior: default to certified (true) unless explicitly building standalone
    const mode = process.env.DENEB_PACKAGE_MODE;
    const certificationFix = mode === 'standalone' ? false : true;
    console.log(
        `[webpack] certificationFix=${certificationFix} (mode=${mode ?? 'unset'})`
    );
    return {
        context: __dirname,
        entry: {
            'visual.js': pluginLocation
        },
        target: 'web',
        node: false,
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.css', '.less'],
            modules: [
                'node_modules',
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname, 'src')
            ],
            symlinks: false
        },
        // No externals for powerbi-visuals-api. TypeScript (via ts-loader) inlines const enums,
        // and we avoid runtime reads from the package. Keeping it non-external prevents confusing nulls.
        externals: {},
        module: {
            rules: [
                {
                    parser: {
                        amd: false
                    }
                },
                {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false
                    }
                },
                {
                    test: /\.tsx?$/,
                    // Exclude all node_modules except @deneb-viz workspace packages
                    exclude: /node_modules\/(?!@deneb-viz)/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                transpileOnly: false,
                                experimentalWatchApi: !isProduction,
                                configFile: 'tsconfig.webpack.json',
                                context: __dirname
                            }
                        }
                    ]
                },
                {
                    test: /\.json$/,
                    loader: 'json-loader',
                    type: 'javascript/auto'
                },
                {
                    test: /(\.less)|(\.css)$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader
                        },
                        {
                            loader: 'css-loader'
                        },
                        {
                            loader: 'less-loader',
                            options: {
                                lessOptions: {
                                    paths: [
                                        path.resolve(__dirname, 'node_modules')
                                    ]
                                }
                            }
                        }
                    ]
                },
                {
                    test: /\.(woff|ttf|ico|woff2|jpg|jpeg|png|webp|gif|svg|eot)$/i,
                    type: 'asset/inline'
                }
            ]
        },
        output: {
            path: path.join(__dirname, '.tmp', 'drop'),
            publicPath: 'assets',
            filename: '[name]',
            // In dev, Power BI host expects the library name to have _DEBUG suffix
            // See: https://github.com/microsoft/powerbi-visuals-webpack-plugin/issues/59
            library: devMode
                ? `${pbivizFile.visual.guid}_DEBUG`
                : pbivizFile.visual.guid,
            libraryTarget: 'var'
        },
        plugins: [
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser'
            }),
            // Inline selected environment variables for use in the browser bundle
            new webpack.DefinePlugin({
                'process.env.LOG_LEVEL': JSON.stringify(
                    process.env.LOG_LEVEL ?? ''
                ),
                'process.env.ZUSTAND_DEV_TOOLS': JSON.stringify(
                    process.env.ZUSTAND_DEV_TOOLS ?? ''
                ),
                'process.env.PBIVIZ_DEV_MODE': JSON.stringify(
                    process.env.PBIVIZ_DEV_MODE ?? ''
                ),
                'process.env.PBIVIZ_DEV_OVERLAY': JSON.stringify(
                    process.env.PBIVIZ_DEV_OVERLAY ?? ''
                ),
                'process.env.ALLOW_EXTERNAL_URI': JSON.stringify(
                    process.env.ALLOW_EXTERNAL_URI ?? ''
                )
            }),
            new MiniCssExtractPlugin({
                filename: 'visual.css',
                chunkFilename: '[id].css'
            }),
            new PowerBICustomVisualsWebpackPlugin({
                ...pbivizFile,
                capabilities,
                visualSourceLocation,
                pluginLocation,
                apiVersion: powerbiApi.version,
                capabilitiesSchema: powerbiApi.schemas.capabilities,
                dependenciesSchema: powerbiApi.schemas.dependencies,
                devMode,
                generatePbiviz,
                generateResources,
                certificationFix,
                modules: true,
                packageOutPath: path.join(__dirname, 'dist')
            }),
            new ExtraWatchWebpackPlugin({
                files: [pbivizPath, capabilitiesPath]
            }),
            new webpack.WatchIgnorePlugin({
                paths: [path.join(__dirname, pluginLocation), './.tmp/**/*.*']
            })
        ]
    };
}

module.exports = { getCommonConfig, pluginLocation, pbivizFile };
