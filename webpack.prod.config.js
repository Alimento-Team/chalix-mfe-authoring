const path = require('path');
const { createConfig } = require('@openedx/frontend-build');

const config = createConfig('webpack-prod', {
  resolve: {
    alias: {
      // Within this app, we can use '@src/foo instead of relative URLs like '../../../foo'
      '@src': path.resolve(__dirname, 'src/'),
      // Plugins can use 'CourseAuthoring' as an import alias for this app:
      CourseAuthoring: path.resolve(__dirname, 'src/'),
      // Ignore xmlbuilder problematic modules - mammoth doesn't actually need them
      'xmlbuilder/lib/XMLDocument': false,
      'xmlbuilder/lib/XMLDocumentCB': false,
      'xmlbuilder/lib/XMLStringWriter': false,
      'xmlbuilder/lib/XMLStreamWriter': false,
    },
    fallback: {
      fs: false,
      constants: false,
      stream: false,
      timers: false,
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

// Add proper includePaths for SCSS to resolve bootstrap vendor imports
const sassRule = config.module.rules.find(
  rule => rule.test && rule.test.toString().includes('scss')
);
if (sassRule && sassRule.use) {
  const sassLoaderIndex = sassRule.use.findIndex(
    loader => loader.loader && loader.loader.includes('sass-loader')
  );
  if (sassLoaderIndex !== -1 && sassRule.use[sassLoaderIndex].options) {
    sassRule.use[sassLoaderIndex].options.sassOptions = {
      ...(sassRule.use[sassLoaderIndex].options.sassOptions || {}),
      includePaths: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, 'node_modules/bootstrap/scss'),
      ],
    };
  }
}

// Disable image optimization for production builds to avoid sharp module issues
// Find and disable image-minimizer-webpack-plugin
config.optimization = config.optimization || {};
config.optimization.minimizer = (config.optimization.minimizer || []).filter(
  plugin => {
    // Remove image-minimizer-webpack-plugin
    return !plugin.constructor.name.includes('ImageMinimizerPlugin');
  }
);

// Ignore missing optional dependencies warnings for xmlbuilder and source maps
config.ignoreWarnings = [
  /Can't resolve 'xmlbuilder/,
  /Can't resolve '\.\/XMLDocument'/,
  /Can't resolve '\.\/XMLDocumentCB'/,
  /Can't resolve '\.\/XMLStringWriter'/,
  /Can't resolve '\.\/XMLStreamWriter'/,
  /Failed to parse source map/,
];

module.exports = config;
