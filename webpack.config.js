'use strict'

const webpack = require('webpack')
const nodeExternals = require('webpack-node-externals')

const globalsPlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse(process.env.BUILD_DEV || 'true')),
  'process.env': { NODE_ENV: JSON.stringify('development') }
})

const libraryName = 'shipl'

const clientConfig = {
  mode: 'production',
  entry: { [libraryName]: './src/index.js' },
  output: {
    filename: '[name].js',
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  target: 'web',
  externals: [nodeExternals()],
  module: {
    rules: [
      { test: /\.(t|j)sx?$/, use: { loader: 'babel-loader' } }
    ]
  },
  node: {
    console: false,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  resolve: {
    modules: ['./src'], // 'node_modules'],
    extensions: ['.ts', '.js', '.json']
  },
  plugins: [globalsPlugin]
}

module.exports = [clientConfig]
