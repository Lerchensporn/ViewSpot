(function() {
    ws.module.loadCSS('framework/jqplot/jquery.jqplot.min.css');
    if (typeof jQuery === 'undefined') {
        window.jQuery = true;
        ws.module.loadScript('framework/jqplot/jquery.min.js');
    }
    ws.module.loadScript('framework/jqplot/jquery.jqplot.min.js');
})();
