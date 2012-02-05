ws.controls = function() {

    'use strict;'

    var _controls = { };

    ws.module.loadCSS('framework/controls.css');

    _controls.sidebar = function(slide) {
        var sidebardiv = document.createElement('div');
        sidebardiv.className = 'sidebar';
        if (typeof slide.settings.sidebar !== 'undefined' && slide.settings.sidebar.author !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.author + '</span>';
        }
        if (typeof slide.settings.sidebar !== 'undefined' && typeof slide.settings.sidebar.title !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.title + '</span>';
        }
        sidebardiv.innerHTML += '<ul>' + ws.getTocMarkup() + '</ul>';

        dockdiv(sidebardiv, slide, 'left');
    };

    _controls.footer = function(slide) {
        footerdiv = document.createElement('div');
        footerdiv.style.padding = '10px';
        footerdiv.style.fontSize = '18px';
        if (typeof slide.settings.footer !== 'undefined' && typeof slide.settings.footer.text !== 'undefined') {
            footerdiv.innerHTML = slide.settings.footer.text;
        }
        else {
            footerdiv.innerHTML = 'Set your footer text.';
        }
        dockdiv(footerdiv, slide, 'bottom');
    };

    _controls.miniframes = function(slide) {
        var minidiv = document.createElement('div');
        minidiv.className = 'miniframe';

        var html = '';
        var sections = ws.getSections(true);
        var slideslist = ws.getSlides();
        for (var i = 0; i < sections.length; ++i) {
            var sectionClass;
            var sectionEnd = (i < sections.length - 1  ? sections[i + 1].slideIndex : slideslist.length);
            if (slide.index >= sections[i].slideIndex && slide.index < sectionEnd) {
                sectionClass = 'sectionActive';
            }
            else {
                sectionClass = 'sectionInactive';
            }

            if (i === sections.length - 1 && i > 0) {
                html += '<td style="float:right">';
            }
            else {
                html += '<td>';
            }

            html += '<span class="' + sectionClass + '" onclick="ws.gotoSlide(' + sections[i].slideIndex + ')">' + sections[i].title + '</span>';
            html += '<br/><svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="12">';
            for (var circi = sections[i].slideIndex; circi < sectionEnd; ++circi) {
                var circleClass = (slide.index === slideslist[circi].index ? 'circleActive' : 'circleInactive');
                html += '<circle class="' + sectionClass + ' ' + circleClass +
                        '" onclick="ws.gotoSlide(' + slideslist[circi].index + ')" cx="' + (12*(circi - sections[i].slideIndex) + 6.5) + '" cy="5" r="4.5"/>';
            }
            html += '</svg>';
            html += '</td>';
        }
        minidiv.innerHTML = '<table style="table-layout:fixed;width:100%;padding-left:8px;padding-right:8px;padding-top:1px"><tr>' + html + '</tr></table>';

        dockdiv(minidiv, slide, 'top');
    };

    function dockdiv(div, slide, loc) {
        var padding = parseInt(document.defaultView.getComputedStyle(slide.div, null).getPropertyValue('padding-left'));
        div.style.marginLeft = -padding + 'px';
        div.style.marginRight = -padding + 'px';
        div.style.position = 'relative';    // to show box-shadow
        if (loc === 'top') {
            slide.div.insertBefore(div, slide.div.firstChild);
        }
        else if (loc === 'bottom') {
            div.style.position = 'absolute';
            div.style.width = '100%';
            div.style.bottom = '0px';
            slide.div.appendChild(div);
        }
        else if (loc === 'left' || loc === 'right') {
            var width = 200;

            div.style.cssFloat = loc;
            div.style.width = width + 'px';
            div.style.height = '100%';

            var container = document.createElement('div');
            container.style.width = (slide.settings.pageDimensions[0] - width - 2 * padding) + 'px';

            if (loc === 'left') {
                container.style.cssFloat = 'left';
                container.style.marginLeft = padding + 'px';
                container.style.paddingLeft = padding + 'px';
            }

            container.innerHTML = slide.div.innerHTML;

            slide.div.innerHTML = '';

            slide.div.appendChild(div);
            slide.div.appendChild(container);
        }
        else if (loc === 'right') {
            var width = 200;

            div.style.cssFloat = 'right';
            div.style.width = width + 'px';
            div.style.height = '100%';

            var container = document.createElement('div');
            container.style.width = (slide.settings.pageDimensions[0] - width - 2 * padding) + 'px';
            container.innerHTML = slide.div.innerHTML;

            slide.div.innerHTML = '';

            slide.div.appendChild(div);
            slide.div.appendChild(container);
        }
    }

    return _controls;

}();
