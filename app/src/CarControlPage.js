import React, { useState, useEffect } from 'react'
import './App.css'
import { sendCommandToCar } from './tesla.js'
import LitJsSdk from 'lit-js-sdk'
import axios from 'axios'
import Button from '@mui/material/Button'
import { getApiHost } from './utils.js'
import CircularProgress from '@mui/material/CircularProgress'

export default function CarControlPage(props) {
  const [litData, setLitData] = useState(null)
  const [encryptedKeysAsBase64, setEncryptedKeysAsBase64] = useState('')
  const [
    humanizedAccessControlConditions,
    setHumanizedAccessControlConditions,
  ] = useState(null)
  const [ready, setReady] = useState(false)
  const [loadingRequest, setLoadingRequest] = useState(false)

  useEffect(() => {
    const go = async () => {
      const response = await axios.get(getApiHost() + '/getEncryptedCreds')
      console.log('response', response.data)
      const { litData } = response.data
      setLitData(litData)

      const { accessControlConditions } = litData
      const humanized = await LitJsSdk.humanizeAccessControlConditions({
        accessControlConditions,
      })
      setHumanizedAccessControlConditions(humanized)
    }
    go()
  }, [])

  const handleConnectWallet = async () => {
    const { accessControlConditions, encryptedString, encryptedSymmetricKey } =
      litData
    const chain = accessControlConditions[0].chain
    const authSig = await LitJsSdk.checkAndSignAuthMessage({ chain })

    const symmetricKey = await window.litNodeClient.getEncryptionKey({
      accessControlConditions,
      // Note, below we convert the encryptedSymmetricKey from a UInt8Array to a hex string.  This is because we obtained the encryptedSymmetricKey from "saveEncryptionKey" which returns a UInt8Array.  But the getEncryptionKey method expects a hex string.
      toDecrypt: encryptedSymmetricKey,
      chain,
      authSig,
    })
    console.log('got symmetricKey', symmetricKey)

    const encryptedStringBlob = new Blob([
      LitJsSdk.uint8arrayFromString(encryptedString, 'base16'),
    ])

    const decryptedString = await LitJsSdk.decryptString(
      encryptedStringBlob,
      symmetricKey,
    )
    setEncryptedKeysAsBase64(decryptedString)
    setReady(true)
  }

  const handleSendCommand = async (command) => {
    setLoadingRequest(true)
    await sendCommandToCar({
      command,
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
    setLoadingRequest(false)
  }
  const handleStartCar = async () => {}

  const handleFlashLights = async () => {
    await sendCommandToCar({
      command: 'flashLights',
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
  }

  const handleUnlockCar = async () => {
    await sendCommandToCar({
      command: 'unlockDoor',
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
  }

  const handleLockCar = async () => {
    await sendCommandToCar({
      command: 'lockDoor',
      encryptedBlobAsBase64: encryptedKeysAsBase64,
    })
  }

  return (
    <div className="App">
      <h1>Control a Tesla with an NFT</h1>
      <br />
      <p>
        You must meet these conditions to control this Tesla:
        <br />
        {humanizedAccessControlConditions}
      </p>
      <br />
      {ready ? (
        loadingRequest ? (
          <CircularProgress />
        ) : (
          <div>
            <Button
              color="primary"
              variant="contained"
              onClick={() => handleSendCommand('startCar')}
            >
              Start Car
            </Button>
            <div style={{ height: 24 }} />
            <Button
              variant="outlined"
              onClick={() => handleSendCommand('flashLights')}
            >
              Flash Lights
            </Button>
            <div style={{ height: 24 }} />
            <Button
              variant="outlined"
              onClick={() => handleSendCommand('lockDoor')}
            >
              Lock
            </Button>
            <div style={{ height: 24 }} />
            <Button
              variant="outlined"
              onClick={() => handleSendCommand('unlockDoor')}
            >
              Unlock
            </Button>
          </div>
        )
      ) : (
        <div>
          <Button variant="contained" onClick={handleConnectWallet}>
            Connect Wallet
          </Button>
        </div>
      )}
    </div>
  )
}
