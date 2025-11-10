const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {
    PowerBICustomVisualsWebpackPlugin
} = require('powerbi-visuals-webpack-plugin');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');

// Import powerbi-visuals-api for schema definitions
const powerbiApi = require('powerbi-visuals-api');

// Load visual configuration
const pbivizPath = './pbiviz.json';
const pbivizFile = require(path.join(__dirname, pbivizPath));

// Load capabilities
const capabilitiesPath = './capabilities.json';
const capabilities = require(path.join(__dirname, capabilitiesPath));

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
        entry: {
            'visual.js': pluginLocation
        },
        target: 'web',
        node: false,
        externals: isProduction ? { 'powerbi-visuals-api': 'null' } : {},
        resolve: {
            extensions: ['.tsx', '.ts', '.jsx', '.js', '.css', '.less'],
            modules: ['node_modules', path.resolve(__dirname, 'node_modules')],
            symlinks: false
        },
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
                                // Keep fast transpilation; const enums will still inline
                                // and type-only imports will be removed at emit.
                                transpileOnly: !isProduction,
                                experimentalWatchApi: !isProduction,
                                configFile: 'tsconfig.json'
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
