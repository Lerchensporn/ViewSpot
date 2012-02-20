ws.fullthemes = function() {
    var _fullthemes = { };

    _fullthemes.latex = function(slide) {
        ws.controls.miniframes(slide);
        ws.module.loadCSS('framework/fullthemes.css');
        slide.div.className += ' latex';
    };

    return _fullthemes;
}();
