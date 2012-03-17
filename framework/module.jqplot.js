(function() {
    vs.module.loadCSS('framework/jqplot/jquery.jqplot.min.css');
    if (typeof jQuery === 'undefined') {
        window.jQuery = true;
        vs.module.loadScript('framework/jqplot/jquery.min.js');
    }
    vs.module.loadScript('framework/jqplot/jquery.jqplot.min.js');
})();
