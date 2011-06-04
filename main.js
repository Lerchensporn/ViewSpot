var theme = "latex-style";
var slides = [];
var slideNumber = 0;
headInit();
window.onload = init;
document.onkeydown = keyPress;
document.onmousemove = mouseMove;
document.onclick = mouseClick;

var presenter = null;

function initConsole(args)
{
    presenter.document.onkeypress = keyPress;
}

function startPresenter()
{
    presenter = window.open("main.html?console", "Zweitfenster", "status=yes,menubar=yes,screenX=" + screen.availWidth +
        ",screenY=0,height=" + screen.availHeight + ",width=" + screen.availWidth);
}

function headInit()
{
    document.write('<link rel="stylesheet" href="main.css" type="text/css" />');
    document.write('<meta http-equiv="Content-type" content="text/html; charset=UTF-8" />');
    //document.write('<script type="text/javascript" src="mathjax/MathJax.js?config=TeX-AMS-MML_HTMLorMML"><\/script>');
    document.write('<link rel="stylesheet" href="' + theme + '.css" type="text/css" />');
    document.write('<script type="text/javascript" src="' + theme + '.js"><\/script>');
}

var curTout;
var mouseX;
var mouseY;
function mouseMove(args)
{
    // args.clientX und pageX für IE und andere
    // newX und mouseX für Chrome, der bei cursor-Änderung auslöst
    if(document.body == undefined || document.body == null)
    {
        return;
    }
    if(!args)
        args = window.event;
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
    clearTimeout(curTout);
    if(mouseX != newX || mouseY != newY)
    {
         document.body.style.cursor = "auto";
    }
    mouseX = newX;
    mouseY = newY;
    curTout = setTimeout('document.body.style.cursor = "none";', 1000);
}

function init()
{
    slides = [];
    children = document.body.getElementsByTagName('div');
    for(var i = 0; i < children.length; i++)
    {
        if(children[i].parentNode !== document.body || (children[i].id !== undefined && children[i].id[0] == '_'))
            continue;
        slides.push(children[i]);
        children[i].className = 'slide';
        children[i].style.visibility = 'hidden';
        createLayout(children[i]);
    }
    gotoSlide(0);
    if(window.location.search == '?console')
    {
        // nur Uhr
        cbar = document.createElement('div');
        cbar.style.textAlign = 'center';
        cbar.style.bottom = '0px';
        cbar.style.position = 'absolute';
        cbar.style.width = '100%';
        cbar.innerHTML = 
            '<div id="controls" style="margin:auto;display:table">' +
            '   <div style="display:table-row;height:100%">' +
            '       <div>' +
            '           <span id="clocktime">&ndash;</span>' +
            '           <span id="time">0:00</span>' +
            '           <a id="start" href="javascript:resetTimer();">Reset</a>' +
            '           <a id="pause" href="javascript:startStop();">Pause</a>' +
            '       </div>' +
            '       <div>' + 
            '           <button id="notesbutton" href="javascript:showNotes=true;gotoSlide(slideNumber);">Notes</button>' +
            '       </div>' +
            '       <div><button id="slidesbutton" onclick="javascript:void">Slides</button></div>' +
            '   </div>' +
            '</div>';
        document.body.appendChild(cbar);
        setInterval(updateTime, 1000);
    }
}

function resetTimer()
{
    startTime = null;
    paused = 0;
    document.getElementById('time').innerHTML = '0:00';
}

var startTime = null;
var paused = 0;
var timerRunning = true;

function updateTime()
{
    // Uhr
    var now = new Date();
    document.getElementById('clocktime').innerHTML = pad2two(now.getHours()) + ':' + pad2two(now.getMinutes()) + ':' + pad2two(now.getSeconds());

    // s andere
    if(timerRunning === false)
        return;
    if(startTime == null)
        startTime = now;
    var diff = new Date(now.getTime()+paused-startTime.getTime());
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
        paused += (new Date()).getTime()-startTime;
        startTime = null;
        timerRunning = false;
        document.getElementById('pause').innerHTML = 'Resume';
    }
}

function pad2two(digit)
{
    return (digit.toString().length == 1 ? "0" + digit.toString() : digit.toString());
}


var sliderTimer;
var sliderArgs;

function slideScale(num)
{
    slides[num].style.MozTransform = "scale(1)";
    slides[num].style.visibility = "visible";
    slides[slideNumber].style.visibility = "visible";
    slides[slideNumber].style.MozTransform = "scale(1)";
    slides[slideNumber].style.MozTransition = "-moz-transform 1.5s";
    slides[slideNumber].style.MozTransform = "scale(0)";
}

function slideHorizontal(num)
{
    slides[num].style.left = num > slideNumber ? "-100%" : "+100%";
    slides[num].style.visibility = "visible";
    slides[num].style.MozTransition = "left 5s";
    slides[slideNumber].style.MozTransition = "left 5s";
    if(num > slideNumber)
    {
        slides[num].style.left = "0%";
        slides[slideNumber].style.left = "-100%";
    }
    else
    {
        slides[num].style.left = "0%";
        slides[slideNumber].style.left = "100%";
    }
}

function slideNoEffect(num)
{
    slides[num].style.visibility = "visible";
    slides[slideNumber].style.visibility = "hidden";
}

