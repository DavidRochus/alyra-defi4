#!/bin/sh

# Initialize Env
#heroku login
#git init

# Link project to remote repositories
#heroku git:remote -a alyra-defi4
git remote add origin https://github.com/DavidRochus/alyra-defi4.git

# Create new contract and rebuild project
#truffle migrate --network kovan --reset
#truffle test --network kovan
#npm install

# Deploy on Heroku
#sed "s/\"homepage\": \"https:\/\/DavidRochus.github.io\/alyra-defi4\/\",/\"homepage\": \"\",/" package.json >package2.json;mv package2.json package.json
#cd ..
#git add .
#git commit -am "Deploy heroku"
#git subtree push --prefix client/ heroku master
#cd -

# Deploy on gh-pages
sed "s/\"homepage\": \"\",/\"homepage\": \"https:\/\/DavidRochus.github.io\/alyra-defi4\/\",/" package.json >package2.json;mv package2.json package.json
git add .
git commit -am "Deploy gh-pages"
npm run deploy



