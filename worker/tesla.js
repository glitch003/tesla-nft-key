import 'regenerator-runtime/runtime'
import axios from 'axios'
import fetchAdapter from '@vespaiach/axios-fetch-adapter'
axios.defaults.adapter = fetchAdapter

const refreshOauthToken = async ({ refreshToken }) => {
  const url = 'https://auth.tesla.com/oauth2/v3/token'
  const params = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: 'ownerapi',
    scope: 'openid email offline_access',
  }

  try {
    const resp = await axios.post(url, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const { access_token, refresh_token } = resp.data
    // now, encrypt with admin key, then encrypt with Lit, then store in litData
  } catch (e) {
    console.log(`When refreshing token, error hitting url ${url}`)
    if (e && e.response) {
      console.log(`statusCode: ${e.response.status}`)
      console.log(`response body: ${JSON.stringify(e.response.data)}`)
    }
    throw e
  }
}

const makeApiCall = async ({
  accessToken,
  refreshToken,
  url,
  method,
  body,
}) => {
  try {
    if (method === 'GET') {
      const resp = await axios.get(url, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
      })
      return resp
    } else if (method === 'POST') {
      const resp = await axios.post(url, body, {
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
      })
      return resp
    }
  } catch (e) {
    console.log(`Error hitting url ${url}`)
    if (e && e.response) {
      console.log(`statusCode: ${e.response.status}`)
      console.log(`response body: ${JSON.stringify(e.response.data)}`)
      // if (e.response.status === 401) {
      //   // must refresh token and retry
      //   await refreshOauthToken({ refreshToken })
      // }
    }
    throw e
  }
}

export const getCars = async ({ accessToken, refreshToken }) => {
  const url = 'https://owner-api.teslamotors.com/api/1/vehicles'
  const resp = await makeApiCall({
    accessToken,
    refreshToken,
    url,
    method: 'GET',
    body: null,
  })
  return resp.data.response
}

export const sendCommand = async ({
  accessToken,
  refreshToken,
  vehicleId,
  command,
}) => {
  let url
  if (command === 'wake_up') {
    url = `https://owner-api.teslamotors.com/api/1/vehicles/${vehicleId}/${command}`
  } else {
    url = `https://owner-api.teslamotors.com/api/1/vehicles/${vehicleId}/command/${command}`
  }
  const resp = await makeApiCall({
    accessToken,
    refreshToken,
    url,
    method: 'POST',
    body: null,
  })
  return resp.data
}
