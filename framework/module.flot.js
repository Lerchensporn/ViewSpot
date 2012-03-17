(function() {
    if (typeof jQuery === 'undefined') {
        window.jQuery = true;
        vs.module.loadScript('framework/flot/jquery.min.js');
    }
    vs.module.loadScript('framework/flot/jquery.flot.min.js');
})();
