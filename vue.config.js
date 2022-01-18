module.exports = {
  publicPath: '/blindfoldchess/',
  pwa: {
    name: 'Blindfold Lichess',
    themeColor: '#42b983',
    msTileColor: '#42b983',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    appleMobileWebAppCache: 'yes',
    manifestOptions: {
      background_color: '#42b983'
    },
    workboxOptions: {
      skipWaiting: true,
      clientsClaim: true,
    },
  }
}