#!/bin/sh

npm install react-bootstrap bootstrap @openzeppelin/contracts@3.1.0 @chainlink/contracts
npm install --save gh-pages
truffle migrate --network kovan --reset
retCode=$?
if [ $retCode -ne 0 ]; then
   echo "Error - truffle migrate: " $retCode
   exit $retCode
fi
truffle test --network kovan
retCode=$?
if [ $retCode -ne 0 ]; then
   echo "Error - truffle test: " $retCode
   exit $retCode
fi
npm install
npm run start
