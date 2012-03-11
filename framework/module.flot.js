(function() {
    if (typeof jQuery === 'undefined') {
        window.jQuery = true;
        ws.module.loadScript('framework/flot/jquery.min.js');
    }
    ws.module.loadScript('framework/flot/jquery.flot.min.js');
})();
