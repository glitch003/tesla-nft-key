const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = function override(config, env) {
  config.plugins.push(
    new NodePolyfillPlugin({
      excludeAliases: ['console'],
    }),
  )
  config.experiments = { topLevelAwait: true }
  return config
}
