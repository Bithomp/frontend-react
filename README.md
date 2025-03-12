# XRP Ledger and XAHAU Explorer frontend

Bithomp Frontend for XRP Explorer and XAHAU Explorer.\
[https://bithomp.com](https://bithomp.com)\
[https://xahauexplorer.com](https://xahauexplorer.com)

## Available Scripts

In the project directory, you can run:

### `yarn dev`

`NEXT_PUBLIC_NETWORK_NAME=mainnet yarn dev`

mainnet | staging | testnet | devnet | xahau | xahau-testnet | xahau-jshooks

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `yarn build`

Builds the app for production.

### `yarn start`

Runs the app in production

## Run the app localy

`cd <folder for projects>` // create a folder and open terminal/console there.

`npm install -g yarn` // install yarn if you do not have it yet

`git clone --single-branch https://github.com/Bithomp/frontend-react.git` // copy the repository

`cd frontend-react` // open the folder with the repo in the terminal/console

`mv .env .env.local` // rename .env into .env.local

`nano .env.local` // open the file .env.local and remove # for the env you have api key for and before the last line with the key, enter your `NEXT_PUBLIC_BITHOMP_API_TEST_KEY`

`yarn` // install packages

`yarn dev` // run project in dev mode, you will see on the localhost:3000

### Deployment (first time)

`cd <folder for projects>`

`npm install -g yarn`

`git clone --single-branch https://github.com/Bithomp/frontend-react.git`

`cd frontend-react`

`mv .env .env.local`

`nano .env.local` //remove # for the correct env, enter your `NEXT_PUBLIC_BITHOMP_API_KEY` and save the changes

`yarn`

`yarn build`

`pm2 start yarn --name "frontend-react" -- start` // otherwise: `-- start:next` or `PORT=3400 pm2 start /usr/bin/yarn  --name "jshooks.xahau-frontend-react" -- start`

`pm2 logs frontend-react --lines 1000` //verify it runs properly

`pm2 save`

### Update

`cd <folder for projects>/frontend-react`

`git pull`

`yarn` // if packages were updated

`yarn build`

`pm2 restart frontend-react`

### Clean up if run on small VPS

`yarn cache clean`

### Language tanslation credits

Spanish - [@Ekiserrepe](https://github.com/Ekiserrepe)

Indonesian - [@suuf24](https://github.com/suuf24)

Japanese - [@develoQ](https://github.com/develoQ)

German - [@rsteimen](https://github.com/rsteimen)
