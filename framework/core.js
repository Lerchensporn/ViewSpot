var vs = (function() {

    'use strict';

    var _vs = { config : {} };
    var defaultSettings = {
        format : [1024, 768],
        outerColor : 'black',
        cursorHideTimeout : 1000,
        modules : []
    };
    var views;
    var slides = [];
    var slideNumber;
    var loaded = false;
    var mouseX = 0;
    var mouseY = 0;
    var curTout;
    var darken = false;
    var lighten = false;
    var otherWindow;
    var isLaserMouse = false;
    var moduleScriptLoader;
    var sections = [];
    var currentView;
    var sync = false;
    var globalSettings = defaultSettings;
    var slideSettings = [];
    var readyFuncs = { script : [], modulesLoaded : [] };

    /* ---------------------------- API methods ----------------------------------- */

    /** Sets whether the presentation is synchronized between windows. */
    _vs.setSync = function(boolval) {
        sync = boolval;
    };

    /** Get the current slide. */
    _vs.getCurrentSlide = function() {
        return slides[slideNumber];
    };

    /** Get all slides of the presentation.. */
    _vs.getSlides = function() {
        return slides;
    };

    _vs.getSections = function(noSubsections) {
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
    _vs.tableOfContents = function() {
        var scripts = document.getElementsByTagName('script');
        var current = scripts[scripts.length - 1];

        readyFuncs.script.push(function() {
            var toc = document.createElement('ul');
            toc.innerHTML = _vs.getTocMarkup();
            current.parentNode.insertBefore(toc, current);
        });
    };

    function switchView(view) {
        if (typeof currentView !== 'undefined') {
            currentView.unload();
        }
        view.load();
        currentView = view;
        _vs.gotoSlide(slideNumber);

        /* Resize with a 50 ms delay which needs less ressources and looks better. */
        var resizeTimeout;
        window.onresize = function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(function() {
                currentView.resize();
            }, 50);
        }

        setCookie('view', views.indexOf(view));
    }

    /** Executes the given function when the document and all the modules are loaded. */
    _vs.ready = function(func) {
        if (loaded === false) {
            readyFuncs.modulesLoaded.push(func);
        }
        else {
            func();
        }
    };

    /** When called in a slide div, set the settings for the current slide when the
        document is ready.*/
    _vs.config.setCurrent = function(settings) {
        var scripts = document.getElementsByTagName('script');
        var cur = scripts[scripts.length - 1];

        readyFuncs.script.push(function() {
            var si = getSlideIndexOfElement(cur);
            if (si !== null) {
                setConfig(si, settings);
            }
        });
    };

    /** Sets the settings for each slide that has the specified class name
        when the document is ready. */
    _vs.config.setForClass = function(className, settings) {
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
    _vs.config.setGlobal = function(settings) {
        readyFuncs.script.push(function() {
            globalSettings = mergeObjects(globalSettings, settings);
            for (var i = 0; i < slides.length; ++i) {
                setConfig(i, slideSettings[i]);
            }
        });
    };

    /** Sets the slide settings for the slide with number `index`. */
    _vs.config.setForSlide = function(index, settings) {
        readyFuncs.script.push(function() { setConfig(index - 1, settings); });
    };

    /** Switch to another slide.
     * @param num The index of the slide to go to.
     * @param effect Function callback Sliding effect */
    _vs.gotoSlide = function(num) {
        syncWindow('gotoSlide', arguments);

        num = parseInt(num);
        if (num < 0 || num > slides.length - 1) {
            return;
        }
        currentView.gotoSlide(num);
        _vs.gotoOverlay(1);
        slideNumber = num;
        setCookie('slide', num);
    };

    /** Go to the next slide. */
    _vs.gotoNext = function() {
        if (slides[slideNumber].overlayIndex < slides[slideNumber].overlayCount) {
            _vs.gotoOverlay(slides[slideNumber].overlayIndex + 1);
        }
        else  {
            _vs.gotoSlide(slideNumber + 1);
        }
    };

    /** Go to the previous slide. */
    _vs.gotoPrevious = function() {
        if (slides[slideNumber].overlayIndex > 1) {
            _vs.gotoOverlay(slides[slideNumber].overlayIndex - 1);
        }
        else {
            _vs.gotoSlide(slideNumber - 1);
        }
    };

    _vs.module = {
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
            moduleScriptLoader.appendCSS(filename);
        }
    };

    _vs.getTocMarkup = function() {
        // if a subsection has no parent section, it is treated as a section
        var html = '';
        var subbing = 0;

        var ahref = function() { return '<li><span class="link" onclick="javascript:vs.gotoSlide(' +  index + ');">'; };
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

    _vs.setLaserMouse = function(on) {
        isLaserMouse = on;

        // firefox bug: cursor url cannot be set using javascript => use css class
        if (isLaserMouse) {
            document.body.style.cursor = '';
            document.body.className = 'cursorpointer';
        }
        else {
            document.body.className = '';
            mouseMove({ });
        }
    };

    _vs.showMessage = function(message, hide) {
        if (typeof hide === 'undefined') {
            hide = true;
        }

        var timeout = null;

        var setHideTimeout = function() {
            timeout = setTimeout(function() {
                msgdiv.className = 'mboxhide';
            }, 1000);
        };

        var msgdiv = document.getElementById('messagebox');
        if (msgdiv === null) {
            msgdiv = document.createElement('div');
            msgdiv.id = 'messagebox';
            document.body.appendChild(msgdiv);

            if (hide === true) {
                msgdiv.addEventListener('mouseover', function() {
                    msgdiv.className = 'messagebox';
                    clearInterval(timeout);
                }, false);
                msgdiv.addEventListener('mouseleave', function() {
                    setHideTimeout();
                }, false);
            }
        }
        msgdiv.className = '';
        msgdiv.innerHTML = message;

        if (hide === true) {
            setHideTimeout();
        }
    };

    /* ----------------------------- Slide Setup ---------------------------------- */

    function setup() {
        views = [normalView, consoleNotes, consolePreview, sorter];
        onready();

        document.addEventListener('keydown', keyDown, false);
        document.addEventListener('mousemove', mouseMove, false);

        window.onunload = function() {
            if (typeof otherWindow !== 'undefined') {
                otherWindow.vs.showMessage.apply(otherWindow, ['The other window was closed.']);
            }
        };

        window.onload = function() {
            mozShadowFix(document.body);
        };
    }

    function parseDom() {
        var children = document.body.getElementsByTagName('div');
        var index = 0;
        for (var i = 0; i < children.length; ++i) {
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
        document.body.style.backgroundColor = globalSettings.outerColor;

        for (var i = 0; i < slides.length; ++i) {
            if (typeof slides[i].settings.defaultClass !== 'undefined') {
                slides[i].div.className += ' ' + slides[i].settings.defaultClass;
            }
        }

        for (var i = 0; i < slides.length; ++i) {
            var dim = slides[i].settings.format;
            var computed = document.defaultView.getComputedStyle(slides[i].div, null);
            var paddingLeft = parseInt(computed.getPropertyValue('padding-left'));
            var paddingRight = parseInt(computed.getPropertyValue('padding-right'));

            // consider the slide padding
            slides[i].div.style.width = dim[0] - paddingLeft - paddingRight + 'px';
            slides[i].div.style.height = dim[1] + 'px';

            var themeCallback = slides[i].settings.setupSlide;
            if (typeof themeCallback === 'function') {
                themeCallback(slides[i]);
            }
        }

        slideNumber = 0;
        if (window.opener !== null) {
            otherWindow = window.opener;
            _vs.setSync(true);
        }

        var viewIndex = parseInt(readCookie('view'));
        if (viewIndex < 0 || viewIndex > views.length || isNaN(viewIndex)) {
            viewIndex = 0;
        }

        slideNumber = parseInt(readCookie('slide'));
        if (isNaN(slideNumber)) {
            slideNumber = 0;
        }
        switchView(views[viewIndex]);
    }

    var ScriptLoader = function() {
        var _sl = { };
        var scriptlist = [];
        var csslist = [];
        var loadedCount = 0;

        _sl.onload = function() { };

        _sl.appendScript = function(filename, onload) {
            if (fileExists(filename) === false) {
                _vs.showMessage('The script file »' + filename + '« does not exist.');
                return;
            }
            var js = document.createElement('script');
            js.type = 'text/javascript';
            js.async = false;
            js.src = filename;
            if (typeof onload !== 'undefined') {
                js.addEventListener('load', onload, false);
            }
            js.addEventListener('load', onElementLoad, false);
            scriptlist.push(js);
        };

        _sl.appendCSS = function(filename) {
            if (fileExists(filename) === false) {
                _vs.showMessage('The css file »' + filename + '« does not exist.');
                return;
            }
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = filename;

            csslist.push(link);
        };

        _sl.load = function() {
            if (scriptlist.length === 0 && csslist.length === 0) {
                _sl.onload();
                return;
            }

            for (var i = 0; i < scriptlist.length; ++i) {
                document.head.appendChild(scriptlist[i]);
            }

            for (var i = 0; i < csslist.length; ++i) {
                document.head.appendChild(csslist[i]);
            }
        };

        function onElementLoad() {
            if (++loadedCount === scriptlist.length) {
                _sl.onload();
            }
        }

        return _sl;
    };

    function loadModules() {
        moduleScriptLoader = ScriptLoader();
        moduleScriptLoader.onload = function () {
            modulesLoaded();
            loaded = true;
        };
        var loader = ScriptLoader();
        loader.onload = function() {
            moduleScriptLoader.load();
        };
        for (var i = 0; i < globalSettings.modules.length; ++i) {
            loader.appendScript('framework/module.' + globalSettings.modules[i] + '.js');
        }
        loader.load();
    }

    function modulesLoaded() {
        for (var i = 0; i < readyFuncs.modulesLoaded.length; ++i) {
            readyFuncs.modulesLoaded[i]();
        }
    }

    function fileExists(filename) {
        if (navigator.userAgent.indexOf('AppleWebKit') !== -1) {
            // Chromium does not support local ajax.
            return true;
        }

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.overrideMimeType('text/plain');
        xmlhttp.open('GET', filename, false);
        try {
            xmlhttp.send(null);
            return true;
        }
        catch (e) {
            return false;
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

            for (i = 0; i < style.classList.length; ++i) {
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

    _vs.gotoOverlay = function(overlayIndex) {
        syncWindow('gotoOverlay', arguments);

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
                    ol.stepCallback(overlayIndex);
                }
            }
        }
        slide.overlayIndex = overlayIndex;
    };

    /** Set the overlay action to javascript callbacks.
        @param selector The frames selector.
        @param enterfunc A callback that is executed when any of the selected frames becomes active.
        @param leavefunc A callback that is executed when no frame is selected anymore.
        @param stepfunc A callback that is executed when the frame changes, but stays selected by selector.
    */
    _vs.setOverlay = function(si, selector, enterfunc, leavefunc, stepfunc) {
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
            parseDom();
            defaultConfig();
            parseSections();
            parseOverlays();

            for (var i = 0; i < readyFuncs.script.length; ++i) {
                readyFuncs.script[i]();
            }
            createSlides();
        };
        window.addEventListener('DOMContentLoaded', cb, false);
        window.addEventListener('load', loadModules, false);
    }

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
        if (otherWindow === undefined || otherWindow.vs === undefined) {
            sync = false;
            return;
        }

        otherWindow.vs.setSync(false);
        otherWindow.vs[func].apply(otherWindow.vs, args);
        otherWindow.vs.setSync(true);
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
        var boxshadow = computed.getPropertyValue('box-shadow');
        if (boxshadow === 'none' && shadowid === null) {
            return;
        }

        // the underlying div is inset by 1 px, so increase the shadow offset by 1 px
        var add1px = function(boxshadow) {
            var split = boxshadow.split(' ');
            if (split.length < 3) {
                return;
            }
            split[split.length - 1] = parseInt(split[split.length - 1]) + 1 + 'px';
            return split.join(' ');
        };

        var absdiv;
        if (shadowid !== null) {
            absdiv = document.getElementById(shadowid);
        }

        if (shadowid === null || absdiv === null) {
            var innershadow = [];
            var outershadow = [];
            var split = boxshadow.split(', rgb(');
            for (var i = 0; i < split.length; ++i) {
                if (i !== 0) {
                    split[i] = 'rgb(' + split[i];
                }
                if (split[i].lastIndexOf('inset') !== -1) {
                    innershadow.push(split[i]);
                }
                else {
                    outershadow.push(add1px(split[i]));
                }
            }
            innershadow = innershadow.join(',');
            outershadow = outershadow.join(',');

            if (outershadow.length === 0) {
                return;
            }

            absdiv = document.createElement('div');
            absdiv.className = 'mozfix';
            absdiv.id = 'mozfix' + mozShadowUnique();
            elem.setAttribute('data-shadowid', absdiv.id);
            elem.parentNode.insertBefore(absdiv, elem);

            absdiv.style.boxShadow = outershadow;
            elem.style.boxShadow = innershadow;
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
    }

    var mozShadowUnique = (function() {
        var i = 0;
        return function() {
            return ++i;
        };
    })();

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
        slides[number].div.style.visibility = 'visible';
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

    /* For cursor hiding. */
    function mouseMove(args) {
        if (typeof slides[slideNumber] === 'undefined') {
            // do not fill the error console with trash
            return;
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
                 document.body.style.cursor = '';
            }

            curTout = setTimeout(function() { document.body.style.cursor = 'none'; },
                slides[slideNumber].settings.cursorHideTimeout);
        }
        mouseX = newX;
        mouseY = newY;
    }

    function keyDown(ev) {
        if (ev.target === 'INPUT' || ev.target === 'TEXTAREA') {
            return;
        }

        switch (ev.keyCode) {
            case 32: // space
                contextMenu();
                break;
            case 67: // letter C
                openNewWindow();
                break;
            case 65: // letter A
                _vs.gotoSlide(0);
                break;
            case 90: // letter Z
                _vs.gotoSlide(slides.length - 1);
                break;
            case 39: // right
                if (ev.shiftKey) {
                    _vs.gotoSlide(slideNumber + 1);
                }
                else {
                    _vs.gotoNext();
                }
                break;
            case 37: // left
                if (ev.shiftKey) {
                    _vs.gotoSlide(slideNumber - 1);
                }
                else {
                    _vs.gotoPrevious();
                }
                break;
            case 76: // letter L
                _vs.setLaserMouse(!isLaserMouse);
                break;
            case 68: // letter D
                darkenLighten(false);
                break;
            case 72:  // letter H
                darkenLighten(true);
                break;
            case 87: // letter W
                var index = views.indexOf(currentView);
                index = (index === views.length - 1 ? 0 : index + 1);
                switchView(views[index]);
                break;
            case 81: // letter Q
                var index = views.indexOf(currentView);
                index = (index === 0 ? views.length - 1 : index - 1);
                switchView(views[index]);
                break;
            case 84:  // letter T
                timer.startStop();
                break;
        }

        // 33, 34, 35 = PageUp, PageDown, End key
        if ([32, 33, 34, 35, 37, 38, 39, 40].indexOf(ev.keyCode) !== -1) {
            ev.preventDefault();
        }
    }

    function darkenLighten(whiten) {
        if (currentView !== normalView) {
            return;
        }

        if ((darken || lighten) && whiten === lighten) {
            document.body.style.backgroundColor = globalSettings.outerColor;
            showSlide(slideNumber);
            darken = false;
            lighten = false;
        }
        else {
            document.body.style.backgroundColor = (whiten ? 'white' : globalSettings.outerColor);
            darken = (whiten === false);
            lighten = (whiten === true);
            hideSlide(slideNumber);
        }
    }

    /* ------------------------- End User interaction --------------------------------- */
    /**
     * Shows a context menu.
     * @param keepMenu Whether to keep an already existing menu and only adjust its position.
     */
    function contextMenu() {
        var menuul = document.getElementById('menuul');
        if (menuul !== null) {
            return;
        }

        menuul = document.createElement('ul');
        menuul.id = 'menuul';

        var menuEntries = [
            ['First', 'A'],
            ['Last', 'Z'],
            ['Presenter window', 'C'],
            ['Switch view', 'W'],
            ['Switch back view', 'Q'],
            ['Darken', 'D'],
            ['Lighten', 'H'],
            ['Next slide', 'shift ←'],
            ['Previous slide', 'shift →'],
            ['Laser mouse (' + (isLaserMouse ? 'on)' : 'off)'), 'L'],
            ['Clock', 'T'],
        ];

        var focused = -1;

        for (var i = 0; i < menuEntries.length; ++i) {
            var li = document.createElement('li');
            if (i === menuEntries.length - 1) {
                li.className = 'lastMenuLi';
            }
            li.innerHTML = '<span style="float:left">' + menuEntries[i][0] +
                           '</span><span class="menukey">' + menuEntries[i][1] + '</span><br style="clear:both" />';
            menuul.appendChild(li);
        }

        document.body.appendChild(menuul);
        window.addEventListener('keyup', function(args) {
            if (args.keyCode === 32) { // space
                document.body.removeChild(menuul);
            }
        }, false);
    }

    function openNewWindow() {
        var cleanup = function() {
            document.body.removeChild(popdiv);
            document.body.removeChild(darkdiv);
            document.body.style.opactity = '';
        };

        var darkdiv = document.createElement('div');
        darkdiv.id = 'darkdiv';
        darkdiv.onclick = cleanup;

        var popdiv = document.createElement('button');
        popdiv.innerHTML = 'Click to open a new window.<br/><span style="font-weight:normal"><small>Bypass the popup blocker.</small></span>';
        popdiv.id = 'popupdiv';
        popdiv.onclick = function() {
            otherWindow = window.open(window.location, 'Presentation Screen &ndash ' + document.title,
                'status=yes,menubar=yes,screenX=' + screen.availWidth / 2 +
                '*,screenY=0,height=' + screen.availHeight / 2 + ',width=' + screen.availWidth / 2);
            _vs.setSync(true);
            cleanup();
        };

        document.body.appendChild(darkdiv);
        document.body.appendChild(popdiv);
    }

    /* ------------------------------- Normal view -------------------------------- */

    var normalView = (function() {
        var _normalView = {};

        _normalView.load = function() {
            _normalView.resize();
        };

        _normalView.unload = function() { };

        _normalView.gotoSlide = function(num) {
            var oldsn = slideNumber;

            slideNumber = num;

            if (oldsn !== num) {
                hideSlide(oldsn);
            }
            showSlide(num);
        };

        _normalView.resize = function() {
            var height = document.body.clientHeight;
            var width = document.body.clientWidth;


            for (var i = 0; i < slides.length; ++i) {
                var pagewidth = slides[slideNumber].settings.format[0];
                var pageheight = slides[slideNumber].settings.format[1];

                var newWidth = Math.min(width / pagewidth, height / pageheight) * pagewidth;
                scaleSlide(slides[i], (width - newWidth) / 2, 0, newWidth);
            }
        };

        return _normalView;
    })();

    function scaleSlide(slide, x, y, newWidth) {
        var scale = newWidth / slide.settings.format[0];
        slide.div.style.WebkitTransform = 'scale(' + scale + ')';
        slide.div.style.MozTransform = 'scale(' + scale + ')';
        slide.div.style.marginTop = (scale - 1) * slide.settings.format[1] / 2 + y + 'px';
        slide.div.style.marginLeft = (scale - 1) * slide.settings.format[0] / 2 + x + 'px';
    }


    var timer = (function() {
        var _timer = { };
        var startTime = null;
        var runner = null;

        _timer.start = function() {
            if (runner !== null) {
                return;
            }
            startTime = new Date();
            clearInterval(runner);
            runner = setInterval(updateGui, 1000);
            updateGui();
        };

        _timer.stop = function() {
            if (runner === null) {
                return;
            }
            clearInterval(runner);
            runner = null;
            _vs.showMessage('Timer has been stopped.');
        };

        _timer.startStop = function() {
            if (runner === null) {
                _timer.start();
            }
            else {
                _timer.stop();
            }
        };

        function updateGui() {
            var now = new Date();
            var msg = pad2two(now.getHours()) + ':' + pad2two(now.getMinutes()) + ':' + pad2two(now.getSeconds());
            _vs.showMessage('<span style="font-size:12pt">' + msg + '</span>', false);
        }

        function pad2two(digit) {
            return (digit.toString().length === 1 ? '0' + digit.toString() : digit.toString());
        }

        return _timer;
    })();

    var sorter = (function() {
        var _sorter = { };
        var activeSlideIndex = 0;
        var colsPerRow = 3;
        var mouseActive;

        var boxes = [];

        function focusSlide(index) {
            blurSlide(activeSlideIndex);
            boxes[index].style.backgroundColor = 'orange';
            activeSlideIndex = index;

            var boxtop = parseInt(boxes[index].style.top);
            var yoff = boxtop + boxes[index].clientHeight - window.innerHeight;
            var scrolling = false;
            if (window.pageYOffset < yoff) {
                scrolling = true;
                window.scrollTo(0, yoff);
            }
            else if (window.pageYOffset > boxtop) {
                scrolling = true;
                window.scrollTo(0, boxtop);
            }

            if (mouseActive && scrolling) {
                deactivateMouse();
                setTimeout(function() { mouseActive = true; }, 0);
            }
        }

        function blurSlide(index) {
            boxes[index].style.backgroundColor = '';
        }

        function sorterKeyDown(args) {
            if (args.keyCode === 13) {
                slideNumber = activeSlideIndex;
                switchView(normalView);
                return;
            }
            else if (args.keyCode === 87 || args.keyCode === 81 || args.keyCode === 32) { // letter W || letter Q || space
                keyDown(args);
                return;
            }

            var newIndex = activeSlideIndex;
            switch (args.keyCode) {
                case 37: // left
                    --newIndex;
                    args.preventDefault();
                    break;
                case 38: // up
                    newIndex -= colsPerRow;
                    args.preventDefault();
                    break;
                case 39: // right
                    ++newIndex;
                    args.preventDefault();
                    break;
                case 40: // down
                    newIndex += colsPerRow;
                    args.preventDefault();
                    break;
                default: return;
            }

            if (newIndex < 0) {
                newIndex = 0;
            }
            else if (newIndex > slides.length - 1) {
                newIndex = slides.length - 1;
            }
            blurSlide(activeSlideIndex);
            focusSlide(newIndex);
            activeSlideIndex = newIndex;
        }

        function deactivateMouse() {
            mouseActive = false;
            document.addEventListener('mousemove', activateMouse);
        }

        function activateMouse() {
            mouseActive = true;
            document.removeEventListener('mousemove', activateMouse);
        }

        _sorter.load = function() {
            mouseActive = false;
            document.body.style.overflowY = 'scroll';
            for (var i = 0; i < slides.length; ++i) {
                boxes[i] = document.createElement('div');
                boxes[i].className = 'consolebox';
                document.body.appendChild(boxes[i]);
                slides[i].div.addEventListener('mouseover', (function(index) {
                    return function(args) {
                        args.preventDefault();
                        if (mouseActive) {
                            focusSlide(index);
                        }
                    };
                })(i), false);

                slides[i].div.addEventListener('mouseleave', (function(index) {
                    return function(args) {
                        args.preventDefault();
                        if (mouseActive) {
                            blurSlide(index);
                        }
                    };
                })(i), false);

                showSlide(i);
            }

            document.removeEventListener('keydown', keyDown);
            document.addEventListener('keydown', sorterKeyDown, false);
            deactivateMouse();
            focusSlide(slideNumber);

            _sorter.resize();
        };

        _sorter.unload = function() {
            for (var i = 0; i < slides.length; ++i) {
                hideSlide(i);
                document.body.removeChild(boxes[i]);
            }
            document.body.style.overflow = '';
            document.removeEventListener('keydown', sorterKeyDown);
            document.addEventListener('keydown', keyDown, false);
            window.scrollTo(0, 0);
        };

        _sorter.resize = function() {
            var padding = 15;
            var boxMargin = 7;
            var cellwidth = document.body.clientWidth / colsPerRow;
            for (var i = 0; i < slides.length; ++i) {
                var row = Math.floor(i / colsPerRow);
                var col = i % colsPerRow;
                var ratio = slides[i].settings.format[1] / slides[i].settings.format[0];
                var x = col * cellwidth + padding;
                var y = row * ratio * cellwidth + (row + 2) * padding / 2;
                var width = cellwidth - 2 * padding;
                scaleSlide(slides[i], x, y, width);

                boxes[i].style.left = x - boxMargin + 'px';
                boxes[i].style.top = y - boxMargin + 'px';
                boxes[i].style.width = width + 2 * boxMargin + 'px';
                boxes[i].style.height = ratio * width + 2 * boxMargin + 'px';
            }
        };

        _sorter.gotoSlide = function() { };

        return _sorter;
    })();

    var consoleNotes = (function() {
        var _notes = { };
        var notesdiv;
        var box;

        function notesKeyDown(args) {
            var delta = 200;
            if (args.keyCode === 40) { // down
                notesdiv.scrollTop = (notesdiv.scrollTop < notesdiv.scrollHeight + delta ? notesdiv.scrollTop + delta : notesdiv.scrollTop);
            }
            else if (args.keyCode === 38) { // up
                if (notesdiv.scrollTop > delta) {
                    notesdiv.scrollTop = notesdiv.scrollTop - delta;
                }
                else {
                    // 1 and 0 because of firefox bug
                    notesdiv.scrollTop = 1;
                    notesdiv.scrollTop = 0;
                }
            }
        }

        _notes.load = function() {
            notesdiv = document.createElement('div');
            notesdiv.id = 'notesdiv';
            notesdiv = document.body.appendChild(notesdiv);

            box = document.createElement('div');
            box.className = 'consolebox';
            document.body.appendChild(box);

            window.addEventListener('keydown', notesKeyDown, false);
            _notes.resize();
        };

        _notes.unload = function() {
            document.body.removeChild(notesdiv);
            document.body.removeChild(box);
            window.removeEventListener('keydown', notesKeyDown);
        };

        _notes.resize = function() {
            var boxMargin = 5;
            var sidesRatio = 0.45;
            var padding = 20;
            var leftWidth = document.body.clientWidth * sidesRatio;
            var rightWidth = document.body.clientWidth * (1 - sidesRatio);
            for (var i = 0; i < slides.length; ++i) {
                scaleSlide(slides[i], padding, padding, leftWidth);
            }

            box.style.left = padding - boxMargin + 'px';
            box.style.top = padding - boxMargin + 'px';
            box.style.width = leftWidth + 2 * boxMargin + 'px';
            var ratio = slides[slideNumber].settings.format[1] / slides[slideNumber].settings.format[0];
            box.style.height = ratio * leftWidth + 2 * boxMargin + 'px';

            notesdiv.style.left = leftWidth + 2 * padding + 'px';
            notesdiv.style.width = rightWidth - 4 * padding + 'px';
            notesdiv.style.top = padding - boxMargin + 'px';
            notesdiv.style.height = document.body.clientHeight - 3 * padding + 2 * boxMargin + 'px';
        };

        _notes.gotoSlide = function(num) {
            notesdiv.innerHTML = getNotes(slides[num]);
            hideSlide(slideNumber);
            showSlide(num);
            slideNumber = num;
        };

        function getNotes(slide) {
            var notes = slide.div.querySelectorAll('.notes');
            if (notes.length > 0) {
                return notes[0].innerHTML;
            }
            return '<span class="noNotes">This slide has no notes.</span>';
        }

        return _notes;
    })();

    var consolePreview = (function() {
        var _prev = { };
        var boxLarge;
        var boxSmall;

        _prev.resize = function() {
            /* It is not possible to resize all slides in one call,
               because the scale changes when navigating. In Firefox,
               the letters will dance in this view. */

            var boxMargin = 5;
            var sidesRadio = 3 / 5;
            var padding = 20;
            var leftWidth = document.body.clientWidth * sidesRadio - 2 * padding;
            var rightWidth = document.body.clientWidth * (1 - sidesRadio) - padding;
            scaleSlide(slides[slideNumber], padding, padding, leftWidth);
            boxLarge.style.left = padding - boxMargin + 'px';
            boxLarge.style.top = padding - boxMargin + 'px';
            boxLarge.style.width = leftWidth + 2 * boxMargin + 'px';
            var ratio = slides[slideNumber].settings.format[1] / slides[slideNumber].settings.format[0];
            boxLarge.style.height = ratio * leftWidth + 2 * boxMargin + 'px';

            if (slideNumber < slides.length - 1) {
                scaleSlide(slides[slideNumber + 1], leftWidth + 2 * padding, padding, rightWidth);
                boxSmall.style.visibility = 'visible';
                boxSmall.style.left = leftWidth + 2 * padding - boxMargin + 'px';
                boxSmall.style.top = padding - boxMargin + 'px';
                boxSmall.style.width = rightWidth + 2 * boxMargin + 'px';
                ratio = slides[slideNumber + 1].settings.format[1] / slides[slideNumber + 1].settings.format[0];
                boxSmall.style.height = ratio * rightWidth + 2 * boxMargin + 'px';
            }
            else {
                boxSmall.style.visibility = 'hidden';
            }
        };

        _prev.unload = function() {
            document.body.removeChild(boxLarge);
            document.body.removeChild(boxSmall);
            if (slideNumber < slides.length - 1) {
                hideSlide(slideNumber + 1);
            }
        }

        _prev.load = function() {
            boxLarge = document.createElement('div');
            boxLarge.className = 'consolebox';
            document.body.appendChild(boxLarge);

            boxSmall = document.createElement('div');
            boxSmall.className = 'consolebox';
            document.body.appendChild(boxSmall);
        }

        _prev.gotoSlide = function(num) {
            hideSlide(slideNumber);
            if (slideNumber < slides.length - 1) {
                hideSlide(slideNumber + 1);
            }

            slideNumber = num;
            _prev.resize(num);

            showSlide(num);
            if (num < slides.length - 1) {
                showSlide(num + 1);
            }
        };

        return _prev;
    })();

    setup();
    return _vs;
})();

