// optional modules: mathjax, code highlighter

var theme = 'latex';
var modules = ['mathjax', 'highlighter'];

var instance = new WebSlider();

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

        var meta = document.createElement('meta');
        meta.httpEquiv = 'Content-type';
        meta.content = 'text/html; charset=UTF-8';
        document.head.appendChild(meta);

        var js = document.createElement('script');
        js.type = 'text/javascript';
        js.src = 'framework/styles/' + theme + '-style.js';
        document.head.appendChild(js);

        window.onload = init;
        document.onkeydown = keyPress;
        document.onmousemove = mouseMove;
        document.onclick = mouseClick;
    }

    ctor();

    /** Array that contains the slides as div elements. */
    self.slides = [];

    /** Index of the current slide.  */
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

    var console = null;

    /** Gets the current slides object. */
    self.getCurrent = function()
    {
        return self.slides[self.slideNumber];
    };

    /**
     * Called when document is loaded. Analyses the HTML markup, puts slides
     * into an array and creates their layout.
     */
    function init()
    {
        var children = document.body.getElementsByTagName('div');
        for(var i = 0; i < children.length; i++)
        {
            if(children[i].parentNode !== document.body)
            {
                continue;
            }
            self.slides.push(children[i]);
            children[i].className = 'slide';
            children[i].style.visibility = 'hidden';

            if(typeof createLayout == 'function')
            {
                createLayout(children[i]);
            }
        }

        if(window.location.search == '?console')
        {
            console = new PresenterConsole(instance);
            console.gotoSlide(0);
        }
        else
        {
            self.gotoSlide(0);
        }

        for(i = 0; i < modules.length; i++)
        {
           var js = document.createElement('script');
           js.type = 'text/javascript';
           js.src = 'framework/module.' + modules[i] + '.js';
           document.head.appendChild(js);
        }
    }

    /**
     * Shows a context menu.
     * @param keepMenu Whether to keep an already existing menu and only adjust its position.
     */
    self.contextMenu = function(keepMenu)
    {
        var posx, posy;
        if(self.mouseX === null)
        {
            return;
        }
        if(self.menuul !== null)
        {
            if(!keepMenu)
            {
                document.body.removeChild(self.menuul);
                self.menuul = null;
                return;
            }
            else if(keepMenu)
            {
                posx = self.menuul.style.left;
                posy = self.menuul.style.top;
            }
            document.body.removeChild(self.menuul);
            self.menuul = null;
        }
        else
        {
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
            'opensubmenu',
        ];

        for(var i = 0; i < self.slides.length; ++i)
        {
            var title = (i + 1).toString();
            var h1arr = self.slides[i].getElementsByTagName("h1");
            if(h1arr.length > 0)
            {
                title += '&nbsp;' + h1arr[0].innerHTML;
            }
            menuEntries[menuEntries.length] = [title, i != self.slideNumber, function() { self.gotoSlide(this.innerHTML[0] - 1); }];
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
        for(var i = 0; i < menuEntries.length; i++)
        {
            var elem = document.getElementById('cm_' + i.toString());
            if(elem !== null)
            {
                elem.onclick = menuEntries[i][2];
            }
        }
    }

    function fillMenuUl(ul, menuEntries, start)
    {
        if(start === undefined)
        {
            start = 0;
        }

        for(var cnt = start; cnt < menuEntries.length; cnt++)
        {
            if(menuEntries[cnt] == 'closesubmenu')
            {
                break;
            }
            else if(menuEntries[cnt] == 'opensubmenu')
            {
                continue;
            }
            var li = document.createElement('li');
            if(menuEntries[cnt + 1] == 'opensubmenu')
            {
                var subul = document.createElement('ul');
                li.appendChild(subul);
                fillMenuUl(subul, menuEntries, cnt + 1);
            }
            li.className = menuEntries[cnt][1] === true ? '' : 'inactli';
            li.innerHTML += menuEntries[cnt][0];
            li.id = 'cm_' + cnt.toString();
            ul.appendChild(li);
            if(menuEntries[cnt + 1] == 'opensubmenu')
            {
                cnt += 2;
                var opencount = 1;
                while(opencount !== 0)
                {
                    if(menuEntries[cnt] == 'opensubmenu')
                    {
                        opencount++;
                    }
                    else if(menuEntries[cnt] == 'closesubmenu')
                    {
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
        if(num >= 0 && num < self.slides.length)
        {
            if(window.location.search == '?console')
            {
                console.gotoSlide(num);
            }
            else
            {
                if(self.slideNumber == num)
                {
                    self.slides[num].style.visibility = 'visible';
                }
                else
                {
                    if(effect === undefined || effect === null)
                    {
                        self.slides[self.slideNumber].style.visibility = 'hidden';
                        self.slides[num].style.visibility = 'visible';
                    }
                    else
                    {
                       effect(num, self.slideNumber);
                    }
                    self.slideNumber = num;
                }
            }
        }
    };

    /** Go to the next slide. */
    function gotoNext()
    {
        self.gotoSlide(self.slideNumber + 1);
    }

    /** Go to the previous slide. */
    function gotoPrevious()
    {
        self.gotoSlide(self.slideNumber - 1);
    }

    /**
     * Default mouseClick handler: Hide context menu if visible.
     * @param args The mouse event argument.
     */
    function mouseClick(args)
    {
        // every <li> in context menu has an id that starts with 'cm_'
        if(self.menuul !== null && args.target.id !== undefined && args.target.id.substring(0, 3) != 'cm_')
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
        if(document.body === null)
            return;
        if(!args)
            args = window.event;
        var newX, newY;
        if(args.pageX)
        {
            newX = args.pageX;
            newY = args.pageY;
        }
        else if(args.clientX)
        {
            newX = args.clientX;
            newY = args.clientY;
        }
        clearTimeout(self.curTout);
        if(self.mouseX != newX || self.mouseY != newY)
        {
             document.body.style.cursor = "auto";
        }
        self.mouseX = newX;
        self.mouseY = newY;
        self.curTout = setTimeout(function() { document.body.style.cursor = "none"; }, 1000);
    }

    /** Default keypress handler. Used for context menu and sliding. */
    function keyPress(ev)
    {
        if(ev.target == "INPUT")
        {
            return;
        }
        if(ev.keyCode == 32) // space
        {
            self.contextMenu(false);
        }
        else if(ev.keyCode == 39) // left
        {
            gotoNext();
        }
        else if(ev.keyCode == 37) // right
        {
            gotoPrevious();
        }
    }
}

var AniBase =
{
    /** Linear progress. */
    animatorEase: function(progress)
    {
        return progress;
    },

    animatorSin: function(progress)
    {
        // a sine square function hill goes from 0 to pi/2, maximum is still 1
        return Math.pow(Math.sin(progress*Math.PI/2), 2);
    },

    /*
     * Stops an animation started by startAnimation(...).
     * @param aniObject The return value of startAnimation(...).
     */
    stopAnimation: function(aniObject)
    {
        clearInterval(aniObject.timer);
        aniObject.cleanfunc();
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
    startAnimation: function(bodyfunc, cleanfunc, start, end, anitime, valfunc)
    {
        aniObject = {};
        aniObject.cleanfunc = cleanfunc;
        startTime = new Date().getTime();
        aniObject.timer = setInterval(function()
        {
            deltaT = (new Date()).getTime() - startTime;
            if(deltaT >= anitime)
            {
                stopAnimation(aniObject);
                return;
            }
            bodyfunc(start + (end-start)*valfunc(deltaT/anitime));
        }, 10);
        return aniObject;
    }
};

/** Contains functions for slide effects. */
var Sliding =
{
    /** Animate transparency. */
    slideAlpha: function(slides, num)
    {
        this.startSlideAnimation(null, function(value)
        {
            slides.current.style.opacity = (1-value).toString();
            slides.list[num].style.opacity = value.toString();
            slides.list[num].style.visibility = 'visible';
        },
        function()
        {
            slides.current.style.opacity = '';
            slides.list[num].style.opacity = '';
            slides.current.style.visibility = 'hidden';
        }, 0, 1, 1000, Sliding.animatorEase);
    },

    startSlideAnimation: function(prepare, bodyfunc, cleanfunc, start, end, anitime, valfunc)
    {
        if(slideAnim !== null)
        {
            stopAnimation(slideAnim);
        }
        prepare();
        slideAnim = startAnimation(bodyfunc, function() { cleanfunc(); slideAnim = null; } , start, end, anitime, valfunc);
    },

    slideHorizontal: function(slides, num)
    {
        // left: 50% is the middle
        startSlideAnimation(
        function()
        {
            var sign = (num > slideNumber) ? 1 : -1;
            slides.list[num].style.visibility = 'visible';
            slides.current.style.zIndex = '1';
        },
        function(value)
        {
            slides.current.style.marginLeft = -sign*value - 512 + 'px';
        },
        function()
        {
            slides.current.style.visibility = 'hidden';
            slides.current.style.marginLeft = slides.current.style.zIndex = '';
        },
        0, 1024, 1000, Sliding.animatorSin);
    },

    setCrossBrowserCss: function(element, prop, css)
    {
        // border-radius
        // transform
        if(prop == 'transform')
        {
            element.style.MozTransform = css;
            element.style.WebkitTransform = css;
            element.style.OTransform = css;
            // IE?
        }
    },

    matrix: function(x1, x2, x3, x4, x5, x6)
    {
        // normal browsers:
        return 'matrix(' + x1 + ',' + x2 + ',' + x3 + ',' + x4 + ',' + x5 + ',' + x6 + ')';
    },

    /** Spin around the y-axis while changing the slide. */
    slideRotate: function(slides, num)
    {
        startSlideAnimation(
        function()
        {
            slides.current.style.zIndex = '1';
            slides.list[num].style.visibility = 'visible';
        },
        function(value)
        {
            if(value < 0)
            {
                slides.current.style.zIndex = '';
                slides.list[num].style.zIndex = '1';
            }
            setCrossBrowserCss(slides.current, 'transform', matrix(value, 0, 0, 1, 0, 0));
            setCrossBrowserCss(slides.list[num], 'transform', matrix(-value, 0, 0, 1, 0, 0));
        },
        function()
        {
            setCrossBrowserCss(slides.current, 'transform', '');
            setCrossBrowserCss(slides.list[num], 'transform', '');
            slides.list[num].style.zIndex = '';
            slides.current.style.zIndex = '';
            slides.current.style.visibility = 'hidden';
        },
        1, -1, 1000, Sliding.animatorSin);
    }
};

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
        if(newWindow !== undefined && newWindow === true)
        {
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
            '       <div>' +
            '           <span id="clocktime">&ndash;</span>' +
            '           <span id="time">0:00</span>' +
            '           <a id="reset">Reset</a>' +
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

        setInterval(updateTime, 1000);
    }

    ctor();

    function openNewWindow()
    {
        return window.open("main.html?console", "Zweitfenster", "status=yes,menubar=yes,screenX=" + screen.availWidth +
            ",screenY=0,height=" + screen.availHeight + ",width=" + screen.availWidth);
    }

    this.gotoSlide = function(num)
    {
        if(window.opener !== null)
        {
            window.opener.instance.gotoSlide(num);
        }
        webslider.slides[webslider.slideNumber].style.visibility = 'hidden';
        if(webslider.slideNumber < webslider.slides.length - 1)
        {
            webslider.slides[webslider.slideNumber + 1].style.visibility = 'hidden';
        }
        webslider.slides[num].style.visibility = 'visible';
        if(showNotes === false)
        {
            if(notesdiv !== null)
            {
                document.body.removeChild(notesdiv);
                notesdiv = null;
            }
            webslider.slides[num].style.left = '30%';
            webslider.slides[num].style.MozTransform = 'scale(0.6)';
            webslider.slides[num].style.WebkitTransform = 'scale(0.6)';
            webslider.slides[num].style.top = '-5%'; // -20 + 15
        }
        else
        {
            webslider.slides[num].style.left = '27%';
            webslider.slides[num].style.MozTransform = webslider.slides[num].style.WebkitTransform = 'scale(0.6)';
            webslider.slides[num].style.top = '-15%';
            if(notesdiv === null)
            {
                notesdiv = document.createElement('div');
            }
            notesdiv.className = 'notesdiv';
            notes = webslider.slides[num].getElementsByClassName('notes');
            if(notes.length > 0)
            {
                notesdiv.innerHTML = notes[0].innerHTML;
            }
            document.body.appendChild(notesdiv);
        }
        if(num < webslider.slides.length - 1)
        {
            if(showNotes === false)
            {
                webslider.slides[num + 1].style.visibility = 'visible';
                webslider.slides[num + 1].style.left = '75%';
                webslider.slides[num + 1].style.top = '-15%'; // -30 + 15
                webslider.slides[num + 1].style.MozTransform = webslider.slides[num + 1].style.WebkitTransform = 'scale(0.4)';
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
        document.getElementById('clocktime').innerHTML = pad2two(now.getHours()) + ':' + pad2two(now.getMinutes()) + ':' + pad2two(now.getSeconds());

        // s andere
        if(timerRunning === false)
        {
            return;
        }
        if(startTime === null)
        {
            startTime = now;
        }
        var diff = new Date(now.getTime() + paused - startTime.getTime());
        document.getElementById('time').innerHTML = (diff.getHours()*60 - 60 + diff.getMinutes()).toString() + ':' + pad2two(diff.getSeconds());
    }

    function startStop()
    {
        if(timerRunning === false)
        {
            document.getElementById('pause').innerHTML = 'Pause';
            timerRunning = true;
        }
        else
        {
            if(startTime !== null)
            {
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

var Effects =
{
    writeText : function(element, progress, arg)
    {

    },

    changeCss : function(element, arg)
    {
        element.cssText = arg;

    }
};

function Animator()
{
   var self = this;

   self.aniTime = 100;

   self.callback = null;

   self.element = null;

   self.oldElement = null;

   self.arg = [];

   self.animated = false;

   /** @constructor */
   function ctor(element, callback)
   {
       self.element = element;
       self.oldElement = element;
       self.callback = callback;
   }

   ctor();

   self.doAnimate = function()
   {
       self.animated = true;
       if(self.element === null || self.callback === null)
       {
           return;
       }
       self.callback(self.element, self.arg);
   };

   self.undoAnimate = function()
   {
       self.element = self.oldElement;
   };
}
