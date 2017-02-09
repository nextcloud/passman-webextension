function insertFontCSS() {
    var fontPath = API.extension.getURL('');
    var fontCss = ["@font-face {",
        "font-family: 'FontAwesome';",
        "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?v=4.7.0');",
        "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?#iefix&v=4.7.0') format('embedded-opentype'), url('" + fontPath + "fonts/fontawesome-webfont.woff2?v=4.7.0') format('woff2'), url('" + fontPath + "fonts/fontawesome-webfont.woff?v=4.7.0') format('woff'), url('" + fontPath + "fonts/fontawesome-webfont.ttf?v=4.7.0') format('truetype'), url('" + fontPath + "fonts/fontawesome-webfont.svg?v=4.7.0#fontawesomeregular') format('svg');",
        "font-weight: normal;",
        "font-style: normal;",
        "}"];
    var browser = jQuery.browser;
    if (window.navigator.userAgent.indexOf('Firefox') !== -1) {
        fontCss[2] = "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?v=4.7.0');";
        fontCss[3] = "src: url('" + fontPath + "fonts/fontawesome-webfont.eot?#iefix&v=4.7.0') format('embedded-opentype'), url('" + fontPath + "fonts/fontawesome-webfont.woff2?v=4.7.0') format('woff2'), url('" + fontPath + "fonts/fontawesome-webfont.woff?v=4.7.0') format('woff'), url('" + fontPath + "fonts/fontawesome-webfont.ttf?v=4.7.0') format('truetype'), url('" + fontPath + "fonts/fontawesome-webfont.svg?v=4.7.0#fontawesomeregular') format('svg');";
    }
    var css = fontCss.join('');
    var style = document.createElement('style'),
        head = document.head || document.getElementsByTagName('head')[0];

    style.type = 'text/css';
    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    head.appendChild(style);
}
insertFontCSS();