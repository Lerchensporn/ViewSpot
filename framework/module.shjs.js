(function() {
    ws.module.loadCSS('framework/shjs/css/sh_' + 'vim' + '.min.css');

    var onload = function() {
        sh_highlightDocument('framework/shjs/lang/', '.min.js');
    };
    ws.module.loadScript('framework/shjs/sh_main.min.js', onload);
})();
