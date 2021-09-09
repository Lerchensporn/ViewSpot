/** Regex based code highlighter. */
var CodeHighlighter =
{
    /**
     * Highlighting rules as a literal bject.
     * The object properties specify the programming language. These properties contain the property
     * 'ignorecase', which must be set to true or false as well as the 'rules' property that contains
     * the rules arrays.
     * Rules array:
     *  [0] (int) Importance of rule.
     *  [1] (bool) True if [2] is a regex, false if [2] is a comma separated keyword list.
     *  [2] (string) Regex or keyword list.
     *  [3] (string) Css class for highlighted code.
     */
    definitions :
    {
        'js' :
        {
            'ignorecase' : false,
            'rules' :
            [
                [2, true, '"[^\n"]*"', 'string'],
                [2, true, "'[^\n']*'", 'string'],
                [1, true, '//[^\n]*', 'comment'],
                [3, false, 'function,var,undefined,return,for,while,do,if,else,null,true,false,in,new', 'keyword'],
            ]
        },
        'css' :
        {
            'ignorecase' : true,
            'rules' :
            [
                [2, true, '\b[0-9]+.[0-9]*(px\b|cm\b|pt\b|em\b|mm\b|pc\b|in\b|\b)', 'number'],
                [2, true, '[.#]+[^0-9\W][\w]*', 'object']
            ]
        }
    },

    // both arrays: start, end
    containsPos : function(startPos, endPos, pos)
    {
        for(var i = 0; i < startPos.length; i++)
        {
            if(pos[0] >= startPos[i][0] && pos[1] <= endPos[i])
                return true;
        }
        return false;
    },

    highlightDocument : function()
    {
        css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'framework/codestyles.css';
        css.type = 'text/css';
        document.head.appendChild(css);
        if(document.body != undefined && document.body != null)
        {
            pres = document.getElementsByTagName('pre');
            for(var i = 0; i < pres.length; i++)
            {
                // class name: 'code-<language>'
                // 'code-'.length = 5
                if(pres[i].className.indexOf('code-') === 0 && CodeHighlighter.definitions[pres[i].className.substring(5)] != undefined)
                {
                    pres[i].innerHTML = CodeHighlighter.highlightCode(pres[i].innerHTML, pres[i].className.substring(5));
                }
            }
        }
    },

    highlightCode : function(code, language)
    {
        if(CodeHighlighter.definitions[language] == undefined)
        {
            return code;
        }

        var result = "";
        var beginArray = []; // start index, css class
        var endArray = []; // end index
        // loop through regexes
        var rules = CodeHighlighter.definitions[language]['rules'];
        var ignorecase = CodeHighlighter.definitions[language]['ignorecase'];
        var i = 1;
        do
        {
            var running = false;
            // keywords
            for(var c = 0; c < rules.length; c++)
            {
                if(rules[c][0] != i)
                {
                    if(rules[c][0] > i)
                        running = true;
                    continue;
                }
                if(rules[c][1] === false) // we have keywords!
                {
                    keys = rules[c][2].split(',');
                    for(var keyi = 0; keyi < keys.length; keyi++)
                    {
                        var start;
                        if(ignorecase)
                            start = code.toLowerCase().indexOf(keys[keyi]);
                        else
                            start = code.indexOf(keys[keyi]);
                        var end;
                        while(start != -1)
                        {
                            end = start + keys[keyi].length;

                            if(!CodeHighlighter.containsPos(beginArray, endArray, [start, end]))
                            {
                                beginArray[beginArray.length] = [start, rules[c][3]];
                                endArray[endArray.length] = end;
                            }
                            start = code.indexOf(keys[keyi], start + 1);
                        }
                    }
                }
                else // regex
                {
                    gex = new RegExp(rules[c][2]);
                    gex.ignoreCase = ignorecase;
                    var match = gex.exec(code);
                    if(match != null)
                    {
                        end = match[0].length + match['index'];
                        if(!CodeHighlighter.containsPos(beginArray, endArray, [match['index'], end]))
                        {
                            beginArray[beginArray.length] = [match['index'], rules[c][3]];
                            endArray[endArray.length] = end;
                        }
                    }
                }
            }
            i += 1;
        }
        while(running);

        // reorder items of position array: highest index at first
        beginArray.sort(function(a, b) { return b[0] - a[0]; });
        endArray.sort(function(a, b) { return b - a; });

        // apply positions from highest to smallest index
        for(var posi = 0; posi < beginArray.length; posi++)
        {
            // end tag has higher index => at first
            code = code.substring(0, endArray[posi]) + '</span>' + code.substring(endArray[posi]);
            code = code.substring(0, beginArray[posi][0]) + '<span class="' + beginArray[posi][1] + '">' + code.substring(beginArray[posi][0]);
        }
        return code;
    }
};

CodeHighlighter.highlightDocument();
