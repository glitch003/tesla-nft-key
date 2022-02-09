export const getApiHost = () => {
  if (process.env.REACT_APP_NODE_ENV === 'production') {
    return window.location.origin
  } else {
    return process.env.REACT_APP_TESLA_NFT_KEY_BACKEND_HOST
  }
}
