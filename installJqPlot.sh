#!/bin/zsh

cd framework
rm -r jqplot
mkdir jqplot
cd jqplot
wget -O ball.tar.bz2 https://bitbucket.org/cleonello/jqplot/downloads/jquery.jqplot.1.0.0b2_r1012.tar.bz2
tar xvjf ball.tar.bz2
cp -r dist/* .
rm -r dist
rm ball.tar.bz2
rm -r docs
rm -r examples
rm jquery.js jquery.jqplot.css jquery.jqplot.js optionsTutorial.txt excanvas.js excanvas.min.js
cd plugins
mkdir tmp
cp *.min.js tmp
rm *.js
cp tmp/* .
rm -r tmp
