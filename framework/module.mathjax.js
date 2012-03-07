(function() {

    var script = document.createElement('script');
    script.type = 'text/x-mathjax-config';
    script.innerHTML = "MathJax.Hub.Config({" +
        "jax : ['input/TeX', 'output/NativeMML']," +
        "extensions : ['tex2jax.js']," +
        "NativeMML : { showMathMenu : false }" +
        "});"
    document.head.appendChild(script);

    var onload = function() {
        MathJax.Hub.Startup.onload();
    };
    ws.module.loadScript('framework/mathjax/MathJax.js', onload);
})();