vs.controls = function() {

    'use strict';

    var _controls = { };

    _controls.sidebar = function(slide) {
        var sidebardiv = document.createElement('div');
        sidebardiv.className = 'sidebar';
        if (typeof slide.settings.sidebar !== 'undefined' && slide.settings.sidebar.author !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.author + '</span>';
        }
        if (typeof slide.settings.sidebar !== 'undefined' && typeof slide.settings.sidebar.title !== 'undefined') {
            sidebardiv.innerHTML += '<span>' + layout.title + '</span>';
        }
        sidebardiv.innerHTML += '<ul>' + vs.getTocMarkup() + '</ul>';

        dockdiv(sidebardiv, slide, 'left');
    };

    _controls.footer = function(slide) {
        var footerdiv = document.createElement('div');
        footerdiv.className = 'footer';
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
        var sections = vs.getSections(true);
        var slideslist = vs.getSlides();
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

            html += '<span class="' + sectionClass + '" onclick="vs.gotoSlide(' + sections[i].slideIndex + ')">' + sections[i].title + '</span>';
            html += '<br/><svg xmlns="http://www.w3.org/2000/svg" version="1.1" height="12">';
            for (var circi = sections[i].slideIndex; circi < sectionEnd; ++circi) {
                var circleClass = (slide.index === slideslist[circi].index ? 'circleActive' : 'circleInactive');
                html += '<circle class="' + sectionClass + ' ' + circleClass +
                        '" onclick="vs.gotoSlide(' + slideslist[circi].index + ')" cx="' + (12*(circi - sections[i].slideIndex) + 6.5) + '" cy="5" r="4.5"/>';
            }
            html += '</svg>';
            html += '</td>';
        }
        minidiv.innerHTML = '<table style="table-layout:fixed;width:100%;padding-left:8px;padding-right:8px;padding-top:1px"><tr>' + html + '</tr></table>';

        dockdiv(minidiv, slide, 'top');
    };

    function dockdiv(div, slide, loc) {
        var padding = parseInt(document.defaultView.getComputedStyle(slide.div, null).getPropertyValue('padding-left'));
        div.style.marginLeft = - padding + 'px';
        div.style.marginRight = - padding + 'px';
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
