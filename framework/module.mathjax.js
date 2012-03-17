(function() {

    var script = document.createElement('script');
    script.type = 'text/x-mathjax-config';
    script.innerHTML = 'MathJax.Hub.Config({' +
        'jax : ["input/TeX", "output/HTML-CSS"],' +
        'extensions : ["tex2jax.js"],' +
        'NativeMML : { showMathMenu : false },' +
        'styles : { "#MathJax_Message" : { display : "none" }}' +
        '});'
    document.head.appendChild(script);

    var onload = function() {
        MathJax.Hub.Startup.onload();
    };
    vs.module.loadScript('framework/mathjax/MathJax.js', onload);
})();
