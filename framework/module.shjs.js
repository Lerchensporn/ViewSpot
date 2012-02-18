(function() {
    var histyle = 'vim';
    var cfg = ws.module.getConfig('shjs');
    if (typeof cfg.histyle !== 'undefined') {
        histyle = cfg.histyle;
    }

    ws.module.loadCSS('framework/shjs/css/sh_' + histyle + '.min.css');

    var onload = function() {
        sh_highlightDocument('framework/shjs/lang/', '.min.js');
    };
    ws.module.loadScript('framework/shjs/sh_main.min.js', onload);
})();
