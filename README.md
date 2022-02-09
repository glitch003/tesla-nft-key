# Control a Tesla with the blockchain

This package lets you set up any on chain condition to control your Tesla. This could be posession of an NFT, or DAO membership, for example. Powered by [Lit Protocol](https://litprotocol.com)

Check out the [Video Demo](https://www.youtube.com/watch?v=2EZiWT-7Xkk)

## Setup screenshots

![Setup](/assets/setup1.png?raw=true 'Choose access control conditions')
![Setup](/assets/setup2.png?raw=true 'Setup Tesla API and select car')

## Control screenshots

![Control 1](/assets/control1.png?raw=true 'Connect wallet to control')

![Control 2](/assets/control2.png?raw=true 'Controls')

## Setup

### App Deployment

You need a Cloudlare account as this project is designed to run on a Cloudflare worker.

1. Install and set up wrangler: https://developers.cloudflare.com/workers/cli-wrangler/install-update
2. Run `yarn build`
3. Enter the worker folder
4. Copy wrangler.example.toml to wrangler.toml
5. Open wrangler.toml and set the `name` and `account_id`. You can find your `account_id` in the Cloudflare dashboard, in the "Workers" section, on the right.
6. In the worker folder, run `wrangler kv:namespace create CREDS` and copy the output. Put it inside the `kv_namespaces` array in wrangler.toml
7. Run `wrangler publish` and your app should deploy. It will show your app URL.
8. Visit the app url from the above command but append `/setup` to it to visit the setup page. Follow the "Setup in app" instructions below, on this page.

### Setup in app

You must deploy your app using the App Deployment steps above before you can perform the setup in app.

1. You need something on-chain to use for your access control condition. For example, I went to OpenSea and created a new collection on Polygon. Since OpenSea uses lazy minting and the tokens aren't actually minted until a sale happens, you may need to "sell yourself" a token. Use another wallet to buy the token, which will cause it to be minted.
2. Once you have the token or access control condition you want to use, go to the `/setup` page of your app, as in the last step of the App Deployment steps above.
3. You can then test the connection. Try "flash lights" and see if the car's light flash.
4. Click "Disable Setup" which will prevent anyone from running setup again. You can always undo this by running going into your Cloudflare dashboard, clicking workers -> KV and then find the CREDS namespace. Click on "View" and then delete the "setupDisabled" key.
5. You're done! You can now give anyone the base URL of your Cloudflare worker to control your Tesla. Note that they must also have a cryptowallet and must meet the conditions you set to be able to control the car.

## How it works

When you walkthrough the setup steps, this app takes your Tesla Oauth credentials (access token, refresh token) and generates a new symmetric encryption key in the browser, called the "admin key". This key is used to encrypt the Tesla Oauth credentials in the browser, and creates the "admin ciphertext". The "admin ciphertext" is then encrypted with Lit Protocol under the on-chain conditions you specified in the setup to create the "lit protocol ciphertext". The "lit protocol ciphertext" and the "admin key" are then stored in the Cloudflare worker's key value store.

This scheme means that someone at Cloudflare can't take control of your car without meeting the on-chain conditions you specified for the Lit Protocol during setup. Meaning, if they don't hold the NFT you specified, they can't control your car, even though they control the server this app is running on. This is because of the magic of the Lit Protocol.

When someone wants to control your car, they present proof that they meet the on-chain condition by talking to the Lit Protocol. If they meet the condition (aka hold the NFT) the Lit Protocol helps them decrypt the "lit protocol ciphertext" to get the "admin ciphertext". Note, they do not know the "admin key", as that was created during setup and stored in the Cloudflare key value store. This means that they cannot see the plaintext data which would contain your Tesla Oauth keys.

They upload the "admin ciphertext" to the Cloudflare worker, which uses the "admin key" to decrypt it and obtain the Tesla Oauth credentials. This is the only time the Tesla Oauth credentials are fully visible to the Cloudflare worker.

## Todo / Improvements

- Utilize Tesla refresh token
- Support multiple cars
- Check for a Lit Protocol JWT when someone wants to control the car. This would make secure revoking of access to the car possible. Right now, it's possible for a sophisticated attacker to store the "admin ciphertext" and continue to control the car after they no longer posess the NFT or meet the on-chain condition.
