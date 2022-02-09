module.exports = {
  target: 'webworker',
  entry: './index.js',
  node: {
    net: false,
    tls: false,
    fs: false,
  },
}