var menuul = null;

function mouseClick(args)
{
    if(menuul != null)
    {
        minx = parseInt(menuul.style.left);
        maxx = minx + parseInt(menuul.clientWidth);
        miny = parseInt(menuul.style.top);
        maxy = miny + parseInt(menuul.clientHeight);
        if(args.pageX < minx || args.pageX > maxx || args.pageY < miny || args.pageY > maxy)
        {
            document.body.removeChild(menuul);
            menuul = null;
        }
    }
}

function contextMenu(keepMenu)
{
    /*
    Next
    Previous
    First
    Last
    Goto > 1 2 3 4 5 + title
    Disable effects
    Slides view
    Autoslider > disable, 1 second, 2 seconds, 3 seconds
    */
    var posx, posy;
    if(mouseX == null)
    {
        return;
    }
    if(menuul != null)
    {
        if((keepMenu == false || keepMenu == undefined))
        {
            document.body.removeChild(menuul);
            menuul = null;
            return;
        }
        else if(keepMenu === true)
        {
            posx = menuul.style.left;
            posy = menuul.style.top;
        }
        document.body.removeChild(menuul);
        menuul = null;
    }
    else
    {
        posx = mouseX + "px";
        posy = mouseY + "px";
    }

    menuul = document.createElement("ul");
    menuul.className = "menuul";
    menuul.style.left = posx;
    menuul.style.top = posy;
    inner  = '<li ' + (slideNumber < slides.length - 1 ? 'onclick="gotoNext();contextMenu(true);"' : 'class="inactli"') + '>Next</li>';
    inner += '<li ' + (slideNumber > 0 ? 'onclick="gotoPrevious(true);contextMenu(true);"' : 'class="inactli"') + '>Previous</li>'
    inner += '<li ' + (slideNumber > 0 ? 'onclick="gotoSlide(0);contextMenu(true);"' : 'class="inactli"') + '>First</li>'
    inner += '<li ' + (slideNumber < slides.length - 1 ? 'onclick="gotoSlide(slides.length - 1);contextMenu(true);"' : 'class="inactli"') + '>Last</li>';
    inner += '<li onclick="startPresenter();contextMenu(true);">Presenter Screen</li><li><ul>';
    for(var i = 0; i < slides.length; ++i)
    {
        inner += '<li ' + (i == slideNumber ? 'class="inactli"' : 'onclick="gotoSlide(' + i.toString() + ')"') + '>' + (i + 1).toString() + "&nbsp;";
        h1arr = slides[i].getElementsByTagName("h1");
        if(h1arr.length > 0)
        {
            inner += h1arr[0].innerHTML;
        }
        inner += '</li>';
    }
    inner += '</ul>Goto &gt;</li><li>Disable effects</li>';
    menuul.innerHTML = inner;
    document.body.appendChild(menuul);
}

var showNotes = true;

function gotoSlide(num)
{
    if(num >= 0 && num < slides.length)
    {
        if(window.location.search == '?console')
        {
            if(window.opener != null)
                window.opener.gotoSlide(num);
            slides[slideNumber].style.visibility = 'hidden';
            if(slideNumber < slides.length - 1)
                slides[slideNumber + 1].style.visibility = 'hidden';
            slides[num].style.visibility = 'visible';
            if(showNotes === false)
            {
                slides[num].style.left = '30%';
                slides[num].style.MozTransform = 'scale(0.6)';
                slides[num].style.WebkitTransform = 'scale(0.6)';
                slides[num].style.top = '-5%'; // -20 + 15
            }
            else
            {
                slides[num].style.left = '27%';
                slides[num].style.MozTransform = slides[num].style.WebkitTransform = 'scale(0.6)';
                slides[num].style.top = '-15%';
                notesdiv = document.createElement('div');
                notesdiv.className = 'notesdiv';
                notes = slides[num].getElementsByClassName('notes');
                if(notes.length > 0)
                {
                    notesdiv.innerHTML = notes[0].innerHTML;
                }
                document.body.appendChild(notesdiv);
            }
            if(num < slides.length - 1)
            {
                //slides[num + 1].style.visibility = 'visible';
                if(showNotes === false)
                {
                    slides[num + 1].style.left = '75%';
                    slides[num + 1].style.top = "-15%"; // -30 + 15
                    slides[num + 1].style.MozTransform = slides[num + 1].style.WebkitTransform = 'scale(0.4)';
                }
                else
                {
                }
            }
            slideNumber = num;
        }
        else
        {
            if(slideNumber == num)
            {
                slides[num].style.visibility = 'visible';
            }
            else
            {
                slideNoEffect(num);
                slideNumber = num;
            }
        }
    }
}

function gotoNext()
{
    gotoSlide(slideNumber + 1);
}

function gotoPrevious()
{
    gotoSlide(slideNumber - 1);
}

function keyPress(ev)
{
    if(ev.target == "INPUT")
        return;
    if(ev.keyCode == 32) // space
    {
        contextMenu();
    }
    else if(ev.keyCode == 39) // left
    {
        gotoNext();
    }
    else if(ev.keyCode == 37) //right
    {
        gotoPrevious();
    }
}
