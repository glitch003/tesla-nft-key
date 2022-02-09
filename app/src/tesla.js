import axios from 'axios'
import { getApiHost } from './utils.js'

export const wakeUp = async ({ encryptedBlobAsBase64 }) => {
  let tries = 0
  const maxTries = 15
  let awake = false
  while (!awake && tries < maxTries) {
    console.log(`waking up car... tries: ${tries}`)
    try {
      const response = await axios.post(getApiHost() + '/commands', {
        command: 'wake',
        encryptedBlobAsBase64,
      })
      awake = response.data.response.state === 'online'
      console.log('response.data', JSON.stringify(response.data))
    } catch (e) {
      console.log('error waking up car. this is expected.', e)
    }

    if (!awake) {
      // sleep and try again
      await new Promise((resolve) => setTimeout(resolve, 6000))
    }
    tries++
  }
  return awake
}

export const sendCommandToCar = async ({ command, encryptedBlobAsBase64 }) => {
  const awake = await wakeUp({ encryptedBlobAsBase64 })
  console.log('car awake state after waking up is', awake)

  const response = await axios.post(getApiHost() + '/commands', {
    command,
    encryptedBlobAsBase64,
  })

  return response
}
