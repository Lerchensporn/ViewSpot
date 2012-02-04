#!/bin/zsh

cd framework
rm -r shjs
mkdir shjs
cd shjs
wget -O shjs.zip http://sourceforge.net/projects/shjs/files/latest/download
unzip shjs.zip
rm shjs.zip
dir=`ls`
cp -r $dir/* .
rm -r $dir

rm -r doc
rm index.html VERSION.txt sh_main.js sh_style.css favicon.ico README.txt
mkdir /tmp/min-files
cp css/*.min.css /tmp/min-files
rm css/*
mv /tmp/min-files/* css

cp lang/*.min.js /tmp/min-files
rm lang/*
mv /tmp/min-files/* lang

rmdir /tmp/min-files
