(function() {
    var script = document.createElement("script");
    script.innerHTML = 'MathJax = { tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] }, svg: { fontCache: "global" } }';
    document.head.appendChild(script);
    vs.module.loadScript("framework/mathjax/es5/tex-svg.js");
})();
