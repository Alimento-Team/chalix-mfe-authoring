const path = require('path');
const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('webpack-dev', {
  resolve: {
    alias: {
      // Within this app, we can use '@src/foo instead of relative URLs like '../../../foo'
      '@src': path.resolve(__dirname, 'src/'),
      // Plugins can use 'CourseAuthoring' as an import alias for this app:
      CourseAuthoring: path.resolve(__dirname, 'src/'),
    },
    fallback: {
      fs: false,
      constants: false,
    },
  },
});

// Add rule to transpile TypeScript files from @chalix/frontend-component-header
config.module.rules.push({
  test: /\.(js|jsx|ts|tsx)$/,
  include: /node_modules\/@chalix\/frontend-component-header/,
  use: {
    loader: 'babel-loader',
    options: {
      presets: [
        '@babel/preset-react',
        '@babel/preset-typescript',
      ],
    },
  },
});

// Handle ES module resolution for @chalix/frontend-component-header
config.module.rules.push({
  test: /\.m?js$/,
  resolve: {
    fullySpecified: false,
  },
});

module.exports = config;
