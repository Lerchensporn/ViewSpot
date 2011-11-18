var js = document.createElement('script');
js.type = 'text/javascript';
js.src = 'framework/mathjax/MathJax.js';
js.innerHTML = 'MathJax.Hub.Config({'
    + 'extensions: ["tex2jax.js"],'
    + 'jax: ["input/TeX", "output/HTML-CSS"],'
    + 'tex2jax: {'
    + '  inlineMath: [ ["$","$"] ],'
    + '  processEscapes: true'
    + '},'
    + '"HTML-CSS": { availableFonts: ["STIX"] }});'
    'MathJax.Hub.Startup.onload();';
document.body.appendChild(js);
