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

    var footerdiv, sidebardiv, heading, contentdiv;
    var slide;
    function createLayout() {
        slide = ws.getCurrentSlide();
        layout = slide.settings.layout;
        if (typeof layout.theme == 'undefined') {
            layout.theme = 'default';
        }
        switch (layout.theme.toLowerCase()) {
            case 'annabor':
                 defaultLayout = { footer : true, sidebar : true };
            break;
            case 'default':
                defaultLayout = { footer : true, sidebar : true, sidebarPicture : false, sidebarSide : 'right' };
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
        if (layout.sidebar === false) {
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
        var minidiv = document.createElement('div');
        for (var i = 0; i < instance.sections.length; ++i) {
            minidiv.innerHTML += '<td>' + slideHref(instance.sections[i].slideIndex, instance.sections[i].title) + '<br/>';
            if (instance.sections[i].type == 'section') {
                while (instance.sections[++i].type == 'subsection') {
                    minidiv.innerHTML += '<svg xmlns="http://www.w3.org/2000/svg" version="1.1"><circle cx="3" cy="3" r="6" fill="' + 
                        (slide.index == i ? 'white' : 'none') + '"/></svg>';
                }
            }
            minidiv.innerHTML += '</td>';
        }
        minidiv.innerHTML = '<table><tr>' + minidiv.innerHTML + '</tr></table>';
        slide.div.insertBefore(minidiv, slides.div.firstChild);
    }
    return createLayout;
}();
