#!/bin/zsh

cd framework
rm -r flot
mkdir flot
cd flot
wget -O zipball.zip http://flot.googlecode.com/files/flot-0.7.zip
unzip zipball.zip
rm zipball.zip
cp -r flot/* .
rm -r flot
mkdir tmp
cp *.min.js tmp
rm *.js
cp tmp/* .
rm -r tmp
rm excanvas.min.js
rm -r examples
