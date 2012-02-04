#!/bin/zsh

cd framework
rm -r mathjax
mkdir mathjax
cd mathjax
wget -O zipball.zip http://github.com/mathjax/MathJax/zipball/master
unzip zipball.zip
rm zipball.zip
rm README.md

dir=`ls`
echo $dir
cp -r $dir/* .
rm -r $dir

rm -r unpacked
rm -r fonts/HTML-CSS/TeX/png
rm -r docs
rm -r test
