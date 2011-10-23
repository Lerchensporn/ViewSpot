Theme.LatexStyle = function() {

   /* var colorthemes = [
        'albatross'  : LatexColor(),
        'beaver'    : ,
        'beetle'    : ,
        'crane'     : ,
        'default'   : ,
        'dolphin'   : ,
        'dove'      : ,
        'fly'       : ,
        'lily'      : ,
        'orchid'    : ,
        'rose'      : ,
        'seagull'   : ,
        'seahorse'  : ,
        'wolve'     : ,
        'wolverine' :
    ];*/

    var layout;

    var colors = {
        
    };

    var footerdiv, sidebardiv, heading, contentdiv, minidiv;
    var slide;
    function createLayout() {
        slide = ws.getCurrentSlide();
        layout = slide.settings.layout;
        if (typeof layout.theme == 'undefined') {
            layout.theme = 'default';
        }
        switch (layout.theme.toLowerCase()) {
            case 'annabor':
                 defaultLayout = { footer : true, footer3parts : true, infolines : true, sidebar : false };
            break;
            case 'default':
                defaultLayout = { footer : true, sidebar : false, miniframes : true, sidebarPicture : false, sidebarSide : 'right' };
            break;
            default: return;
        }

        layout = ws.mergeArrays(defaultLayout, layout);

        if (layout.footer === true) {
            innerFooter();
        }
        if (layout.sidebar === true) {
            innerSidebar();
        }
        heading = slide.div.getElementsByTagName('h1')[0];
        contentdiv = document.createElement('div');
        contentdiv.innerHTML = slide.div.innerHTML;

        outertheme();
    }

    function outertheme() {
        slide.div.innerHTML = '';
        if (layout.miniframes === true) {
            miniframes();
            slide.div.appendChild(minidiv);
            slide.div.appendChild(contentdiv);
        }
        else if (layout.sidebar === false) {
            slide.div.innerHTML = contentdiv.innerHTML;
        }
        else if (layout.sidebar === true && layout.sidebarPicture === false) {
            if (layout.sidebarSide === 'left') {
                sidebardiv.style.cssFloat = 'left';
                contentdiv.style.cssFloat = 'left';
            }
            else if (layout.sidebarSide === 'right') {
                sidebardiv.style.cssFloat = 'right';
                contentdiv.style.cssFloat = 'right';
            }
            contentdiv.style.width = slide.settings.pageDimensions[0] - 200 + 'px';
            appendto(slide.div, [sidebardiv, contentdiv, footerdiv]);
        }
        if (layout.footer === true) {
            slide.div.appendChild(footerdiv);
        }
    }

    function appendto(element, children) {
        for (var i = 0; i < children.length; ++i) {
            if (typeof children[i] !== 'undefined') {
                element.appendChild(children[i]);
            }
        }
    }

    function innerHeading() {
        
    }

    function innerSidebar() {
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
    }

    function innerFooter(cols) {
        footerdiv = document.createElement('div');
        if (typeof layout.footerLeft == 'undefined') {
            layout.footerLeft = layout.author + ' (' +  layout.institute + ')';
        }
        if (typeof layout.footerRight == 'undefined') {
            layout.footerRight = '&lt;Set the footer text.&gt;';
        }
        footerdiv.className = 'footer';
        footerdiv.innerHTML = '<div class="footer-left">' + layout.footerLeft +
            '</div><div class="footer-right">' + layout.footerRight + '</div>';

    }

    function miniframes() {
        minidiv = document.createElement('div');
        minidiv.style.backgroundColor = 'blue';
        minidiv.style.fontSize = '12pt';
        minidiv.style.color = 'white';

        var html = '';
        var sections = ws.getSections();
        for (var i = 0; i < sections.length; ++i) {
            var stroke;
            if (slide.index >= sections[i].slideIndex &&
                (i === sections.length - 1 || slide.index <= sections[i + 1].slideIndex)) {
                stroke = 'white';
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
                    var fill = (slide.index === sections[circi].slideIndex ? 'white' : 'transparent');
                    html += '<circle style="cursor:pointer;stroke-width:1.2px" onclick="ws.gotoSlide(' + sections[circi].slideIndex + ')" cx="'
                        + (12*(circi - i) + 5.5) + '" cy="5" r="4.5" fill="' + fill + '" stroke="' + stroke + '"/>';
                }
                i = circi - 1;
                html += '</svg>';
            }
            html += '</td>';
        }
        minidiv.innerHTML = '<table style="table-layout:fixed;width:100%;padding-left:8px;padding-right:8px;padding-top:1px"><tr>' + html + '</tr></table>';
    }
    return createLayout;
}();
