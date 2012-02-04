(function() {
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = 'framework/shjs/css/sh_' + 'vim' + '.min.css';
    document.head.appendChild(link);

    var onload = function() {
        sh_highlightDocument('framework/shjs/lang/', '.min.js');
    };
    ws.module.loadScript('framework/shjs/sh_main.min.js', onload);
})();
