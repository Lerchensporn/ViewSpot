WebSlider

# When do we need projector presentations?
There is a lot of controversy in which cases a speech, projector presentations
or the use of flipcharts or blackboards are the best form of presentation.

The main difference between those approaches is whether the information
is given visually or only acoustically and whether the visualizations are
prepared or created during the presentation.

... okay? Insert your text here.

# Advertising
WebSlider combines the power of markup languages and scripting.

Where we want to go (:

* *Excellent support for math typesetting*
  The MathJax plugin converts TeX markup between the tags \[ \] or
  \( \) into MathML.
* *Great looking themes*
  Some well-tried LaTeX Beamer themes are provided. CSS 3 supports
  eye-candy features like shadows, gradients and rounded corners.
* *Scripting support (JavaScript)*
* *Customizable*
  It is very easy to define own themes using CSS or even Javascript.
* *Support for controls*
  This extends the LaTeX approach of different elements like the footer, a title,
  sidebars etc.
* *No WYSIWYG*
  This leads to a separation of content and style, which is very practical:
  One can write the content and style it afterwards. The productivity increases,
  because one only has to concentrate on one thing at the same time.
* *Small Download and no installation required*
  An advantage in comparision to LaTeX (hundred of megabytes) and Impress.
* Extensibility and many useful plugins
  A plugin interface is provided and there are e. g. plugins for math, plotting.

Disadvantages:

* *More user experience required*
  You have to know HTML, CSS and Javascript. Fortunately, the basics of those
  languages are easy to learn and Javascript knowledge is only necessary
  when using advances features.
  Despite the advantages of a non-WYSIWYG approach, some lusers might
  feel irritated when they cannnot point and click around.
* *The portability is worse than with PDF files*

# To Do List
* implement overlays
* better presenter screen
* more themes
* improve mozilla shadow fix
* speedup module loading
* implement Python tools
* invent a better project name
* store the fonts in the presentation and use css font-face (good idea?)

# Python tools
There will be some python tools.
One can download WebSlider and unpack it.
Without python tools, the WebSlider directory has to be copied for each
presentation.

However, it is more pratical to have one complete WebSlider repository installed.
The Python tools can create a working directory and copy only the needed modules
to reduce the directory size. It is possible to let the script download the latest
git version.
For example, the framework could be installed in /usr/share/webslider/... and
have the python tool in /usr/share/wstool.
To create a new presentation:
    1) wstool new <dir>
          Ask if no directory is specified. Create a new directory with
          the core files.
    2) wstool install-module <module>
          Interactive dialog if no module is specified.
          wstool list-modules
    3) create the presentation

More functions:
    wstool update-repo
    wstool update-repo-modules
    wstool update-local
    wstool update-local-modules
    wstool doc
    wstool store-fonts

Question: Is it better to have the modules in this git repository or
          to download them with the python script?
Answer:   For security reasons, it is best to include them into the
          git repo and ask the user before downloading updates.

# Compatibility
WebSlider is developed for Firefox and Chromium (Gecko and Webkit).
