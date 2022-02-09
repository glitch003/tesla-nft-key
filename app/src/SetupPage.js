import React, { useState } from 'react'
import './App.css'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import LitJsSdk from 'lit-js-sdk'
import { ShareModal } from 'lit-access-control-conditions-modal'
import axios from 'axios'
import { sendCommandToCar } from './tesla.js'
import { getApiHost } from './utils.js'

const SYMM_KEY_ALGO_PARAMS = {
  name: 'AES-CBC',
  length: 256,
}

export default function SetupPage(props) {
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [showingShareModal, setShowingShareModal] = useState(false)
  const [accessControlConditions, setAccessControlConditions] = useState(null)
  const [cars, setCars] = useState(null)
  const [chosenCar, setChosenCar] = useState('')
  const [encryptedKeysAsBase64, setEncryptedKeysAsBase64] = useState('')

  const handleSetACC = async () => {
    setShowingShareModal(true)
  }

  const handleAccessControlConditionsSelected = async (acc) => {
    console.log('handleAccessControlConditionsSelected', JSON.stringify(acc))
    setShowingShareModal(false)
    setAccessControlConditions(acc)
  }

  const handleSaveTeslaCredentials = async () => {
    console.log('Saving Tesla credentials...')
    if (!accessControlConditions) {
      alert(
        'You must set your access control conditions first by clicking Choose on-chain conditions',
      )
      return
    }
    const chain = accessControlConditions[0].chain
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain,
    })
    const creds = JSON.stringify({ accessToken, refreshToken })
    // generate a new key, encrypt the creds with it, and then encrypt those encrypted creds with lit
    const adminKey = await crypto.subtle.generateKey(
      SYMM_KEY_ALGO_PARAMS,
      true,
      ['encrypt', 'decrypt'],
    )
    const iv = crypto.getRandomValues(new Uint8Array(16))

    const encryptedCreds = await crypto.subtle.encrypt(
      {
        name: SYMM_KEY_ALGO_PARAMS.name,
        iv,
      },
      adminKey,
      new TextEncoder().encode(creds),
    )
    const encryptedBlob = new Blob([iv, new Uint8Array(encryptedCreds)], {
      type: 'application/octet-stream',
    })
    console.log('encryptedBlob', encryptedBlob)
    const encryptedBlobAsBase64 = LitJsSdk.uint8arrayToString(
      new Uint8Array(await encryptedBlob.arrayBuffer()),
      'base64',
    )
    setEncryptedKeysAsBase64(encryptedBlobAsBase64)

    // now, encrypt with Lit
    const { encryptedString, symmetricKey } = await LitJsSdk.encryptString(
      encryptedBlobAsBase64,
    )

    // at this point, the creds are double encrypted.  first, with the adminKey, and then secondly with Lit.

    // let's save the encrypted creds to lit so that only the users who meet the conditions can access them
    const encryptedSymmetricKey = await window.litNodeClient.saveEncryptionKey({
      accessControlConditions,
      symmetricKey,
      authSig,
      chain,
    })

    console.log('saved to lit!  encryptedSymmetricKey', encryptedSymmetricKey)

    // yay now we have to save everything to the CF worker

    const exportedAdminKey = await crypto.subtle.exportKey('jwk', adminKey)
    console.log('exportedAdminKey', exportedAdminKey)
    const requestBody = {
      exportedAdminKey,
      encryptedBlobAsBase64,
      litData: {
        encryptedString: LitJsSdk.uint8arrayToString(
          new Uint8Array(await encryptedString.arrayBuffer()),
          'base16',
        ),
        accessControlConditions,
        encryptedSymmetricKey: LitJsSdk.uint8arrayToString(
          encryptedSymmetricKey,
          'base16',
        ),
        chain,
      },
    }

    const response = await axios.post(getApiHost() + '/signUp', requestBody)
    console.log('response', response.data)
    setCars(response.data.cars)
  }

  const handleChooseCar = async (car) => {
    const response = await axios.post(getApiHost() + '/carSelected', { car })
    setChosenCar(car)
  }

  const handleDisableSetup = async () => {
    const response = await axios.post(getApiHost() + '/disableSetup', {})
  }

  const handleStartCar = async () => {
    await sendCommandToCar({
      command: 'startCar',
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
  }

  const handleFlashLights = async () => {
    await sendCommandToCar({
      command: 'flashLights',
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
  }

  return (
    <div className="App">
      <h1>Step 1: Define who should be able to start your Tesla</h1>
      <p>
        Choose the on-chain conditions of who is allowed to unlock and start
        your Tesla. You may wish to go to OpenSea and create a new NFT
        collection for this purpose. I did that and used Polygon because it's
        cheap.
      </p>
      <Button variant="contained" color="primary" onClick={handleSetACC}>
        Choose on-chain conditions
      </Button>
      <br />
      <h1>Step 2: Connect your Tesla account</h1>
      <p>
        This will encrypt your Tesla credentials and save them to CloudFlare.
      </p>
      <p>
        Go to{' '}
        <a href="https://tesla-info.com/tesla-token.php" target="_blank">
          https://tesla-info.com/tesla-token.php
        </a>{' '}
        and follow the steps to get your Access and Refresh tokens.
      </p>
      <div style={{ height: 24 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignContent: 'space-between',
          alignItems: 'flex-start',
          maxWidth: 400,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <TextField
          variant="outlined"
          label="Access Token"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
        />
        <br />
        <TextField
          variant="outlined"
          label="Refresh Token"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
        />
        <br />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveTeslaCredentials}
        >
          Submit
        </Button>
      </div>
      <br />
      <h1>Step 3: Choose your car</h1>
      {cars
        ? cars.map((c) => (
            <div key={c.id}>
              <Button variant="contained" onClick={() => handleChooseCar(c)}>
                Choose {c.display_name}
              </Button>
            </div>
          ))
        : null}
      <br />
      <h1>Step 4: Test the connection to your Tesla</h1>
      {chosenCar ? (
        <div>
          <Button variant="contained" onClick={handleFlashLights}>
            Flash Lights
          </Button>
          <div style={{ height: 24 }} />
          <Button variant="contained" onClick={handleStartCar}>
            Start Car
          </Button>
        </div>
      ) : null}

      <br />
      <h1>Step 5: Disable setup</h1>
      <p>
        You can always undo this by running going into your Cloudflare
        dashboard, clicking workers then KV and then find the CREDS namespace.
        Click on "View" and then delete the "setupDisabled" key.
      </p>
      {chosenCar ? (
        <div>
          <Button variant="contained" onClick={handleDisableSetup}>
            Disable Setup
          </Button>
        </div>
      ) : null}

      {showingShareModal ? (
        <ShareModal
          onClose={() => setShowingShareModal(false)}
          onAccessControlConditionsSelected={
            handleAccessControlConditionsSelected
          }
          getSharingLink={() => {}}
          showStep="ableToAccess"
        />
      ) : null}
    </div>
  )
}
