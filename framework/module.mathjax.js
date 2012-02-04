(function() {
    var onload = function() {
        MathJax.Hub.Startup.onload();
    };
    ws.module.loadScript('framework/mathjax/MathJax.js?config=default', onload);
})();
