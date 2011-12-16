var Theme = {};
var ws = function() {

    "use strict";

    var _ws = { config : {} };
    var modules = ['mathjax', 'highlighter'];
    var defaultSettings = {
        pageDimensions : [1024, 768],
        outerColor : 'black',
        theme : 'latex-style',
        cursorHideTimeout : 1000,
        layout : { footer : true }
    };
    var slides = [];
    var slideNumber;
    var mouseX = 0;
    var mouseY = 0;
    var enableResizing = true;
    var curTout;
    var otherWindow;
    var windowChild;
    var menuul = null;
    var sections = [];
    var sync = false;
    var globalSettings = defaultSettings;
    var slideSettings = [];
    var readyFuncs = { parse : [], script : [], finish : [] };  // callbacks to run when DOM is ready

    /* ---------------------------- API methods ----------------------------------- */

    /** Sets whether the presentation is synchronized between windows. */
    _ws.setSync = function(boolval) {
        sync = boolval;
    };

    _ws.getCurrentSlide = function() {
        return slides[slideNumber];
    };

    /** Set the modules to load with the presentation.
        @param mods An array of strings that specity the modules. */
    _ws.loadModules = function(mods) {
        modules = mods;
    };

    /** Get the current slide. */
    _ws.getCurrentSlide = function() {
        return slides[slideNumber];
    };

    /** Get all slides of the presentation.. */
    _ws.getSlides = function() {
        return slides;
    };

    _ws.getSections = function() {
        return sections;
    };

    /** Generates a table of contents formatted as a nested <ul> list and
        inserts it before the calling script element. */
    _ws.tableOfContents = function() {
        var scripts = document.getElementsByTagName('script');
        var current = scripts[scripts.length - 1];

        readyFuncs.script.push(function() {
            var toc = document.createElement('ul');
            toc.innerHTML = _ws.getTocMarkup();
            current.parentNode.insertBefore(toc, current);
        });
    };

    // XXX it is possible that a config.* function is called in only one window due to user interaction

    /** When called in a slide div, set the settings for the current slide when the
        document is ready.*/
    _ws.config.setCurrent = function(settings) {
        var scripts = document.getElementsByTagName('script');
        var cur = scripts[scripts.length - 1];
        var rootDiv = cur.parentNode;
        while (rootDiv.parentNode !== document.body) {
            rootDiv = rootDiv.parentNode;
        }

        readyFuncs.script.push(function() {
            for (var i = 0; i < slides.length; ++i) {
                if (slides[i].div === rootDiv) {
                    setConfig(i, settings);
                }
            }
        });
    };

    /** Sets the settings for each slide that has the specified class name
        when the document is ready. */
    _ws.config.setForClass = function(className, settings) {
        readyFuncs.script.push(function() {
            for (var i = 0; i < slides.length; ++i) {
                var split = slides[i].div.className.split(' ');
                if (split.indexOf(className) !== -1) {
                    setConfig(i, settings);
                }
            }
        });
    };

    /** Sets the global settings when the document is ready. */
    _ws.config.setGlobal = function(settings) {
        readyFuncs.script.push(function() {
            globalSettings = mergeArrays(globalSettings, settings);
            for (var i = 0; i < slides.length; ++i) {
                setConfig(i, slideSettings[i]);
            }
        });
    };

    /** Sets the slide settings for the slide with number `index`. */
    _ws.config.setForSlide = function(index, settings) {
        readyFuncs.script.push(function() { setConfig(index - 1, settings); });
    };

    /** Switch to another slide.
     * @param num The index of the slide to go to.
     * @param effect Function callback Sliding effect */
    _ws.gotoSlide; // defined dynamically

    /** Go to the next slide. */
    _ws.gotoNext = function() {
        //syncCall('gotoNext', arguments);
        if (slides[slideNumber].animationsComplete() === false) {
            slides[slideNumber].nextAnimation();
        }
        else {
            slides[slideNumber].reset();
            _ws.gotoSlide(slideNumber + 1, null);
        }
    };

    /** Go to the previous slide. */
    _ws.gotoPrevious = function() {
        //syncCall('gotoPrevious', arguments);
        if (slides[slideNumber].animIndex > 0) {
            slides[slideNumber].undoAnimation();
        }
        else {
            slides[slideNumber].reset();
            _ws.gotoSlide(slideNumber - 1, null);
        }
    };

    _ws.slideHref = function(index, title, style) {
        return '<span style="cursor:pointer;' + style + '" onclick="ws.gotoSlide(' + index + ')">' + title + '</span>';
    };

    _ws.getTocMarkup = function() {
        // if a subsection has no parent section, it is treated as a section
        var html = '';
        var subbing = 0;

        var ahref = function() { return '<li><span class="link" onclick="javascript:ws.gotoSlide(' +  index + ');">'; };
        for (var i = 0; i < sections.length; ++i) {
            var index = sections[i].slideIndex;
            if (i > 0 && sections[i].type === 'subsection' && sections[i-1].type === 'section') {
                subbing += 1;
                html += '<ul>' + ahref(index) + sections[i].title + '</span></li>';
            }
            else if (i > 0 && sections[i].type === 'section' && sections[i-1].type === 'subsection') {
                subbing -= 1;
                html += '</ul>' + ahref(index) + sections[i].title + '</span></li>';
            }
            else {
                html += ahref(index) + sections[i].title + '</span></li>';
            }
        }

        for (i = 0; i < subbing; ++i) {
            html += '</ul>';
        }

        return html;
    };

    /* ----------------------------- Slide Setup ---------------------------------- */

    function setup() {
        document.head.innerHTML += '<link rel="stylesheet" href="framework/main.css" type="text/css" />';

        readyFuncs.parse = [parseDom, defaultConfig, parseSections];
        readyFuncs.finish = [init];
        onready();

        document.onkeydown = keyPress; // XXX rename
        document.onmousemove = mouseMove;
        document.onclick = mouseClick;
    }

    function parseDom() {
        var children = document.body.getElementsByTagName('div');
        var index = 0;
        for (var i = 0; i < children.length; i++) {
            if (children[i].parentNode !== document.body) {
                continue;
            }
            var tmpslide = new Slide();
            children[i].className = 'slide';

            tmpslide.div = children[i];
            tmpslide.index = index;
            slides[index] = tmpslide;
            ++index;
        }
    }

    /* Sets the slide settings to the default/global ones if the settings are still undefined. */
    function defaultConfig() {
        for (var i = 0; i < slides.length; ++i) {
            if (slides[i].settings === null) {
                setConfig(i, []);
            }
        }
    }

    function parseSections() {
        var sec = document.getElementsByTagName('section');
        for (var i = 0; i < sec.length; ++i) {
            sections[i] = { title : sec[i].innerHTML };
            var rootDiv = sec[i].parentNode;
            while (rootDiv.parentNode !== document.body) {
                rootDiv = rootDiv.parentNode;
            }
            for (var k = 0; k < slides.length; ++k) {
                if (slides[k].div === rootDiv) {
                    sections[i].slideIndex = k;
                }
            }
            if (sec[i].className === 'subsection') {
                sections[i].type = 'subsection';
            }
            else {
                sections[i].type = 'section';
            }
        }
    }

    function init() {
        document.body.style.backgroundColor = globalSettings.outerColor;
        var themeDict = [];

        // must know the themeDict length before the next loop start
        for (var i = 0; i < slides.length; ++i) {
            if (themeDict.indexOf(slides[i].settings.theme) === -1) {
                themeDict.push(slides[i].settings.theme);
            }
        }

        // executed after all theme scripts have been loaded
        var createSlides = function() {
            for (var i = 0; i < slides.length; ++i) {
                var dim = slides[i].settings.pageDimensions;
                slides[i].div.style.width = dim[0] + 'px';

                // consider the slide padding
                slides[i].div.style.width = dim[0] - (slides[i].div.clientWidth - dim[0]) + 'px';
                slides[i].div.style.height = dim[1] + 'px';
                slides[i].div.style.display = 'none';
                var jsname = jsTheme(slides[i].settings.theme);
                if (typeof Theme[jsname] === 'function') {
                    slideNumber = i;
                    Theme[jsname].ws = _ws;
                    Theme[jsname].ws.mergeArrays = mergeArrays;
                    Theme[jsname]();
                }
            }

            slideNumber = 0;
            if (window.opener !== null) {
                otherWindow = window.opener;
                _ws.setSync(true);
            }
            if (window.location.search === '?console') {
                _ws.gotoSlide = console.gotoSlide;
                console.guiLayout();
                window.onresize = console.resize;
            }
            else {
                _ws.gotoSlide = view.gotoSlide;
                window.onresize = view.resize;
            }
            _ws.gotoSlide(0);
        };

        var loadedCount = 0;
        for (i = 0; i < themeDict.length; ++i) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'framework/styles/' + themeDict[i] + '.css';

            // link must be appended before js to ensure that all css styles are loaded
            // when running createSlides.
            document.head.appendChild(link);

            if (fileExists('framework/styles/' + themeDict[i] + '.js')) {
                var js = document.createElement('script');
                js.type = 'text/javascript';
                js.onload = function() {
                    if (++loadedCount === themeDict.length) {
                        createSlides();
                    }
                };
                js.src = 'framework/styles/' + themeDict[i] + '.js';
                document.head.appendChild(js);
            }
            else {
                createSlides();
            }
        }

        for (i = 0; i < modules.length; i++) {
           var js = document.createElement('script');
           js.type = 'text/javascript';
           js.src = 'framework/module.' + modules[i] + '.js';
           document.head.appendChild(js);
        }
    }

    function fileExists(filename) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open('GET', filename, false);
        try {
            xmlhttp.send(null);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    function jsTheme(str) {
        str = str.toLowerCase();
        str = str.substr(0, 1).toUpperCase() + str.substr(1);
        for (var i = 0; i < str.length; ++i) {
            if (i < str.length - 1 && (str[i] === '-' || str[i] === '_')) {
                str = str.substr(0, i) + str[i + 1].toUpperCase() + str.substr(i + 2);
            }
        }
        return str;
    }

    /* rules:
    */

    function parseData(data) {
        var from, to;
        data = trim(data);
        // TODO remove *all* spaces
        data = data.split(',');
        for (var i = 0; i < data.length; ++i) {
            if (data.substr(0, 1) === '-') {
                from[i] = 1;
                data = data.substr(1);
            }
            else {
                var nr = parseInt(data);
                var len = nr.toString().length;
                if (len === data.length) {
                    from[i] = to[i] = nr;
                    continue;
                }
                else if (data.charAt(len - 1) !== '-') {
                    return false;
                }
                else {
                    from[i] = nr;
                    data = data.substr(len);
                }
            }
            var nr2 = parseInt(data);
            if (nr2 === data) {
                to[i] = nr2;
            }
        }
        return [from, to];
    }

    function parseOverlays() {
        for (var i = 0; i < slides.length; ++i) {
            var elems = slides.children;
            for (var k = 0; k < elems; ++k) {
                var val = elems[i].dataAnim;
                if (typeof val !== 'undefined') {
                    if (val === '<+->') {
                        
                    }
                //    else if (val === ''
                }
            }
        }
    }

    /* Executes the callbacks in the readycbs array when the DOM is ready. */
    function onready() {
        var cb = function() {
            for (var i = 0; i < readyFuncs.parse.length; ++i) {
                readyFuncs.parse[i]();
            }
            for (i = 0; i < readyFuncs.script.length; ++i) {
                readyFuncs.script[i]();
            }
            for (i = 0; i < readyFuncs.finish.length; ++i) {
                readyFuncs.finish[i]();
            }
        };
        if (window.addEventListener) {
            window.addEventListener('DOMContentLoaded', cb, false);
        }
        else {
            window.addEventListener('load', cb, false);
        }
    }

    /* ---------------------------------------------------------------------------- */

    /* If a child/parent window is available, calls the appropriate function of the other window
       to synchronize the presentation windows. */
    function syncWindow(func, args) {
        if (sync === false) {
            return;
        }

        // 2nd check: window has been closed
        if (otherWindow === undefined || otherWindow.ws === undefined) {
            sync = false;
            return;
        }

        otherWindow.ws.setSync(false);
        otherWindow.ws[func].apply(otherWindow.ws, args);
        otherWindow.ws.setSync(true);
    }

    function printLayout() {
        alert(1);
        for (var i = 0; i < slides.length; ++i) {
            _ws.gotoSlide(i);
            if (i > 0)
                showSlide(i-1);
            slideNumber = i;
            enableResizing = false;
            slides[i].div.style.MozTransform = '';
            slides[i].div.style.WebkitTransform = '';
            slides[i].div.style.position = 'relative';
            slides[i].div.style.marginLeft = '0px';
            slides[i].div.style.marginTop = '0px';
            if (i !== slides.length - 1) slides[i].div.style.pageBreakAfter = 'always';
        }
        document.body.style.overflow = 'scroll';
        document.body.style.height = '1000px';
    }

    function showSlide(number) {
        slides[number].div.style.display = 'block';
    }

    function hideSlide(number) {
        slides[number].div.style.display = 'none';
    }

    /** Merges multiple settings array. A setting can be overwritten by an
        element that appears later in the parameter list.*/
    function mergeArrays() {
        // slice to copy value instead of reference
        var result = [arguments[0]].slice();
        for (var i = 0; i < arguments.length; ++i) {
            for (var key in arguments[i]) {
                if (typeof arguments[i][key] === 'object') {
                    // recursion to ensure that all settings stay defined
                    var subargs = [];
                    for (var subi = 0; subi < arguments.length; ++subi) {
                        if (typeof arguments[subi][key] !== 'undefined') {
                            subargs.push(arguments[subi][key]);
                        }
                    }
                    result[key] = mergeArrays.apply(null, subargs);
                }
                else {
                    result[key] = arguments[i][key];
                }
            }
        }
        return result;
    }

    function setConfig(index, settings) {
        slideSettings[index] = settings;
        var merged = mergeArrays(globalSettings, settings);
        slides[index].settings = merged;
    }

    function Slide()
    {
        var self = this;

        self.div = null;

        self.settings = null;

        /**
         * Add animators to this slide. The Animator instances have to be passed
         * as the function parameters.
         */
        self.addAnimators = function()
        {
            for (var i = 0; i < arguments.length; i++) {
                self.animators = self.animators.concat(arguments[i]);
            }
        };

        self.nextAnimation = function()
        {
            self.animators[self.animIndex].doAnimate();
            self.animIndex++;
            if (self.animIndex < self.animators.length) {
                if (self.animators[self.animIndex].trigger === 'withprevious') {
                    self.nextAnimation();
                }
                else if (self.animators[self.animIndex].trigger === 'afterprevious') {
                    self.animators[self.animIndex - 1].onFinished = self.nextAnimation;
                }
            }
        };

        self.undoAnimation = function()
        {
            self.animators[self.animIndex].undoAnimate();
            self.animIndex--;
        };

        self.backwardAnimation = function()
        {
            self.animators[self.animIndex].backwardAnimate();
            self.animIndex--;
        };

        self.reset = function()
        {
            for(var i = 0; i < self.animIndex; i++) {
                self.animators[i].undoAnimate();
                self.animIndex = 0;
            }
        };

        self.animationsComplete = function()
        {
            return self.animIndex === self.animators.length;
        };

        self.animIndex = 0;

        self.animators = [];
    }

    /* ------------------------- User interaction --------------------------------- */

    /* Hide context menu if visible. */
    function mouseClick(args) {
        // every <li> in context menu has an id that starts with 'cm_'
        if (menuul !== null && args.target.id !== undefined &&
            args.target.id.substring(0, 3) !== 'cm_')
        {
            document.body.removeChild(menuul);
            menuul = null;
        }
    }

    /* For cursor hiding. */
    function mouseMove(args) {
        // args.clientX und pageX für IE und andere
        // newX und mouseX für Chrome, der bei cursor-Änderung auslöst
        if (!args) {
            args = window.event;
        }
        var newX, newY;
        if (args.pageX) {
            newX = args.pageX;
            newY = args.pageY;
        }
        else if (args.clientX) {
            newX = args.clientX;
            newY = args.clientY;
        }
        clearTimeout(curTout);
        if (mouseX !== newX || mouseY !== newY) {
             document.body.style.cursor = "auto";
        }
        mouseX = newX;
        mouseY = newY;
        curTout = setTimeout(function() { document.body.style.cursor = 'none'; },
            slides[slideNumber].settings.cursorHideTimeout);
    }

    function keyPress(ev) {
        if (ev.target === "INPUT") {
            return;
        }
        if (ev.keyCode === 32) { // space
            contextMenu(false);
        }
        else if (ev.keyCode === 39) { // right
            _ws.gotoNext();
        }
        else if (ev.keyCode === 37) { // left
            _ws.gotoPrevious();
        }

        if (ev.keyCode === 32 || ev.keyCode === 38 || ev.keyCode === 40) {
            // eat the key to avoid scrolling
            return false;
        }
    }

    /* ------------------------- End User interaction --------------------------------- */
    /**
     * Shows a context menu.
     * @param keepMenu Whether to keep an already existing menu and only adjust its position.
     */
    function contextMenu(keepMenu) {
        var posx, posy;
        if (mouseX === null) {
            return;
        }
        if (menuul !== null) {
            if (!keepMenu) {
                document.body.removeChild(menuul);
                menuul = null;
                return;
            }
            else if (keepMenu) {
                posx = menuul.style.left;
                posy = menuul.style.top;
            }
            document.body.removeChild(menuul);
            menuul = null;
        }
        else {
            posx = mouseX + "px";
            posy = mouseY + "px";
        }

        var menuEntries = [
            ['Next', slideNumber < slides.length - 1, function() { _ws.gotoNext(); contextMenu(true); }],
            ['Previous', slideNumber > 0, function() { _ws.gotoPrevious(); contextMenu(true); }],
            ['First', slideNumber > 0, function() { _ws.gotoSlide(0); contextMenu(true); }],
            ['Last', slideNumber < slides.length - 1, function() { _ws.gotoSlide(slides.length - 1); contextMenu(true); }],
            ['Presenter Console',  true, function() { openNewWindow(); contextMenu(false); }],
            ['Go to',  true, function() { }],
            'opensubmenu'
        ];

        var gotofunc = function() { _ws.gotoSlide(this.innerHTML[0] - 1); };
        for (var i = 0; i < slides.length; ++i) {
            var title = (i + 1).toString();
            var h1arr = slides[i].div.getElementsByTagName("h1");
            if (h1arr.length > 0) {
                title += '&nbsp;' + h1arr[0].innerHTML;
            }
            menuEntries.push([title, i !== slideNumber, gotofunc]);
        }

        menuEntries.push('closesubmenu');

        menuul = document.createElement('ul');
        menuul.className = "menuul";
        menuul.style.left = posx;
        menuul.style.top = posy;
        document.body.appendChild(menuul);

        fillMenuUl(menuul, menuEntries);
        setMenuEvents(menuEntries);
    }

    function setMenuEvents(menuEntries) {
        for (var i = 0; i < menuEntries.length; i++) {
            var elem = document.getElementById('cm_' + i.toString());
            if (elem !== null) {
                elem.onclick = menuEntries[i][2];
            }
        }
    }

    function openNewWindow() {
        otherWindow = window.open('main.html?console', 'Presentation Screen &ndash ' + document.title,
            'status=yes,menubar=yes,screenX=' + screen.availWidth +
            '*,screenY=0,height=' + screen.availHeight + ',width=' + screen.availWidth);
        _ws.setSync(true);
    }

    function fillMenuUl(ul, menuEntries, start)
    {
        if (typeof start === 'undefined') {
            start = 0;
        }

        for (var cnt = start; cnt < menuEntries.length; cnt++) {
            if (menuEntries[cnt] === 'closesubmenu') {
                break;
            }
            else if (menuEntries[cnt] === 'opensubmenu') {
                continue;
            }
            var li = document.createElement('li');
            if (menuEntries[cnt + 1] === 'opensubmenu') {
                var subul = document.createElement('ul');
                li.appendChild(subul);
                fillMenuUl(subul, menuEntries, cnt + 1);
            }
            li.className = menuEntries[cnt][1] === true ? '' : 'inactli';
            li.innerHTML += menuEntries[cnt][0];
            li.id = 'cm_' + cnt.toString();
            ul.appendChild(li);
            if (menuEntries[cnt + 1] === 'opensubmenu') {
                cnt += 2;
                var opencount = 1;
                while (opencount !== 0) {
                    if (menuEntries[cnt] === 'opensubmenu') {
                        opencount++;
                    }
                    else if (menuEntries[cnt] === 'closesubmenu') {
                        opencount--;
                    }
                    cnt++;
                }
            }
        }
    }

    /* ------------------------------- Normal view -------------------------------- */

    var view = function() {
        var _view = {};
        _view.gotoSlide = function(num, effect) {
            syncWindow('gotoSlide', arguments);
            if (num >= 0 && num < slides.length) {
                if (window.location.search === '?console') {
                    console.gotoSlide(num);
                }
                else {
                    var oldsn = slideNumber;
                    slideNumber = num;

                    // resize before showing the slide, else
                    // it can look blurry at first
                    _view.resize();
                    if (oldsn === num) {
                        showSlide(num);
                    }
                    else {
                        if (typeof effect === 'undefined' || effect === null) {
                            hideSlide(oldsn);
                            showSlide(num);
                        }
                        else {
                           effect(this, num, oldsn);
                        }
                    }
                }
            }
        };

        /* Called when the window is resized, adjusts the slide size. */
        _view.resize = function() {
            if (enableResizing === false) {
                return;
            }
            var height = document.body.clientHeight;
            var width = document.body.clientWidth;

            var pagewidth = slides[slideNumber].settings.pageDimensions[0];
            var pageheight = slides[slideNumber].settings.pageDimensions[1];

            var scale = Math.min(width/pagewidth, height/pageheight);
            if (scale > 1) {
                scale = 1;
            }
            slides[slideNumber].div.style.WebkitTransform = 'scale(' + scale + ')';
            slides[slideNumber].div.style.MozTransform = 'scale(' + scale + ')';
            slides[slideNumber].div.style.marginTop = '-' + (1-scale)*pageheight/2 + 'px';
            slides[slideNumber].div.style.marginLeft =  (width-pagewidth)/2 + 'px';
        }

        return _view;
    }();

    /* ----------------------------- End Normal view ------------------------------ */

    /* ------------------------------- Console ------------------------------------ */
    var console = function() {
        var _console = {};
        var startTime = null;
        var paused = 0;
        var timerRunning = true;
        var showNotes = false;
        var notesdiv = null;

        _console.guiLayout = function() {
            var cbar = document.createElement('div');
            cbar.style.textAlign = 'center';
            cbar.style.bottom = '0px';
            cbar.style.position = 'absolute';
            cbar.style.width = '100%';

            // blur, because space key would press button again
            cbar.innerHTML =
                '<div id="controls" style="margin:auto;display:table">' +
                '   <div style="display:table-row;height:100%">' +
                '       <div><span>' + getClockHtml('&ndash;', '0:00') +
                '           </span><a id="reset">Reset</a>' +
                '           <a id="pause">Pause</a>' +
                '       </div>' +
                '       <div>' +
                '           <button id="notesbutton">Notes</button>' +
                '       </div>' +
                '       <div><button id="slidesbutton" onclick="javascript:this.blur();">Slides</button></div>' +
                '   </div>' +
                '</div>';
            document.body.appendChild(cbar);
            document.getElementById('notesbutton').onclick = function() {
               showNotes = !showNotes;
               _console.gotoSlide(slideNumber);
               this.blur();
            };

            document.getElementById('reset').onclick = resetTimer;
            document.getElementById('pause').onclick = startStop;
            document.getElementById('reset').href = '#';
            document.getElementById('pause').href = '#';

            setInterval(updateTime, 1000);
        };

        function getClockHtml(string1, string2) {
            return '<span id="clocktime">' + string1 + '</span>' +
                   '     <span id="time">' + string2 + '</span>';
        }

        _console.resize = function() {
        };

        _console.gotoSlide = function(num) {
            syncWindow('gotoSlide', arguments);
            if (num >= slides.length || num < 0) {
                return;
            }
            hideSlide(slideNumber);
            if (slideNumber < slides.length - 1) {
                hideSlide(slideNumber + 1);
            }
            showSlide(num);
            if (showNotes === false) {
                if (notesdiv !== null) {
                    document.body.removeChild(notesdiv);
                    notesdiv = null;
                }
                slides[num].div.style.left = '-10%';
                slides[num].div.style.MozTransform = 'scale(0.6)';
                slides[num].div.style.WebkitTransform = 'scale(0.6)';
                slides[num].div.style.top = '-10%'; // -20 + 15
            }
            else {
                slides[num].div.style.left = '-15%';
                slides[num].div.style.MozTransform = slides[num].div.style.WebkitTransform = 'scale(0.5)';
                slides[num].div.style.top = '-15%';
                if (notesdiv === null) {
                    notesdiv = document.createElement('div');
                }
                notesdiv.className = 'notesdiv';
                var notes = slides[num].div.getElementsByClassName('notes');
                if (notes.length > 0) {
                    notesdiv.innerHTML = notes[0].innerHTML;
                }
                document.body.appendChild(notesdiv);
            }
            if (num < slides.length - 1) {
                if (showNotes === false) {
                    showSlide(num + 1);
                    slides[num + 1].div.style.left = '35%';
                    slides[num + 1].div.style.top = '-20%'; // -30 + 15
                    slides[num + 1].div.style.MozTransform = slides[num + 1].div.style.WebkitTransform = 'scale(0.4)';
                }
                else {
                }
            }
            slideNumber = num;
        };

        function resetTimer() {
            startTime = null;
            paused = 0;
            document.getElementById('time').innerHTML = '0:00';
        }

        function updateTime() {
            // Uhr
            var now = new Date();

            var clockstring = pad2two(now.getHours()) + ':' + pad2two(now.getMinutes()) + ':' + pad2two(now.getSeconds());

            if (timerRunning === false) {
                document.getElementById('clocktime').innerHTML = clockstring;
            }
            else {
                if (startTime === null) {
                    startTime = now;
                }
                var diff = new Date(now.getTime() + paused - startTime.getTime());
                var timestring = (diff.getHours()*60 - 60 + diff.getMinutes()).toString() + ':' + pad2two(diff.getSeconds());

                // change parent html to be synchronous
                document.getElementById('clocktime').parentNode.innerHTML = getClockHtml(clockstring, timestring);
            }
        }

        function startStop() {
            if (timerRunning === false) {
                document.getElementById('pause').innerHTML = 'Pause';
                timerRunning = true;
            }
            else {
                if (startTime !== null) {
                    paused += (new Date()).getTime() - startTime;
                    startTime = null;
                }
                timerRunning = false;
                document.getElementById('pause').innerHTML = 'Resume';
            }
        }

        function pad2two(digit) {
            return (digit.toString().length === 1 ? '0' + digit.toString() : digit.toString());
        }

        return _console;
    }();

    setup();
    return _ws;
}();
