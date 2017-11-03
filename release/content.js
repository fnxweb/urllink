// Handle identification of best selection

// Copyright (C) 2006  Neil Bird
//   $Id$
//
// This library is free software; you can redistribute it and/or
// modify it under the terms of the GNU Lesser General Public
// License as published by the Free Software Foundation; either
// version 2.1 of the License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA


//// Utility functions previously in urllinkCommon.js


// Our prefs
var prefs = {};



// How to deal with newlines in the selection?
// Sometimes it's a space in a ref. that's been broken across lines, sometimes it's just a break.
// Let's go with presuming that there'll only be legitimate spaces causing breaks in file:: (and \\ & X:) URLs.
// Do it before the custom SnR so as to remove problematic CRs.
// We also need to cope with arbitrary text selection (for searches), so keep spaces if there's no protocol.
function unmangleNewlines( url )
{
    // backslashes have been converted by here
    var file_url  = (url.search(/^(file:|[A-Za-z]:|\/\/)/) == 0);   /* Looks like a file URL */
    var has_proto = (url.search(/^([A-Za-z]\w+:\/\/)/) == 0);       /* Looks like a standard URL */
    var url_like  = (url.search(/\/[A-Za-z0-9_.]+\//) >= 0);        /* Looks like a URL without a protocol */

    // If file URL or doesn't look like URL
    if (file_url || (!has_proto && !url_like))
        url = url.replace(/(\n|\r| )+/g, ' ');  // presume spaces as it looks like a file URL or arbitrary text
    else
        url = url.replace(/(\n|\r| )+/g, '');   // presume empty for normal URLs
    return url;
}


// Tidy up the selected string
function tidySelection( str )
{
    str = str.replace('\xAD','');                   // seen in Google 'did you mean' links
    str = str.replace('\xA0','');                   // seen in Thunderbird compose window
    str = str.replace(/\t/g, ' ');                  // tabs to space
    str = str.replace(/^[\n\r ]+/, '');             // strip leading space
    str = str.replace(/((\n|\r) *>[> ]*)+/g, '');   // remove standard quote marks
    str = str.replace(/[\n\r ]+$/, '');             // strip spaces at the end
    str = str.replace(/\\/g,'/');                   // backslash to forward slash

    // Do CR->space conversion when we know a bit more about the original URL and whether it ought to be space or ''
    return str;
}


// Perform an individual preference-defined search and replace operation on the given string
function singleSearchAndReplace( str, sandr )
{
    // Separate out lhs (regex) and rhs (repl)
    var barpos = sandr.search('\\|\\|');
    if (barpos != -1)
    {
        // Got 'em
        var restr = sandr.substr(0,barpos);
        var repl = sandr.substr(barpos+2);
        var reopt = '';

        // May have regex opts (e.g. 'g')
        // Use 'D' for debug to console
        var barpos = repl.search('\\|\\|');
        if (barpos != -1)
        {
            reopt = repl.substr(barpos+2);
            repl = repl.substr(0,barpos);
        }

        // Debug?
        var actualreopt = reopt.replace(/D/,'');
        var debug = (actualreopt != reopt);

        // Do it
        if (restr)
        {
            var regex = new RegExp( restr, actualreopt );
            if (regex)
            {
                var newstr = str.replace( regex, repl );
                if (debug)
                {
                    console.log( "URL Link debug\nConversion: '" + sandr + "'\nFrom: '" + str + "'\nTo: '" + newstr + "'" );
                }
                str = newstr;
            }
        }
    }
    return str;
}


// Perform the preference-defined search and replace operations on the given string
function customSearchAndReplace( str )
{
    // Process prefs
    if (prefs.hasOwnProperty("sandr"))
        for (let n in prefs.sandr)
            str = singleSearchAndReplace( str, prefs.sandr[n] );

    return str;
}



//// Browser page specific functionality


// Get the best test from a textbox
function getTextBoxText( field )
{
    // Field seems to sometimes be a div under the actual input object, so check parent
    // TBD - is this still true under WebExtensions?
    var tb;

    if (field.value)
        tb = field;
    else if (field.parentNode && field.parentNode.value)
        tb = field.parentNode;
    else
        return '';

    if (tb.selectionStart == tb.selectionEnd)
        return tb.value;
    else
        return tb.value.substring( tb.selectionStart, tb.selectionEnd );
}


/* Callback upon context-menu trigger */
function DELETE_ME__browserContext()
{
    // LOGIC for menu creation
    var me = fnxweb.urllink;
    var mc = me.common;
    var isLinkOrUrlSelection = false, isURL = false, isSimpleURL = false;

    if (gContextMenu)
    {
        isLinkOrUrlSelection = ( gContextMenu.isTextSelected || gContextMenu.onTextInput || gContextMenu.onLink );
        if (isLinkOrUrlSelection)
        {
            var wasLink = false;
            /* See if selection looks like a URL */
            /* Always use selection if it exists */
            var sel = '';
            if (gContextMenu.onTextInput)
            {
                sel = me.getTextBoxText( gContextMenu.target );
            }
            else if (gContextMenu.isTextSelected)
            {
                sel = me.getBestSelection(gContextMenu);
                // Firefox does a little of what we do for simple & obvious URLs like "google.com";  not sure what its
                // logic is, but we at least want to try to not duplicate menu options where possible.  So for non-line-split text
                // selections that start with http[s]/ftp (by protocol or hostname), neglect to proffer the "Open Selection"
                // options.  We'll always proffer the amendment submenus though, to allow for fixing up (e.g., "google.com" as
                // opposed to "www.google.com").
                // A really long URL regex is at http://flanders.co.nz/2009/11/08/a-good-url-regular-expression-repost/
                // ... but this should suffice for our purposes!
                // FF seems to not do it for “file:” URLS, so we'll process those.
                if (sel.search(/^[ \t\n]*file:/) == -1  &&  sel.search(/^[ \t\n]*([a-z]+:)?[-a-zA-Z0-9_.%\/?&=]+[ \t\n]*$/) == 0)
                    isSimpleURL = true;
            }
            else if (gContextMenu.onLink)
            {
                wasLink = true;
                sel = gContextMenu.link.href;
                /* Only do 'mailto' links, and 'javascript' refs. which have string args,
                 * and 'file' links which let Linux users map Windows file refs. to a local mount. */
                if (sel.search(/^mailto[:]/) == 0  ||
                    sel.search(/^javascript[:].*\(.*['"].*['"]/) == 0  ||
                    sel.search(/^file[:]/) == 0)
                    isUrl = true;
                else
                    isLinkOrUrlSelection = false;
            }
            sel = me.unmangleURL(sel,wasLink);
            if (isLinkOrUrlSelection && sel.search(/^(mailto:|\w+:\/\/|www\.|ftp\.|.*@)/) == 0)
                isURL = true;
        }
        else if (gContextMenu.onSaveableLink)
        {
            /* Right-click on a link */
            isLinkOrUrlSelection = true;
            isURL = true;
        }
    }

// Menu creation - TBD move
//     /* May be showing only main open or only tab open bits */
//     var hidetab  = mc.prefs.getBoolPref("hidetab");
//     var hideopen = mc.prefs.getBoolPref("hideopen");
//     var forcesubmenu = mc.prefs.getBoolPref('forcesubmenu');
//
//     /* Main menu buttons visible if selection and looks like URL */
//     var anyVisible = false;
//     for (var i=0; i<mc.BrowserMenuItems.length; i++)
//     {
//         var menuitem = document.getElementById(mc.BrowserMenuItems[i] + mc.menuPos());
//         if (menuitem)
//         {
//             if (mc.isInFirefox4Plus && isSimpleUrl)
//                 menuitem.hidden = true;
//             else if ((hidetab  &&  menuitem.id.search(/open-tab/) >= 0)  ||  (hideopen  &&  menuitem.id.search(/open-link/) >= 0))
//                 menuitem.hidden = true;
//             else
//                 menuitem.hidden = !(isLinkOrUrlSelection && isURL);
//         }
//         menuitem = document.getElementById(mc.BrowserMenuItems[i] + mc.menuPosAlt());
//         if (menuitem)
//             menuitem.hidden = true;
//         if (!menuitem.hidden)
//             anyVisible = true;
//     }
//
//     /* Alternate submenus visible if selection and doesn't look like URL, or we force it */
//     if (forcesubmenu  ||  ! (!isLinkOrUrlSelection || isURL))
//     {
//         /* Alternate menus not hidden;  regenerate from current prefs. */
//         for (var i=0; i<mc.AlternateBrowserMenus.length; i++)
//         {
//             var menuitem_id = mc.AlternateBrowserMenus[i] + mc.menuPos();
//             if ((!hidetab  &&  menuitem_id.search(/open-tab/) >= 0)  ||  (!hideopen  &&  menuitem_id.search(/open-link/) >= 0))
//                 mc.regenerateMenu( menuitem_id, fnxweb.urllink.BrowserOpenLink, i );
//         }
//     }
//     for (var i=0; i<mc.AlternateBrowserMenuItems.length; i++)
//     {
//         var menuitem = document.getElementById(mc.AlternateBrowserMenuItems[i] + mc.menuPos());
//         if (menuitem)
//         {
//             if ((hidetab  &&  menuitem.id.search(/open-tab/) >= 0)  ||  (hideopen  &&  menuitem.id.search(/open-link/) >= 0) )
//                 menuitem.hidden = true;
//             else
//                 menuitem.hidden = !forcesubmenu  &&  (!isLinkOrUrlSelection || isURL);
//         }
//         menuitem = document.getElementById(mc.AlternateBrowserMenuItems[i] + mc.menuPosAlt());
//         if (menuitem)
//             menuitem.hidden = true;
//         if (!menuitem.hidden)
//             anyVisible = true;
//     }
//
//     /* Hide separators if both of the above hidden */
//     {
//         for (var i=0; i<2; i++)
//         {
//             var menuitem = document.getElementById(mc.BrowserMenuSep + i + mc.menuPos());
//             if (menuitem)
//                 menuitem.hidden = !anyVisible;
//             menuitem = document.getElementById(mc.BrowserMenuSep + i + mc.menuPosAlt());
//             if (menuitem)
//                 menuitem.hidden = true;
//         }
//     }
}


// Some sites (e.g., kelkoo) obfuscate their js links with base64!
function decode64(realinput)
{
    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    var input = realinput.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    if (input != realinput)
    {
        // Not Base64
        return '';
    }

    do {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));

        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;

        output = output + String.fromCharCode(chr1);

        if (enc3 != 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 != 64) {
            output = output + String.fromCharCode(chr3);
        }
    } while (i < input.length);

    return output;
}


// Find largest best javascript arg
function getBestJavascriptArg(url)
{
    // Avoid twatting the app. if a link that contains an embedded JS app. is clicked!
    if (url.length > 1024)
        return '';

    // Strip leader
    url = url.replace(/^javascript[:].*?\(/, '');

    // Loop through looking for best; '/' has precedence
    var haveSlash = false;
    var best = '';
    var start = 0;
    var pos = 0;
    var quote = '';
    while (pos < url.length)
    {
        // Backslash?
        if (url[pos] == '\\')
        {
            continue;
        }
        // Start of quote?
        else if (quote == ''  &&  (url[pos] == '\''  ||  url[pos] == '"'))
        {
            quote = url[pos];
            start = pos;
        }
        // End of quote?
        else if (quote != ''  &&  url[pos] == quote)
        {
            // We want this if it has a slash and our best doesn't,
            // or they both do/don't have slashes it's bigger than our best
            quote = '';
            var current = url.substr( start+1, pos-start-1 );
            var thisSlash = (current.match(/\//) == '/');
            if ( (!haveSlash && thisSlash)  ||
                 (haveSlash == thisSlash  &&  current.length > best.length) )
            {
                best = current;
                haveSlash = thisSlash;
            }
        }
        pos++;
    }

    // Is out best actualy base64 (e.g,. kelkoo?)
    var decoded = fnxweb.urllink.decode64(best);
    if (decoded != '')
    {
         best = decoded;
    }

    return best;
}


// Strip bad leading and trailing characters
function unmangleURL( url, wasLink )
{
    // Strip bad leading characters
    // Allow '(' if there's a following ')' (e.g., wikipedia)
    var bracketed = (url.search(/\(.*\)/) != -1);
    var illegalChars = (bracketed  ?  /^[\.,\'\"\?!>\]]+/  :  /^[\.,\'\"\(\)\?!>\]]+/);
    url = url.replace(illegalChars, '');

    // How to deal with newlines in the selection?
    url = unmangleNewlines( url );

    // Perform custom search and replaces
    url = customSearchAndReplace(url);

    // Non-break spaces for within HTML (seen in TB)
    url = url.replace(/\xA0/g, ' ');

    // If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
    // If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,'');

    // Remove any JavaScript waffle
    if (url.search(/^javascript[:]/) == 0)
    {
        // Get out first string arg.
        url = getBestJavascriptArg(url);

        // Full URL?  If not, prefix current site
        if (url.search(/^\w+:\/\//) == -1)
        {
            var thispage = window.content.location.href;
            if (url[0] == '/')
            {
                // Put site URL on front: '/some/dir' -> 'http:/somesite/some/dir'
                thispage = thispage.replace(/^(\w+:\/+.*?)\/.*/,"$1");
            }
            else
            {
                // Put local dir URL on front: 'some/sub/dir' -> 'http:/somesite/pagedir/some/sub/dir'
                thispage = thispage.replace(/^(\w+:\/+.*\/).*/,"$1");
            }
            url = thispage + url;
        }
    }

    // strip bad ending characters
    // Allow ')' if there's a preceeding '(' (e.g., wikipedia)
    illegalChars = (bracketed  ?  /[\.,\'\"\?!>\]]+$/  :  /[\.,\'\"\?!>\]\(\)]+$/);
    url = url.replace(illegalChars, '');

    return url;
}


// Figure out best guess link to use if triggered
function processSelection( event )
{
    // Determine official selected text
    let lnk = window.getSelection().toString();
    let field = document.activeElement;

    // ID target of click
    let isLink = (event.target.tagName.search(/^a$/i) >= 0  ?  true  :  false);
    let isInput = (typeof(field.selectionStart) === "number");

    // Handle context
    if (isInput)
    {
        // Ask input for selection
        lnk = getTextBoxText( field );
    }
    else if (lnk.length)
    {
        // Use selected text
        lnk = tidySelection( lnk );
    }
    else if (isLink)
    {
        // Fall-back to target of link if nothing else
        lnk = event.target.href;
    }

    // Final tidy-up (main extension code will have to fix up the final URL once prefix/suffix added)
    lnk = unmangleURL( lnk, isLink );

    // Tell extension for the context menu handler
    comms.postMessage( {
        message:   "contextMenu",
        isLink:    isLink, // TBD no longer needed?
        selection: lnk
    });
}



//// Start up


// Connection to extension
var comms = browser.runtime.connect({name:"urllink-comms"});


// Get prefs. on load and change
comms.onMessage.addListener( message => {
    if (message["message"] === "urllink-prefs")
        prefs = message["prefs"];
});


// Process right-click events for context menu
window.addEventListener("mousedown", event => {
    if (event.button === 2) {
        processSelection( event );
    }
}, true);


// Also catch context menu via keyboard
window.addEventListener("keydown", event => {
    if (event.shiftKey && event.key === "F10" || event.key === "ContextMenu") {
        processSelection( event );
    }
}, true);
