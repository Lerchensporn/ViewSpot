function createLayout(slide)
{
    var layout = slide.settings.layout;
    if (typeof layout.footerLeft == 'undefined') {
        layout.footerLeft = '&lt;Set the footer text.&gt;';
    }
    if (typeof layout.footerRight == 'undefined') {
        layout.footerRight = '&lt;Set the footer text.&gt;';
    }
    if (slide.settings.layout.footer === true) {
    slide.div.innerHTML += '<div class="footer"><div class="footer-left">' +
        layout.footerLeft + '</div><div class="footer-right">' + layout.footerRight +
        '</div></div>';
    }
}

