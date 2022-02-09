import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import {
  corsHeaders,
  signUp,
  sendCommandToCar,
  carSelected,
  getEncryptedCreds,
  disableSetup,
} from './endpoints.js'

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
const DEBUG = false

addEventListener('fetch', event => {
  try {
    if (event.request.method === 'OPTIONS') {
      // Handle CORS preflight requests
      event.respondWith(handleOptions(event.request))
    } else {
      event.respondWith(handleRequest(event))
    }
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(event) {
  const { request } = event
  const url = new URL(request.url)
  console.log('handleRequest for url', url)
  const path = url.pathname
  let body
  try {
    body = await request.json()
    console.log('handleRequest with body', JSON.stringify(body))
  } catch (e) {
    console.log(
      'error parsing json body in handleRequest.  this usually means there is no body.  swallowing',
    )
  }

  let options = {}

  if (DEBUG) {
    // customize caching
    options.cacheControl = {
      bypassCache: true,
    }
  }

  if ((path.match(/\/signUp$/) || [])[0] === path) {
    return await signUp({ body })
  } else if ((path.match(/\/carSelected$/) || [])[0] === path) {
    return await carSelected({ body })
  } else if ((path.match(/\/disableSetup$/) || [])[0] === path) {
    return await disableSetup({ body })
  } else if ((path.match(/\/commands$/) || [])[0] === path) {
    return await sendCommandToCar({ body })
  } else if ((path.match(/\/getEncryptedCreds$/) || [])[0] === path) {
    return await getEncryptedCreds()
  }

  try {
    const page = await getAssetFromKV(event, options)

    // allow headers to be altered
    const response = new Response(page.body, page)
    return response
  } catch (e) {
    console.log('couldnt get asset from store.  returning index.html')
    return getAssetFromKV(event, {
      mapRequestToAsset: req =>
        new Request(`${new URL(req.url).origin}/index.html`, req),
    })
  }
}

function handleOptions(request) {
  // console.log('handling options request', request)

  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.
    let respHeaders = {
      ...corsHeaders,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      'Access-Control-Allow-Headers': request.headers.get(
        'Access-Control-Request-Headers',
      ),
    }

    return new Response(null, {
      headers: respHeaders,
    })
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    })
  }
}
