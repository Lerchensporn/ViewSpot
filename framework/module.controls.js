ws.controls = function() {

    'use strict;'

    var _controls = { };

    _controls.sidebar = function(slide) {
        sidebardiv = document.createElement('div');
        sidebardiv.style.width = '200px';
        sidebardiv.style.backgroundColor = 'blue';
        sidebardiv.style.height = '100%';
        if (typeof layout.author !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.author + '</span>';
        }
        if (typeof layout.title !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.title + '</span>';
        }
        sidebardiv.innerHTML += '<ul>' + ws.getTocMarkup() + '</ul>';
    };

    _controls.footer = function(slide) {
        footerdiv = document.createElement('div');
        footerdiv.style.padding = '10px';
        footerdiv.style.fontSize = '18px';
        if (typeof slide.settings.footer.text !== 'undefined') {
            footerdiv.innerHTML = slide.settings.footer.text;
        }
        else {
            footerdiv.innerHTML = 'Set your footer text.';
        }
        dockdiv(footerdiv, slide.div, false);
    };

    _controls.miniframes = function(slide) {
        var minidiv = document.createElement('div');
        minidiv.style.backgroundColor = '#d2d3ff';
        minidiv.style.fontSize = '12pt';
        minidiv.style.boxShadow = '0px 0px 10px 0px #d4deff';
        minidiv.style.zIndex = '1';
        minidiv.style.paddingLeft = '10px';
        minidiv.style.paddingRight = '10px';
        minidiv.style.color = '#bbb';

        var html = '';
        var sections = ws.getSections();
        for (var i = 0; i < sections.length; ++i) {
            var stroke;
            if (slide.index >= sections[i].slideIndex &&
                (i === sections.length - 1 || slide.index <= sections[i + 1].slideIndex)) {
                stroke = 'black';
            }
            else {
                stroke = '#bbb';
            }
            if (i === sections.length - 1) {
                html += '<td style="text-align:right">';
            }
            else if (i > 0) {
                html += '<td style="text-align:center">';
            }
            else {
                html += '<td>';
            }
            html += ws.slideHref(sections[i].slideIndex, sections[i].title,
                'font-size:11pt;font-family:Droid Sans;color:' + stroke);
            if (sections[i].type === 'section') {
                ++i;
                html += '<br/><svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="12">';
                for (var circi = i; circi < sections.length && sections[circi].type === 'subsection'; ++circi) {
                    var fill = (slide.index === sections[circi].slideIndex ? stroke : 'transparent');
                    html += '<circle style="cursor:pointer;stroke-width:1.2px" onclick="ws.gotoSlide(' + sections[circi].slideIndex + ')" cx="'
                        + (12*(circi - i) + 5.5) + '" cy="5" r="4.5" fill="' + fill + '" stroke="' + stroke + '"/>';
                }
                i = circi - 1;
                html += '</svg>';
            }
            html += '</td>';
        }
        minidiv.innerHTML = '<table style="table-layout:fixed;width:100%;padding-left:8px;padding-right:8px;padding-top:1px"><tr>' + html + '</tr></table>';

        dockdiv(minidiv, slide.div, true);
    };

    function dockdiv(div, slidediv, isTop) {
        var padding = parseInt(document.defaultView.getComputedStyle(slidediv, null).getPropertyValue('padding-left'));
        div.style.marginLeft = -padding + 'px';
        div.style.marginRight = -padding + 'px';
        div.style.position = 'relative';    // to show box-shadow
        if (isTop) {
            slidediv.insertBefore(div, slidediv.firstChild);
        }
        else {
            div.style.position = 'absolute';
            div.style.width = '100%';
            div.style.bottom = '0px';
            slidediv.appendChild(div);
        }
    }

    return _controls;

}();
