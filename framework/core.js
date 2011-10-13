// optional modules: mathjax, code highlighter

var defaultSettings = 
{
    pageDimensions : [1024, 768],
  //  transition : Sliding.slideAlpha,
    outerColor : 'black',
    layout : { footer : true }
};

if (!theme) {
    var theme = 'latex';
}

var readycbs = [];
var modules = ['mathjax', 'highlighter'];
var config = new Settings();
var instance = new WebSlider();


/*

settings: global, but locally changable
local settings (per slide)

settings: layout (colors ...)
          usage/keys
          frame size
          transition
          

animations

*/

/** Insert a callback before the last callback in the list. */
function insertReadyCallback(callback)
{
    readycbs[readycbs.length] = readycbs[readycbs.length - 1];
    readycbs[readycbs.length - 2] = callback; // -2 bcz length increased in line above
}

/** Append a callback to the list. */
function pushReadyCallback(callback)
{
    readycbs[readycbs.length] = callback;
}

/** Executes the callbacks in the readycbs array when the DOM is ready. */
function onready()
{
    var anoncb = function() {
        for (var i = 0; i < readycbs.length; ++i) {
            readycbs[i]();
        }
    };
    if (window.addEventListener) {
        // loads much faster if there are large pictures
        window.addEventListener('DOMContentLoaded', anoncb, false);
    }
    else {
        window.addEventListener('load', anoncb, false);
    }
}

function tableOfContents()
{
    var scripts = document.getElementsByTagName('script');
    var current = scripts[scripts.length-1];

    insertReadyCallback(function() {
        var toc = document.createElement('ul');
        toc.innerHTML = instance.getToc();
        current.parentNode.insertBefore(toc, current);
    });
}

