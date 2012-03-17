(function() {
    var cfg = ws.module.getConfig('syntaxhighlighter');
    if (typeof cfg.style === 'undefined') {
        cfg.style = 'CoreDefault';
    }

    ws.module.loadCSS('framework/syntaxhighlighter/styles/shCore.css');
    ws.module.loadCSS('framework/syntaxhighlighter/styles/sh' + cfg.style + '.css');

    // used because the script loading order is unknown
    var synload = false;

    var onload = function() {
        if (synload === false) {
            // only skip the first call
            synload = true;
            return;
        }

        function path() {
            var result = [];
            for (var i = 0; i < arguments.length; ++i) {
                result.push(arguments[i].replace('@', 'framework/syntaxhighlighter/scripts/'));
            }
            return result;
        }

        SyntaxHighlighter.autoloader.apply(null, path(
            'applescript            @shBrushAppleScript.js',
            'actionscript3 as3      @shBrushAS3.js',
            'bash shell             @shBrushBash.js',
            'coldfusion cf          @shBrushColdFusion.js',
            'cpp c                  @shBrushCpp.js',
            'c# c-sharp csharp      @shBrushCSharp.js',
            'css                    @shBrushCss.js',
            'delphi pascal          @shBrushDelphi.js',
            'diff patch pas         @shBrushDiff.js',
            'erl erlang             @shBrushErlang.js',
            'groovy                 @shBrushGroovy.js',
            'java                   @shBrushJava.js',
            'jfx javafx             @shBrushJavaFX.js',
            'js jscript javascript  @shBrushJScript.js',
            'perl pl                @shBrushPerl.js',
            'php                    @shBrushPhp.js',
            'text plain             @shBrushPlain.js',
            'py python              @shBrushPython.js',
            'ruby rails ror rb      @shBrushRuby.js',
            'sass scss              @shBrushSass.js',
            'scala                  @shBrushScala.js',
            'sql                    @shBrushSql.js',
            'vb vbnet               @shBrushVb.js',
            'xml xhtml xslt html    @shBrushXml.js'
        ));
        SyntaxHighlighter.defaults.toolbar = false;
        SyntaxHighlighter.defaults.gutter = false;
        SyntaxHighlighter.all();
    };

    ws.module.loadScript('framework/syntaxhighlighter/scripts/shCore.js', onload);
    ws.module.loadScript('framework/syntaxhighlighter/scripts/shAutoloader.js', onload);
})();
