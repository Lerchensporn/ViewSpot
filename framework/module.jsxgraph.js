(function() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'framework/jsxgraph/jsxgraph.css';
    document.head.appendChild(link);

    ws.module.loadScript('framework/jsxgraph/jsxgraphcore.js');
})();
