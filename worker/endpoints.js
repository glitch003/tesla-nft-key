import { getCars, sendCommand } from './tesla.js'
import { decryptTeslaCreds } from './utils.js'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'

// We support the GET, POST, HEAD, and OPTIONS methods from any origin,
// and allow any header on requests. These headers must be present
// on all responses to all CORS preflight requests. In practice, this means
// all responses to OPTIONS requests.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const commandMap = {
  flashLights: 'flash_lights',
  startCar: 'remote_start_drive',
  wake: 'wake_up',
  lockDoor: 'door_lock',
  unlockDoor: 'door_unlock',
}

const checkIfSetupDisabled = async () => {
  const setupDisabled = await CREDS.get('setupDisabled')
  if (setupDisabled === 'true') {
    return new Response(JSON.stringify({ error: 'Already setup' }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  return false
}

export const signUp = async ({ body }) => {
  const { exportedAdminKey, encryptedBlobAsBase64, litData } = body

  const disabledError = await checkIfSetupDisabled()
  if (disabledError) {
    return disabledError
  }

  const teslaCreds = await decryptTeslaCreds({
    exportedAdminKey,
    encryptedBlobAsBase64,
  })
  console.log('decrypted tesla creds', teslaCreds)
  // console.log('decrypted tesla creds')

  const cars = await getCars(teslaCreds)

  const response = JSON.stringify({ cars })
  console.log('getCars result', response)

  await CREDS.put('litData', JSON.stringify(litData))
  await CREDS.put('adminKey', JSON.stringify(exportedAdminKey))

  return new Response(response, {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

export const carSelected = async ({ body }) => {
  const { car } = body

  const disabledError = await checkIfSetupDisabled()
  if (disabledError) {
    return disabledError
  }

  await CREDS.put('car', JSON.stringify(car))
  const response = JSON.stringify({ success: true })
  return new Response(response, {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

export const disableSetup = async ({ body }) => {
  await CREDS.put('setupDisabled', 'true')
  const response = JSON.stringify({ success: true })
  return new Response(response, {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

export const sendCommandToCar = async ({ body }) => {
  console.log(`sendCommandToCar with body ${JSON.stringify(body)}`)
  const { command, encryptedBlobAsBase64 } = body
  const exportedAdminKey = JSON.parse(await CREDS.get('adminKey'))
  const teslaCreds = await decryptTeslaCreds({
    exportedAdminKey,
    encryptedBlobAsBase64,
  })
  console.log('decrypted tesla creds', JSON.stringify(teslaCreds))
  const car = JSON.parse(await CREDS.get('car'))

  const teslaApiCommand = commandMap[command]
  console.log(`teslaApiCommand: ${teslaApiCommand}`)
  if (teslaApiCommand) {
    const response = await sendCommand({
      ...teslaCreds,
      vehicleId: car.id,
      command: teslaApiCommand,
    })
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
  }

  return new Response('Command not found', {
    headers: { ...corsHeaders, 'content-type': 'text/plain' },
  })
}

export const getEncryptedCreds = async () => {
  // console.log('getEncryptedCreds')
  const litData = JSON.parse(await CREDS.get('litData'))
  // console.log('in getEncryptedCreds and litData is', litData)
  const response = {
    litData,
  }
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
