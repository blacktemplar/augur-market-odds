const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/ts/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Augur Market Odds',
      template: 'src/html/index.html'
    }),
    new webpack.EnvironmentPlugin(['INFURA_PROJECT_ID'])
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json', '.css']
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist')
  },
  node: {
    fs: 'empty',
    net: 'empty'
  },
};