function Settings()
{
    var self = this;

    self.slideSettings = [];

    self.globalSettings = defaultSettings;

    /** Sets the slide settings for the slide with number `index`. */
    self.setForSlide = function(index, settings)
    {
        insertReadyCallback(function() { self._setForSlide(index-1, settings); });
    };

    /** Merges multiple settings array. A setting can be overwritten by an
        element that appears later in the parameter list.*/
    function mergeArrays()
    {
        // slice to copy value instead of reference
        var result = Array(arguments[0]).slice();
        for (var i = 0; i < arguments.length; ++i) {
            for (var key in arguments[i]) {
                if (typeof arguments[i][key] == 'object' && key == 'layout') {
                    // recursion to ensure that all settings stay defined
                    var subargs = [];
                    for (var subi = 0; subi < arguments.length; ++subi) {
                        if (typeof arguments[subi][key] != 'undefined') {
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

    self._setForSlide = function(index, settings)
    {
        self.slideSettings[index] = settings;
        var merged = mergeArrays(self.globalSettings, settings);
        instance.slides[index].settings = merged;
    }

    /** Sets the settings for each slide that has the specified class name
        when the document is ready. */
    self.setForClass = function(className, settings)
    {
        insertReadyCallback(function() {
            for (var i = 0; i < instance.slides.length; ++i) {
                split = instance.slides[i].div.className.split(' ');
                if (split.indexOf(className) !== -1) {
                    self._setForSlide(i, settings);
                }
            }
        });
    };

    /** When called in a slide div, set the settings for the current slide when the
        document is ready.*/
    self.setCurrent = function(settings)
    {
        var scripts = document.getElementsByTagName('script');
        var cur = scripts[scripts.length - 1];
        var rootDiv = cur.parentNode;
        while (rootDiv.parentNode !== document.body) {
            rootDiv = rootDiv.parentNode;
        }

        insertReadyCallback(function() {
            for (var i = 0; i < instance.slides.length; ++i) {
                if (instance.slides[i].div == rootDiv) {
                    self._setForSlide(i, settings);
                }
            }
        });
    };

    /** Sets the global settings when the document is ready. */
    self.setGlobal = function(settings)
    {
        insertReadyCallback(function() {
            self.globalSettings = mergeArrays(self.globalSettings, settings);
            for (var i = 0; i < instance.slides.length; ++i) {
                self._setForSlide(i, self.slideSettings[i]);
            }
        });
    };

    /** Sets the slide settings to the default/global ones if the settings
        are still undefined. */
    self.commit = function()
    {
        for (var i = 0; i < instance.slides.length; ++i) {
            if (instance.slides[i].settings === null) {
                self._setForSlide(i, []);
            }
        }
    };
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
            if (self.animators[self.animIndex].trigger == 'withprevious') {
                self.nextAnimation();
            }
            else if (self.animators[self.animIndex].trigger == 'afterprevious') {
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

/** Core functions for the presentation. */
function WebSlider()
{
    var self = this;

    /**
     * @constructor
     */
    function ctor()
    {
        document.head.innerHTML += '<link rel="stylesheet" href="framework/main.css" type="text/css" />';
        document.head.innerHTML += '<link rel="stylesheet" href="framework/styles/' + theme + '-style.css" type="text/css" />';

        var js = document.createElement('script');
        js.type = 'text/javascript';
        js.src = 'framework/styles/' + theme + '-style.js';
        document.head.appendChild(js);

        pushReadyCallback(parseDom);
        pushReadyCallback(config.commit);
        pushReadyCallback(parseSections);
        pushReadyCallback(init);
        onready();

        document.onkeydown = keyPress;
        document.onmousemove = mouseMove;
        document.onclick = mouseClick;
    }

    ctor();

    /** Array that contains the slides as div elements. */
    self.slides = [];

    /** Index of the current slide. */
    self.slideNumber = 0;

    /** Last mouse position. */
    self.mouseX = 0;

    /** Last mouse position. */
    self.mouseY = 0;

    /** Timout for cursor hiding. */
    self.curTout = null;

    /** Context menu control. */
    self.menuul = null;

    self.frame = 0;

    self.sections = [];

    var console = null;

    /** Gets the current slides object. */
    self.getCurrent = function()
    {
        return self.slides[self.slideNumber];
    };

    self.slideById = function(id)
    {
        for (var i = 0; i < self.slides.length; i++) {
            if (self.slides[i].div.id === id) {
                return self.slides[i];
            }
        }
    };

    /**
     * Called when document is loaded. Analyses the HTML markup, puts slides
     * into an array and creates their layout.
     */
    function parseDom()
    {
        var children = document.body.getElementsByTagName('div');
        for (var i = 0; i < children.length; i++) {
            if (children[i].parentNode !== document.body) {
                continue;
            }
            var tmpslide = new Slide();
            children[i].className = 'slide';
            children[i].style.visibility = 'hidden';

            tmpslide.div = children[i];
            self.slides.push(tmpslide);
        }
    }

    // <script>tableOfContents();</script>
    self.getToc = function()
    {
        // if a subsection has no parent section, it is treated as a section
        var html = '';
        var subbing = 0;

        var ahref = function() { return '<li><a class="toc" href="javascript:instance.gotoSlide(' +  index + ');">'; };

        for (var i = 0; i < self.sections.length; ++i) {
            var index = self.sections[i].slideIndex;
            if (i > 0 && self.sections[i].type == 'subsection' && self.sections[i-1].type == 'section') {
                subbing += 1;
                html += '<ul>' + ahref(index) + self.sections[i].title + '</a></li>';
            }
            else if (i > 0 && self.sections[i].type == 'section' && self.sections[i-1].type == 'subsection') {
                subbing -= 1;
                html += '</ul>' + ahref(index) + self.sections[i].title + '</a></li>';
            }
            else {
                html += '<li>' + ahref(index) + self.sections[i].title + '</a></li>';
            }
        }

        for (i = 0; i < subbing; ++i) {
            html += '</ul>';
        }

        return html;
    }

    function parseSections()
    {
        var sec = document.getElementsByTagName('section');
        for (var i = 0; i < sec.length; ++i) {
            self.sections[i] = { title : sec[i].innerHTML };
            var rootDiv = sec[i].parentNode;
            while (rootDiv.parentNode != document.body) {
                rootDiv = rootDiv.parentNode;
            }
            for (var k = 0; k < self.slides.length; ++k) {
                if (self.slides[k].div == rootDiv) {
                    self.sections[i].slideIndex = k;
                }
            }
            if (sec[i].className == 'subsection') {
                self.sections[i].type = 'subsection';
            }
            else {
                self.sections[i].type = 'section';
            }
        }
    }

    function init()
    {
        document.body.style.backgroundColor = config.globalSettings.outerColor;
        for (i = 0; i < modules.length; i++) {
           var js = document.createElement('script');
           js.type = 'text/javascript';
           js.src = 'framework/module.' + modules[i] + '.js';
           document.head.appendChild(js);
        }

        for (var i = 0; i < self.slides.length; ++i) {
            var dim = self.slides[i].settings.pageDimensions;
            self.slides[i].div.style.width = dim[0] + 'px';

            // consider the slide padding
            self.slides[i].div.style.width = dim[0] - (self.slides[i].div.clientWidth - dim[0]) + 'px';
            self.slides[i].div.style.height = dim[1] + 'px';
            if (typeof createLayout == 'function') {
                createLayout(self.slides[i]);
            }
        }

        if (window.location.search == '?console') {
            console = new PresenterConsole(instance);
            console.gotoSlide(0);
        }
        else {
            window.onresize = resize;
            self.gotoSlide(0);
        }
    }

    /** Called when the window is resized, adjusts the slide size. */
    function resize()
    {
        var height = document.body.clientHeight;
        var width = document.body.clientWidth;

        var pagewidth = self.slides[self.slideNumber].settings.pageDimensions[0];
        var pageheight = self.slides[self.slideNumber].settings.pageDimensions[1];

        // get bottleneck
        var widthratio = width/pagewidth;
        var heightratio = height/pageheight;
        var scale = widthratio < heightratio ? widthratio : heightratio;
        if (scale > 1) {
            scale = 1;
        }
        self.slides[self.slideNumber].div.style.MozTransform = 'scale(' + scale + ')';
        self.slides[self.slideNumber].div.style.marginTop = '-' + (1-scale)*pageheight/2 + 'px';
        self.slides[self.slideNumber].div.style.marginLeft =  (width-pagewidth)/2 + 'px';
    };

    /**
     * Shows a context menu.
     * @param keepMenu Whether to keep an already existing menu and only adjust its position.
     */
    self.contextMenu = function(keepMenu)
    {
        var posx, posy;
        if (self.mouseX === null) {
            return;
        }
        if (self.menuul !== null) {
            if (!keepMenu) {
                document.body.removeChild(self.menuul);
                self.menuul = null;
                return;
            }
            else if (keepMenu) {
                posx = self.menuul.style.left;
                posy = self.menuul.style.top;
            }
            document.body.removeChild(self.menuul);
            self.menuul = null;
        }
        else {
            posx = self.mouseX + "px";
            posy = self.mouseY + "px";
        }

        var menuEntries =
        [
            ['Next', self.slideNumber < self.slides.length - 1, function() { gotoNext(); self.contextMenu(true); }],
            ['Previous', self.slideNumber > 0, function() { gotoPrevious(); self.contextMenu(true); }],
            ['First', self.slideNumber > 0, function() { self.gotoSlide(0); self.contextMenu(true); }],
            ['Last', self.slideNumber < self.slides.length - 1, function() { self.gotoSlide(self.slides.length - 1); self.contextMenu(true); }],
            ['Presenter Console',  true, function() { console = new PresenterConsole(self, true); self.contextMenu(false); }],
            ['Go to',  true, function() { }],
            'opensubmenu'
        ];

        var gotofunc = function() { self.gotoSlide(this.innerHTML[0] - 1); };
        for (var i = 0; i < self.slides.length; ++i) {
            var title = (i + 1).toString();
            var h1arr = self.slides[i].div.getElementsByTagName("h1");
            if (h1arr.length > 0) {
                title += '&nbsp;' + h1arr[0].innerHTML;
            }
            menuEntries[menuEntries.length] = [title, i != self.slideNumber, gotofunc];
        }
        menuEntries[menuEntries.length] = 'closesubmenu';

        self.menuul = document.createElement('ul');
        self.menuul.className = "menuul";
        self.menuul.style.left = posx;
        self.menuul.style.top = posy;
        document.body.appendChild(self.menuul);

        fillMenuUl(self.menuul, menuEntries);
        setMenuEvents(menuEntries);
    };

    function setMenuEvents(menuEntries)
    {
        for (var i = 0; i < menuEntries.length; i++) {
            var elem = document.getElementById('cm_' + i.toString());
            if (elem !== null) {
                elem.onclick = menuEntries[i][2];
            }
        }
    }

    function fillMenuUl(ul, menuEntries, start)
    {
        if (typeof start == 'undefined') {
            start = 0;
        }

        for (var cnt = start; cnt < menuEntries.length; cnt++) {
            if (menuEntries[cnt] == 'closesubmenu') {
                break;
            }
            else if (menuEntries[cnt] == 'opensubmenu') {
                continue;
            }
            var li = document.createElement('li');
            if (menuEntries[cnt + 1] == 'opensubmenu') {
                var subul = document.createElement('ul');
                li.appendChild(subul);
                fillMenuUl(subul, menuEntries, cnt + 1);
            }
            li.className = menuEntries[cnt][1] === true ? '' : 'inactli';
            li.innerHTML += menuEntries[cnt][0];
            li.id = 'cm_' + cnt.toString();
            ul.appendChild(li);
            if (menuEntries[cnt + 1] == 'opensubmenu') {
                cnt += 2;
                var opencount = 1;
                while (opencount !== 0) {
                    if (menuEntries[cnt] == 'opensubmenu') {
                        opencount++;
                    }
                    else if (menuEntries[cnt] == 'closesubmenu') {
                        opencount--;
                    }
                    cnt++;
                }
            }
        }
    }

    /**
     * Switch to another slide.
     * @param num The index of the slide to go to.
     * @param effect Function callback Sliding effect
     */
    self.gotoSlide = function(num, effect)
    {
        if (num >= 0 && num < self.slides.length) {
            if (window.location.search == '?console') {
                console.gotoSlide(num);
            }
            else {
                if (self.slideNumber == num) {
                    self.slides[num].div.style.visibility = 'visible';
                }
                else {
                    if (effect === undefined || effect === null) {
                        self.slides[self.slideNumber].div.style.visibility = 'hidden';
                        self.slides[num].div.style.visibility = 'visible';
                    }
                    else {
                       effect(this, num, self.slideNumber);
                    }
                    self.slideNumber = num;
                }
                resize();
            }
        }
    };

    /** Go to the next slide. */
    function gotoNext()
    {
        if (self.slides[self.slideNumber].animationsComplete() === false) {
            self.slides[self.slideNumber].nextAnimation();
        }
        else {
            self.slides[self.slideNumber].reset();
            self.gotoSlide(self.slideNumber + 1, null);
        }
    }

    /** Go to the previous slide. */
    function gotoPrevious()
    {
        if (self.slides[self.slideNumber].animIndex > 0) {
            self.slides[self.slideNumber].undoAnimation();
        }
        else {
            self.slides[self.slideNumber].reset();
            self.gotoSlide(self.slideNumber - 1, null);
        }
    }

    /**
     * Default mouseClick handler: Hide context menu if visible.
     * @param args The mouse event argument.
     */
    function mouseClick(args)
    {
        // every <li> in context menu has an id that starts with 'cm_'
        if (self.menuul !== null && args.target.id !== undefined &&
            args.target.id.substring(0, 3) != 'cm_')
        {
            document.body.removeChild(self.menuul);
            self.menuul = null;
        }
    }

    /**
     * Default mouseMove handler for cursor hiding.
     */
    function mouseMove(args)
    {
        // args.clientX und pageX für IE und andere
        // newX und mouseX für Chrome, der bei cursor-Änderung auslöst
        if (document.body === null) {
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
        clearTimeout(self.curTout);
        if (self.mouseX != newX || self.mouseY != newY) {
             document.body.style.cursor = "auto";
        }
        self.mouseX = newX;
        self.mouseY = newY;
        self.curTout = setTimeout(function() { document.body.style.cursor = "none"; }, 1000);
    }

    /** Default keypress handler. Used for context menu and sliding. */
    function keyPress(ev)
    {
        if (ev.target == "INPUT") {
            return;
        }
        if (ev.keyCode == 32) { // space
            self.contextMenu(false);
        }
        else if (ev.keyCode == 39) { // left
            gotoNext();
        }
        else if (ev.keyCode == 37) { // right
            gotoPrevious();
        }

        if (ev.keyCode == 32 || ev.keyCode == 38 || ev.keyCode == 40) {
            // eat the key to avoid scrolling
            return false;
        }
    }
}

/**
 * A presenter screen with additional information, which are only visible to the presenter.
 * @param webslider The WebSlider instance of this presentation.
 * @param newWindow If true, the presenter screen will be started in a new window.
 */
function PresenterConsole(webslider, newWindow)
{
    var startTime = null;

    var paused = 0;

    var timerRunning = true;

    var showNotes = false;

    var notesdiv = null;

    var self = this;

    function ctor()
    {
        if (newWindow !== undefined && newWindow === true) {
            openNewWindow();
            return;
        }
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
        document.getElementById('notesbutton').onclick = function()
        {
           showNotes = !showNotes;
           self.gotoSlide(webslider.slideNumber);
           this.blur();
        };

        document.getElementById('reset').onclick = resetTimer;
        document.getElementById('pause').onclick = startStop;
        document.getElementById('reset').href = '#';
        document.getElementById('pause').href = '#';

        window.onresize = resize;

        setInterval(updateTime, 1000);
    }

    ctor();

    function getClockHtml(string1, string2)
    {
        return '<span id="clocktime">' + string1 + '</span>' +
               '     <span id="time">' + string2 + '</span>';
    }

    function resize()
    {
    }

    function openNewWindow()
    {
        return window.open("main.html?console", "Zweitfenster", "status=yes,menubar=yes,screenX=" + screen.availWidth +
            ",screenY=0,height=" + screen.availHeight + ",width=" + screen.availWidth);
    }

    this.gotoSlide = function(num)
    {
        if (window.opener !== null) {
            window.opener.instance.gotoSlide(num);
        }
        webslider.slides[webslider.slideNumber].div.style.visibility = 'hidden';
        if (webslider.slideNumber < webslider.slides.length - 1) {
            webslider.slides[webslider.slideNumber + 1].div.style.visibility = 'hidden';
        }
        webslider.slides[num].div.style.visibility = 'visible';
        if (showNotes === false) {
            if (notesdiv !== null) {
                document.body.removeChild(notesdiv);
                notesdiv = null;
            }
            webslider.slides[num].div.style.left = '-10%';
            webslider.slides[num].div.style.MozTransform = 'scale(0.6)';
            webslider.slides[num].div.style.WebkitTransform = 'scale(0.6)';
            webslider.slides[num].div.style.top = '-10%'; // -20 + 15
        }
        else {
            webslider.slides[num].div.style.left = '-15%';
            webslider.slides[num].div.style.MozTransform = webslider.slides[num].div.style.WebkitTransform = 'scale(0.5)';
            webslider.slides[num].div.style.top = '-15%';
            if (notesdiv === null) {
                notesdiv = document.createElement('div');
            }
            notesdiv.className = 'notesdiv';
            var notes = webslider.slides[num].div.getElementsByClassName('notes');
            if (notes.length > 0) {
                notesdiv.innerHTML = notes[0].innerHTML;
            }
            document.body.appendChild(notesdiv);
        }
        if (num < webslider.slides.length - 1) {
            if (showNotes === false) {
                webslider.slides[num + 1].div.style.visibility = 'visible';
                webslider.slides[num + 1].div.style.left = '35%';
                webslider.slides[num + 1].div.style.top = '-20%'; // -30 + 15
                webslider.slides[num + 1].div.style.MozTransform = webslider.slides[num + 1].div.style.WebkitTransform = 'scale(0.4)';
            }
            else
            {
            }
        }
        webslider.slideNumber = num;
    };

    function resetTimer()
    {
        startTime = null;
        paused = 0;
        document.getElementById('time').innerHTML = '0:00';
    }

    function updateTime()
    {
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

    function startStop()
    {
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

    function pad2two(digit)
    {
        return (digit.toString().length == 1 ? '0' + digit.toString() : digit.toString());
    }
}

/** Basic animation functions. */
var AniBase =
{
    veryfastSpeed: 100,

    fastSpeed : 200,

    moderateSpeed : 500,

    slowSpeed: 1000,

    veryslowSpeed : 2000,

    /** Linear progress. */
    animatorEase : function(progress)
    {
        return progress;
    },

    animatorSin : function(progress)
    {
        // a sine square function hill goes from 0 to pi/2, maximum is still 1
        return Math.pow(Math.sin(progress*Math.PI/2), 2);
    },

    /*
     * Stops an animation started by startAnimation(...).
     * @param aniObject The return value of startAnimation(...).
     */
    stopAnimation : function(aniObject)
    {
        clearInterval(aniObject.timer);
        if (aniObject.cleanfunc !== null) {
            aniObject.cleanfunc();
        }
    },

    /**
     * Starts an animation.
     * @param bodyfunc Function callback that sets the animated properties after each every elapsed interval.
     * @param cleanfunc Function callback that is executed after the animation stops or is stopped manually.
     * @param start Initial value of the animated property.
     * @param end Final value of the animated property.
     * @valfunc Function callback that returns the animation process depending on the elapsed time.
     * @return Object instance with the information necessary to stop the animation.
     */
    startAnimation : function(bodyfunc, cleanfunc, start, end, anitime, valfunc)
    {
        var aniObject = {};
        aniObject.cleanfunc = cleanfunc;
        startTime = new Date().getTime();
        bodyfunc(0);
        aniObject.timer = setInterval(function()
        {
            var deltaT = (new Date()).getTime() - startTime;
            if (deltaT >= anitime) {
                // clean animation end
                bodyfunc(end);
                AniBase.stopAnimation(aniObject);
                return;
            }
            bodyfunc(start + (end-start)*valfunc(deltaT/anitime));
        }, 10);
        return aniObject;
    }
};

/** Functions for slide effects. */
var Sliding =
{
    /** The current animator object. */
    slideAnim : null,

    /** Animate transparency. */
    slideAlpha : function(slides, num, currentSlide)
    {
        Sliding.startSlideAnimation(null, function(value)
        {
            slides.slides[currentSlide].div.style.opacity = (1-value).toString();
            slides.slides[num].div.style.opacity = value.toString();
            slides.slides[num].div.style.visibility = 'visible';
        },
        function()
        {
            slides.slides[currentSlide].div.style.opacity = '';
            slides.slides[num].div.style.opacity = '';
            slides.slides[currentSlide].div.style.visibility = 'hidden';
        }, 0, 1, 200, AniBase.animatorEase);
    },

    startSlideAnimation : function(prepare, bodyfunc, cleanfunc, start, end, anitime, valfunc)
    {
        if (Sliding.slideAnim !== null) {
            AniBase.stopAnimation(Sliding.slideAnim);
        }
        if (prepare !== null) {
            prepare();
        }
        Sliding.slideAnim = AniBase.startAnimation(bodyfunc, function() { cleanfunc(); Sliding.slideAnim = null; } , start, end, anitime, valfunc);
    },

    slideHorizontal : function(slides, num, currentSlide)
    {
        // left: 50% is the middle
        var sign = (num > currentSlide) ? 1 : -1;
        Sliding.startSlideAnimation(
        function()
        {
            slides.slides[num].div.style.visibility = 'visible';
            slides.slides[currentSlide].div.style.zIndex = '1';
        },
        function(value)
        {
            slides.slides[currentSlide].div.style.marginLeft = -sign*value - 512 + 'px';
        },
        function()
        {
            slides.slides[currentSlide].div.style.visibility = 'hidden';
            slides.slides[currentSlide].div.style.marginLeft = slides.slides[currentSlide].div.style.zIndex = '';
        },
        0, 1024, 1000, AniBase.animatorSin);
    },

    setCrossBrowserCss : function(element, prop, css)
    {
        // border-radius
        // transform
        if (prop == 'transform') {
            element.style.MozTransform = css;
            element.style.WebkitTransform = css;
            element.style.OTransform = css;
            // IE?
        }
    },

    matrix : function(x1, x2, x3, x4, x5, x6)
    {
        // normal browsers:
        return 'matrix(' + x1 + ',' + x2 + ',' + x3 + ',' + x4 + ',' + x5 + ',' + x6 + ')';
    },

    /** Spin around the y-axis while changing the slide. */
    slideRotate : function(slides, num, currentSlide)
    {
        Sliding.startSlideAnimation(
        function()
        {
            slides.slides[currentSlide].div.style.zIndex = '1';
            slides.slides[num].div.style.visibility = 'visible';
        },
        function(value)
        {
            if (value < 0)
            {
                slides.slides[currentSlide].div.style.zIndex = '';
                slides.slides[num].div.style.zIndex = '1';
            }
            setCrossBrowserCss(slides.current, 'transform', matrix(value, 0, 0, 1, 0, 0));
            setCrossBrowserCss(slides.slides[num], 'transform', matrix(-value, 0, 0, 1, 0, 0));
        },
        function()
        {
            setCrossBrowserCss(slides.current, 'transform', '');
            setCrossBrowserCss(slides.slides[num], 'transform', '');
            slides.slides[num].div.style.zIndex = '';
            slides.slides[currentSlide].div.style.zIndex = '';
            slides.slides[currentSlide].div.style.visibility = 'hidden';
        },
        1, -1, 1000, AniBase.animatorSin);
    }
};

var AnimationFactory =
{

}

/** Animation effects. */
var Effects =
{
    /** Writes the letters of an element one after another. */
    writeText : function(oldElement, element, progress, args)
    {
        var text = oldElement.innerHTML;

        // consider spaces, otherwise the animation looks choppy
        var spaces = 0;
        for (var i = 0; i < text.length; i++) {
            if (text[i] == ' ') {
                spaces++;
            }
        }

        var letters = Math.round((text.length - spaces)*progress);
        var nonspaces = 0; var i = 0;
        while (nonspaces != letters) {
            if (text[i] !== ' ') {
                nonspaces++;
            }
            i++;
        }

        element.innerHTML = text.substring(0, i) + '<span style="visibility: hidden">' + text.substring(i) + '</span>';
    },

    /** Changes the css style. This is no continuous animation. */
    changeStyle : function(oldElement, element, progress, args)
    {
        element.cssText = (progress < 0.5 ? oldElement.cssText : args.newCss);
    }
};

/**
 * Defines an object animation.
 * @param selector The selector for DOM elements.
 *  Rules:
 *  .class ... select by class name
 *  #id ... select by id NOTE: this will be the only option at first
 *  #id->child(n) ... nth child
 *  h1 ... by tag name
 * @param config Configuration array.
 * @param callback Function callback that does the animation.
 */

// NOTE: are the selector rules necessary?
function Animator(selector, callback, config)
{
    /*
    * config: {aniTime : AniBase.fastSpeed, timeOffset : 10, args : { xpath : [], ypath : [] } }
    */
    var self = this;

    self.config = {};

    self.onFinished = function(){};

    self.aniTime = 0;

    self.callback = null;

    self.timeOffset = 0;

    self.trigger = '';

    self.selector = '';

    var element = null;

    var oldElement = null;

    self.args = null;

    self.completed = false;

    var animator = null;

    /** @constructor */
    function ctor(selector, callback, config)
    {
        self.element = document.getElementById(selector);
        self.selector = selector;
        self.oldElement = copyObject(self.element);
        self.callback = callback;

        if (config.aniTime !== undefined) {
            self.aniTime = config.aniTime;
        }

        if (config.timeOffset !== undefined) {
            self.timeOffset = config.timeOffset;
        }

        if (config.trigger !== undefined) {
            self.trigger = config.trigger;
        }

        if (config.args !== undefined) {
            self.args = config.args;
        }
    }

    function copyObject(obj)
    {
        var newElement = { };
        for (var key in obj) {
            newElement[key] = obj[key];
        }
        return newElement;
    }

    ctor(selector, callback, config);

    self.doAnimate = function()
    {
        _animate(true);
    };
    // NOTE: oldElement
    function _animate(forwards)
    {
        if (self.aniTime === 0) {
            self.callback(self.oldElement, self.element, forwards === true ? 1 : 0, self.args);
        }
        else {
            animator = AniBase.startAnimation(function(value)
            {
                self.callback(self.oldElement, document.getElementById(self.selector), value, self.args);
            },
            function(){ self.onFinished(); }, forwards === true ? 0 : 1, forwards === true ? 1 : 0, self.aniTime, AniBase.animatorSin);
        }
        self.completed = (forwards === true);
    }

    /** Animates backwards, use to reset an animated object. */
    self.backwardAnimate = function()
    {
        _animate(false);
    };

    /** Finish the animation now. */
    self.forceComplete = function()
    {
        if (self.completed === false) {
            self.abort();
            if (self.aniTime === 0) {
                self.callback(self.oldElement, self.element, self.args);
            }
            else {
                self.callback(self.oldElement, self.element, 1, self.args);
            }
        }
    };

    /** Aborts the current animation and sets to the final animation state. */
    // NOTE: backwards and forwards
    self.abort = function()
    {
        if (self.animator !== null) {
            AniBase.stopAnimation(self.animator);
            self.completed = true;
        }
    };

    self.undoAnimate = function()
    {
        self.element = self.oldElement;
        self.completed = false;
    };
}
