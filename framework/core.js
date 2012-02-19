var ws = function() {

    'use strict';

    var _ws = { config : {} };
    var modules = ['controls', 'fullthemes', 'mathjax', 'syntaxhighlighter']; // ['jsxgraph', 'mathjax', 'controls', 'fullthemes', 'shjs', 'jqplot', 'flot'];
    var defaultSettings = {
        pageDimensions : [1024, 768],
        outerColor : 'black',
        cursorHideTimeout : 1000,
    };
    var slides = [];
    var slideNumber;
    var loaded = false;
    var mouseX = 0;
    var mouseY = 0;
    var enableResizing = true;
    var curTout;
    var otherWindow;
    var windowChild;
    var isLaserMouse = false;
    var menuul = null;
    var moduleScriptLoader;
    var sections = [];
    var sync = false;
    var globalSettings = defaultSettings;
    var slideSettings = [];
    var readyFuncs = { parse : [], script : [], finish : [], modulesLoaded : [] };  // callbacks to run when DOM is ready

    /* ---------------------------- API methods ----------------------------------- */

    /** Sets whether the presentation is synchronized between windows. */
    _ws.setSync = function(boolval) {
        sync = boolval;
    };

    /** Set the modules to load with the presentation.
        @param mods An array of strings that specity the modules. */
    // FIXME integrate in config.setGlobal
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

    _ws.getSections = function(noSubsections) {
        if (typeof noSubsections !== 'undefined' && noSubsections === true) {
            var nosubs = [];
            for (var i = 0; i < sections.length; ++i) {
                if (sections[i].type === 'section') {
                    nosubs.push(sections[i]);
                }
            }
            return nosubs;
        }
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

    /** Executes the given function when the document and all the modules are loaded. */
    _ws.ready = function(func) {
        if (loaded === false) {
            readyFuncs.modulesLoaded.push(func);
        }
        else {
            func();
        }
    };

    // XXX it is possible that a config.* function is called in only one window due to user interaction

    /** When called in a slide div, set the settings for the current slide when the
        document is ready.*/
    _ws.config.setCurrent = function(settings) {
        var scripts = document.getElementsByTagName('script');
        var cur = scripts[scripts.length - 1];

        readyFuncs.script.push(function() {
            var si = getSlideIndexOfElement(cur);
            if (si !== null) {
                setConfig(i, settings);
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
            globalSettings = mergeObjects(globalSettings, settings);
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
        if (slides[slideNumber].overlayIndex < slides[slideNumber].overlayCount) {
            gotoOverlay(slides[slideNumber].overlayIndex + 1);
        }
        else  {
            _ws.gotoSlide(slideNumber + 1);
        }
    };

    /** Go to the previous slide. */
    _ws.gotoPrevious = function() {
        if (slides[slideNumber].overlayIndex > 1) {
            gotoOverlay(slides[slideNumber].overlayIndex - 1);
        }
        else {
            _ws.gotoSlide(slideNumber - 1);
        }
    };

    _ws.module = {
        loadScript : function(filename, onload) {
            moduleScriptLoader.appendScript(filename, onload);
        },
        getConfig : function(modname) {
            if (typeof globalSettings[modname] === 'undefined') {
                return { };
            }
            return globalSettings[modname];
        },
        loadCSS : function(filename) {
            var links = document.getElementsByTagName('link');
            for (var i = 0; i < links.length; ++i) {
                if (links[i].getAttribute('href') === filename) {
                    return;
                }
            }
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = filename;
            document.head.appendChild(link);
        }
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

        for (var i = 0; i < subbing; ++i) {
            html += '</ul>';
        }

        return html;
    };

    _ws.setLaserMouse = function(on) {
        isLaserMouse = (on === true);
        document.body.style.cursor = (isLaserMouse ? 'crosshair' : 'default');
    };

    /* ----------------------------- Slide Setup ---------------------------------- */

    function setup() {
        _ws.module.loadCSS('framework/main.css');

        readyFuncs.parse = [parseDom, defaultConfig, parseSections, parseOverlays];
        readyFuncs.finish = [init];
        onready();

        document.onkeydown = keyDown;
        document.onmousemove = mouseMove;
        document.onclick = mouseClick;

        window.onload = function() {
            mozShadowFix(document.body);
        };
    }

    function parseDom() {
        var children = document.body.getElementsByTagName('div');
        var index = 0;
        for (var i = 0; i < children.length; i++) {
            if (children[i].parentNode !== document.body) {
                continue;
            }
            var tmpslide = new Slide();
            if (children[i].className === '') {
                children[i].className = 'slide';
            }
            else {
                children[i].className += ' slide';
            }

            var repeat = children[i].getAttribute('data-repeat');
            if (repeat !== null) {
                var ref = document.getElementById(repeat);
                if (ref !== null && ref.tagName === 'DIV' && ref.parentNode === document.body) {
                    children[i].innerHTML = ref.innerHTML + children[i].innerHTML;
                }
            }

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

    function createSlides() {
        for (var i = 0; i < slides.length; ++i) {
            var dim = slides[i].settings.pageDimensions;
            slides[i].div.style.width = dim[0] + 'px';

            // consider the slide padding
            slides[i].div.style.width = dim[0] - (slides[i].div.clientWidth - dim[0]) + 'px';
            slides[i].div.style.height = dim[1] + 'px';
            slides[i].div.style.visibility = 'hidden';

            var themeCallback = slides[i].settings.setupSlide;
            if (typeof themeCallback === 'function') {
                themeCallback(slides[i]);
            }
        }

        slideNumber = 0;
        if (window.opener !== null) {
            otherWindow = window.opener;
            _ws.setSync(true);
        }
        if (window.location.search === '?console') {
            _ws.gotoSlide = function(num) {
                console.gotoSlide(num);
                gotoOverlay(1);
            };
            console.guiLayout();
            window.onresize = console.resize;
        }
        else {
            _ws.gotoSlide = function(num) {
                view.gotoSlide(num);
                gotoOverlay(1);
            }
            window.onresize = view.resize;
        }

        var slidenum = readCookie('slide');
        if (slidenum === null) {
            slidenum = 0;
        }
        _ws.gotoSlide(slidenum);
    };

    var ScriptLoader = function() {
        var _sl = { };
        var scriptlist = [];
        var loadedCount = 0;
        var loading = false;

        _sl.onload = function() { };

        _sl.appendScript = function(filename, onload) {
            if (loading) {
                throw 'The load function was already called.';
            }
            var js = document.createElement('script');
            js.type = 'text/javascript';
            js.src = filename;
            if (typeof onload !== 'undefined') {
                js.addEventListener('load', onload, false);
            }
            js.addEventListener('load', onScriptLoad, false);
            scriptlist.push(js);
        };

        _sl.load = function() {
            loading = true;
            if (scriptlist.length === 0) {
                _sl.onload();
                return;
            }
            for (var i = 0; i < scriptlist.length; ++i) {
                document.head.appendChild(scriptlist[i]);
            }
        };

        function onScriptLoad() {
            if (++loadedCount === scriptlist.length) {
                _sl.onload();
            }
        }

        return _sl;
    };

    function init() {
        document.body.style.backgroundColor = globalSettings.outerColor;
        var themeDict = [];

        for (var i = 0; i < slides.length; ++i) {
            if (typeof slides[i].settings.css !== 'undefined') {
                var css = slides[i].settings.css;
                for (var k = 0; k < css.length; ++k) {
                    if (themeDict.indexOf(css[k]) === -1) {
                        themeDict.push(css[k]);
                    }
                }
            }
        }

        for (var i = 0; i < themeDict.length; ++i) {
            _ws.module.loadCSS('framework/' + themeDict[i] + '.css');
        }

        moduleScriptLoader = ScriptLoader();
        moduleScriptLoader.onload = function () {
            modulesLoaded();
            createSlides();
            loaded = true;
        };
        var loader = ScriptLoader();
        loader.onload = function() {
            moduleScriptLoader.load();
        };
        for (var i = 0; i < modules.length; ++i) {
            loader.appendScript('framework/module.' + modules[i] + '.js');
        }
        loader.load();
    }

    function modulesLoaded() {
        for (var i = 0; i < readyFuncs.modulesLoaded.length; ++i) {
            readyFuncs.modulesLoaded[i]();
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

    function logger(text) {
        if (console.log) {
            console.log(text);
        }
    }

    /******************************* Overlays ********************************/

    function parseOverlayData(data) {
        var split = data.split('|');
        if (split.length === 0) {
            return;
        }
        var selectedFrames = parseSelector(split[0]);
        var style = (split.length > 1 ? parseOverlayStyle(split[1]) : { classList : [], inline : [] });
        var notstyle = (split.length > 2 ? parseOverlayStyle(split[2]) : { classList : [], inline : [] });
        if (split.length < 2) {
            notstyle = { classList : ['hide'], inline : [] };
        }

        return { frames : selectedFrames, style : style, notstyle : notstyle };
    }

    function applyOverlayStyle(elem, style, remove) {
        if (remove === true) {
            var classes = elem.className.split(' ');

            for (var i = 0; i < classes.length; ++i) {
                classes[i] = classes[i].trim();
            }

            for (var i = 0; i < style.classList.length; ++i) {
                var index = classes.indexOf(style.classList[i]);
                while (index !== -1) {
                    classes[index] = '';
                    index = classes.indexOf(style.classList[i], index + 1);
                }
            }

            elem.className = classes.join(' ').trim();
            var oldstyle = elem.getAttribute('data-oldstyle');
            if (oldstyle !== null) {
                elem.setAttribute('style', oldstyle);
            }
        }
        else {
            elem.className += ' ' + style.classList.join(' ');
            if (style.inline.length === 0) {
                return;
            }
            var theStyle = elem.getAttribute('style');
            if (theStyle === null) {
                theStyle = '';
            }
            elem.setAttribute('data-oldstyle', theStyle);
            theStyle = [theStyle];
            theStyle.push(style.inline);
            theStyle = theStyle.join(';').replace(';;', ';');
            elem.setAttribute('style', theStyle);
        }
    }

    function getSlideIndexOfElement(element) {
        var rootDiv = element.parentNode;
        while (rootDiv.parentNode !== document.body) {
            rootDiv = rootDiv.parentNode;
        }
        for (var i = 0; i < slides.length; ++i) {
            if (slides[i].div === rootDiv) {
                return i;
            }
        }
        return null;
    }

    function parseSelector(str) {
        str = str.split(' ').join();

        var frames = [];
        var explist = str.split(',');
        for (var i = 0; i < explist.length; ++i) {
            var selector = parseSelectorExp(explist[i]);
            if (selector === null) {
                logger('Invalid selector.');
                continue;
            }
            for (var k = 0; k < selector.length; ++k) {
                frames.push(selector[k]);
            }
        }

        // TODO optimize frames list, e. g. if items are redundant
        // or include another one

        return frames;
    }

    function parseOverlayStyle(str) {
        var inline = [];
        var cssIndex = str.indexOf('css(');
        // FIXME inline css may contain brackets in strings or url
        while (cssIndex !== -1) {
            var end = str.indexOf(')', cssIndex);
            inline = str.substring(cssIndex + 4, end);
            str = str.substr(0, cssIndex) + str.substr(end + 1);
            cssIndex = str.indexOf('css(', cssIndex + 1);
        }
        var classList = str.split(' ');
        return { classList : classList, inline : inline };
    }

    function parseSelectorExp(str) {
        var from, to, minusIndex, plusIndex;

        if (str[0] === '-') {
            from = 0;
            to = str.substr(1);
        }
        else if (str[str.length - 1] === '-') {
            from = str.substr(0, str.length - 2);
            to = -1;
        }
        else if ((minusIndex = str.indexOf('-')) !== -1) {
            from = str.substr(0, minusIndex);
            to = str.substr(minusIndex + 1);
        }
        else if ((plusIndex = str.indexOf('+')) !== -1) {
            from = str.substr(0, plusIndex);
            to = str.substr(plusIndex + 1);
        }
        else {
            from = to = str;
        }

        var fromInt = parseInt(from);
        var toInt = parseInt(to);
        if (fromInt.toString() !== from.toString() || toInt.toString() !== to.toString()) {
            return null;
        }
        if (typeof plusIndex !== 'undefined' && plusIndex !== -1) {
            return [[0, fromInt], [toInt, -1]];
        }

        return [[fromInt, toInt]];
    }

    function gotoOverlay(overlayIndex) {
        var slide = slides[slideNumber];
        if (overlayIndex < 1 || overlayIndex > slide.overlayCount) {
            return;
        }

        for (var i = 0; i < slide.cssOverlays.length; ++i) {
            var ol = slide.cssOverlays[i];
            var firstmatch = false;
            for (var k = 0; k < ol.frames.length; ++k) {
                if (overlayIndex === ol.frames[k][0]) {
                    firstmatch = true;
                    applyOverlayStyle(ol.element, ol.notstyle, true);
                    applyOverlayStyle(ol.element, ol.style, false);
                }
                else if (overlayIndex === ol.frames[k][1] + 1 || overlayIndex === ol.frames[k][1] - 1) {
                    applyOverlayStyle(ol.element, ol.style, true);
                    applyOverlayStyle(ol.element, ol.notstyle, false);
                }
            }

            if (! firstmatch && overlayIndex === 1) {
                applyOverlayStyle(ol.element, ol.style, true);
                applyOverlayStyle(ol.element, ol.notstyle, false);
            }
        }

        for (var i = 0; i < slide.jsOverlays.length; ++i) {
            var ol = slide.jsOverlays[i];
            for (var k = 0; k < ol.frames.length; ++k) {
                if (overlayIndex === ol.frames[k][0]) {
                    ol.enterCallback();
                }
                else if (overlayIndex === ol.frames[k][1] + 1) {
                    ol.leaveCallback();
                }
                else {
                    ol.stepCallback();
                }
            }
        }
        slide.overlayIndex = overlayIndex;
    }

    /** Set the overlay action to javascript callbacks.
        @param selector The frames selector.
        @param enterfunc A callback that is executed when any of the selected frames becomes active.
        @param leavefunc A callback that is executed when no frame is selected anymore.
        @param stepfunc A callback that is executed when the frame changes, but stays selected by selector.
    */
    _ws.setOverlay = function(si, selector, enterfunc, leavefunc, stepfunc) {
        if (si === null) {
            logger('Cannot get the parent slide.');
            return;
        }
        var frames = parseSelector(selector);
        if (frames === null) {
            logger('Invalid frame selector.');
            return;
        }
        if (enterfunc === null) {
            enterfunc = function() { };
        }
        if (typeof leavefunc === 'undefined' || leavefunc === null) {
            leavefunc = function() { };
        }
        if (typeof stepfunc === 'undefined' || stepfunc === null) {
            stepfunc = function() { };
        }
        var entry = {
            frames : frames,
            enterCallback : enterfunc,
            leaveCallback : leavefunc,
            stepCallback : stepfunc
        };
        slides[si].jsOverlays.push(entry);
        updateOverlayCount(si);
    };

    function updateOverlayCount(index) {
        var overlays = slides[index].cssOverlays;
        overlays = overlays.concat(slides[index].jsOverlays);
        var maxIndex = 0;
        for (var i = 0; i < overlays.length; ++i) {
            for (var k = 0; k < overlays[i].frames.length; ++k) {
                var tmpframe = overlays[i].frames[k];
                if (tmpframe[0] > maxIndex) {
                    maxIndex = tmpframe[0];
                }
                if (tmpframe[1] > maxIndex) {
                    maxIndex = tmpframe[1];
                }
            }
        }
        slides[index].overlayCount = maxIndex;
    }

    function parseOverlays() {
        for (var i = 0; i < slides.length; ++i) {
            var elems = slides[i].div.querySelectorAll('*');
            for (var k = 0; k < elems.length; ++k) {
                var over = elems[k].getAttribute('data-over');
                if (over === null) {
                    continue;
                }
                var parsed = parseOverlayData(over);
                parsed.element = elems[k];
                slides[i].cssOverlays.push(parsed);
            }
            updateOverlayCount(i);
        }
    }

    /****************************** End Overlays *******************************/

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
        window.addEventListener('DOMContentLoaded', cb, false);
    }

    /* ---------------------------------------------------------------------------- */

    function setCookie(name, value) {
        // expires after one day
        var expires = new Date((new Date()).getTime() + 86400000);
        document.cookie = name.toString() + '=' + value.toString() + '; expires=' + expires.toGMTString();
    }

    function readCookie(name) {
        var items = document.cookie.split(';');
        for (var i = 0; i < items.length; ++i) {
            var eq = items[i].indexOf('=');
            if (eq === -1) {
                continue;
            }
            else if (items[i].substr(0, eq).trim() === name) {
                return items[i].substr(eq + 1).trim();
            }
        }
        return null;
    }

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

    /* Workaround for a firefox bug that creates lines around blocks when scale and box-shadow are applied.
       A div with the same position and size (minus 1 px border) is laid under the actual element and the
       shadow is applied to the div instead of the overlying element. */
    function mozShadowElement(elem) {
        if (elem.className === 'mozfix') {
            return;
        }
        var computed = window.getComputedStyle(elem, null);
        if (computed.getPropertyValue('position') === 'absolute') {
            return;
        }
        var shadowid = elem.getAttribute('data-shadowid');
        if (computed.getPropertyValue('box-shadow') == 'none' && shadowid === null) {
            return;
        }

        var absdiv;
        if (shadowid !== null) {
            absdiv = document.getElementById(shadowid);
        }
        if (shadowid === null) {
            absdiv = document.createElement('div');
            absdiv.className = 'mozfix';
        }

        var cssLength = function(prop) {
            return parseInt(computed.getPropertyValue(prop));
        };

        var dir = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        for (var i = 0; i < dir.length; ++i) {
            var prop = 'border-' + dir[i] + '-radius';
            var radius = computed.getPropertyValue(prop);
            if (radius !== '0px') {
                absdiv.style.setProperty(prop, radius, null);
            }
        }

        var paddingRight = parseInt(computed.getPropertyValue('padding-right'));

        absdiv.style.marginTop = cssLength('margin-top') + 1 + 'px';
        absdiv.style.marginLeft = cssLength('margin-left') + 1 + 'px';

        absdiv.style.height = cssLength('height') + cssLength('padding-top') + cssLength('padding-bottom') - 2 + 'px';
        absdiv.style.width = cssLength('width') + cssLength('padding-left') + cssLength('padding-right') - 2 + 'px';

        absdiv.style.zIndex = computed.getPropertyValue('z-index');

        // the underlying div is inset by 1 px, so increase the shadow offset by 1 px
        var add1px = function(boxshadow) {
            var split = boxshadow.split(' ');
            if (split.length < 3) {
                return;
            }
            split[split.length - 1] = parseInt(split[split.length - 1]) + 1 + 'px';
            return split.join(' ');
        };

        if (shadowid === null) {
            absdiv.style.boxShadow = add1px(computed.getPropertyValue('box-shadow'));
            elem.style.boxShadow = 'none';
            absdiv.id = 'mozfix' + Math.floor(Math.random() * 10000000000); // TODO make it really unique
            elem.setAttribute('data-shadowid', absdiv.id);
            elem.parentNode.insertBefore(absdiv, elem);
        }
        else if (computed.getPropertyValue('box-shadow') !== 'none') {
            absdiv.style.boxShadow = add1px(computed.getPropertyValue('box-shadow'));
        }
    }

    function mozShadowFix(rootNode) {
        if (navigator.userAgent.indexOf('Firefox') === -1) {
            return;
        }

        var all = rootNode.querySelectorAll('*');
        for (var i = 0; i < all.length; ++i) {
            mozShadowElement(all[i]);
        }
    }

    function showSlide(number) {
        slides[number].div.style.visibility = '';
    }

    function hideSlide(number) {
        slides[number].div.style.visibility = 'hidden';
    }

    /** Merges multiple settings array. A setting can be overwritten by an
        element that appears later in the parameter list.*/
    function mergeObjects() {
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
                    result[key] = mergeObjects.apply(null, subargs);
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
        var merged = mergeObjects(globalSettings, settings);
        slides[index].settings = merged;
    }

    function Slide() {
        var _slide = { };

        _slide.div = null;

        _slide.settings = null;

        _slide.cssOverlays = [];

        _slide.jsOverlays = [];

        _slide.overlayIndex = 1;

        _slide.overlayCount = 0;

        return _slide;
    }

    /* ------------------------- User interaction --------------------------------- */

    /* Hide context menu if visible. */
    function mouseClick(args) {
        if (menuul === null) {
            return;
        }
        var parentNode = args.target;
        while (parentNode !== document.body) {
            if (parentNode === menuul) {
                return;
            }
            parentNode = parentNode.parentNode;
        }
        document.body.removeChild(menuul);
        menuul = null;
    }

    /* For cursor hiding. */
    function mouseMove(args) {
        if (typeof slides[slideNumber] === 'undefined') {
            // do not fill the error console with trash
            return;
        }

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
        if (isLaserMouse === false) {
            if (mouseX !== newX || mouseY !== newY) {
                 document.body.style.cursor = 'auto';
            }

            curTout = setTimeout(function() { document.body.style.cursor = 'none'; },
                slides[slideNumber].settings.cursorHideTimeout);
        }
        mouseX = newX;
        mouseY = newY;
    }

    function keyDown(ev) {
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
            ['Console',  true, function() { openNewWindow(); contextMenu(false); }],
            ['Laser mouse (' + (isLaserMouse ? 'on)' : 'off)'), true, function() {
                _ws.setLaserMouse(!isLaserMouse);
                this.innerHTML = (isLaserMouse ? 'Laser mouse (on)' : 'Laser mouse (off)');
            }],
            ['Go to',  true, function() { }],
            'opensubmenu'
        ];

        var gotofunc = function() { _ws.gotoSlide(this.firstChild.value - 1); };
        for (var i = 0; i < slides.length; ++i) {
            var title = (i + 1).toString();
            var h1arr = slides[i].div.getElementsByTagName('h1');
            if (h1arr.length > 0) {
                title += '&nbsp;' + h1arr[0].innerHTML;
            }
            menuEntries.push(['<input type="hidden" value="' + (i + 1) + '"/>' + title, i !== slideNumber, gotofunc]);
        }

        menuEntries.push('closesubmenu');

        menuul = document.createElement('ul');
        menuul.className = 'menuul';
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

    function fillMenuUl(ul, menuEntries, start) {
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
                li.className = 'menuarrow';
                fillMenuUl(subul, menuEntries, cnt + 1);
            }
            li.className += menuEntries[cnt][1] === true ? '' : 'inactli';
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
        _view.gotoSlide = function(num) {
            syncWindow('gotoSlide', arguments);

            num = parseInt(num);

            if (num < 0) {
                num = 0;
            }
            else if (num >= slides.length) {
                num = slides.length - 1;
            }

            var oldsn = slideNumber;
            slideNumber = num;

            // resize before showing the slide, else
            // it can look blurry at first
            _view.resize();
            if (oldsn === num) {
                showSlide(num);
            }
            else {
                hideSlide(oldsn);
                showSlide(num);
            }

            setCookie('slide', num);
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
            var marginTop = (scale - 1) * pageheight / 2;

            slides[slideNumber].div.style.WebkitTransform = 'scale(' + scale + ')';
            slides[slideNumber].div.style.MozTransform = 'scale(' + scale + ')';
            slides[slideNumber].div.style.marginTop = marginTop + 'px';
            slides[slideNumber].div.style.marginLeft =  (width - pagewidth) / 2 + 'px';
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
            setCookie('slide', num);
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
