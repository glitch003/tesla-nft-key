import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'

const SYMM_KEY_ALGO_PARAMS = {
  name: 'AES-CBC',
  length: 256,
}

export function parseJwt(token) {
  var base64Url = token.split('.')[1]
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      })
      .join(''),
  )

  return JSON.parse(jsonPayload)
}

export async function decryptWithSymmetricKey(encryptedBlob, symmKey) {
  const recoveredIv = await encryptedBlob.slice(0, 16).arrayBuffer()
  const encryptedArrayBuffer = await encryptedBlob.slice(16).arrayBuffer()
  const decryptedThing = await crypto.subtle.decrypt(
    {
      name: SYMM_KEY_ALGO_PARAMS.name,
      iv: recoveredIv,
    },
    symmKey,
    encryptedArrayBuffer,
  )
  return decryptedThing
}

export async function decryptTeslaCreds({
  exportedAdminKey,
  encryptedBlobAsBase64,
}) {
  const adminKey = await crypto.subtle.importKey(
    'jwk',
    exportedAdminKey,
    SYMM_KEY_ALGO_PARAMS,
    true,
    ['encrypt', 'decrypt'],
  )

  console.log('imported key', adminKey)

  // decrypt
  const encryptedBlob = new Blob([
    uint8arrayFromString(encryptedBlobAsBase64, 'base64'),
  ])
  console.log('converted encryptedBlob')
  const encodedTeslaCreds = await decryptWithSymmetricKey(
    encryptedBlob,
    adminKey,
  )
  const dataView = new DataView(encodedTeslaCreds)
  let decoder = new TextDecoder()
  const teslaCreds = JSON.parse(decoder.decode(dataView))
  return teslaCreds
}
