#!/bin/sh

npm install react-bootstrap bootstrap @openzeppelin/contracts@3.1.0 @chainlink/contracts
#npm install --save gh-pages
#npm install @chainlink/contracts --save
truffle migrate --network kovan --reset
if [ $? -ne 0 ]; then
   exit(1)
fi
truffle test --network kovan
if [ $? -ne 0 ]; then
   exit(2)
fi
npm install
npm run start
