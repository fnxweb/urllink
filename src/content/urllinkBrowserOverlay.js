/* Copyright (C) 2006  Neil Bird
 *   $Id$
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */


/* Every time a new browser window is made, urllinkBrowserInit will be called */
window.addEventListener('load',urllinkBrowserInit,false);


function urllinkBrowserInit()
{
    urllinkCommon.urllinkInit();

    var contentAreaContextMenu = document.getElementById('contentAreaContextMenu');
    if (contentAreaContextMenu)
        contentAreaContextMenu.addEventListener('popupshowing',urllinkBrowserContext,false);
}


function urllinkGetTextBoxText(field)
{
    /* field seems to sometimes be a div under the actual input object, so check parent */
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


function getBestSelection(context)
{
    var focusedWindow = document.commandDispatcher.focusedWindow;
    var searchStr;
    if (focusedWindow)
    {
        searchStr = focusedWindow.getSelection();
        searchStr = searchStr.toString();
    }
    else
        searchStr = context.searchSelected();

    searchStr = urllinkCommon.tidySelection(searchStr);

    return searchStr;
}


/* Callback upon context-menu trigger */
function urllinkBrowserContext()
{
    var isLinkOrUrlSelection = false, isURL = false;

    if (gContextMenu)
    {
        isLinkOrUrlSelection = ( gContextMenu.isTextSelected || gContextMenu.onTextInput || gContextMenu.onLink );
        if (isLinkOrUrlSelection)
        {
            var wasLink = false;
            /* See if selection looks like a URL */
            /* Always use selection if it exists */
            var sel = '';
            if (gContextMenu.isTextSelected)
            {
                sel = getBestSelection(gContextMenu);
            }
            else if (gContextMenu.onTextInput)
            {
                sel = urllinkGetTextBoxText( gContextMenu.target );
            }
            else if (gContextMenu.onLink)
            {
                wasLink = true;
                sel = gContextMenu.link.href;
                /* Only do mailto: links and javascript: which have string args */
                if (sel.search(/^mailto:/) == 0  ||  sel.search(/^javascript:.*\(.*['"].*['"]/) == 0)
                    isURL = true;
                else
                    isLinkOrUrlSelection = false;
            }
            sel = unmangleURL(sel,wasLink);
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

    /* May be showing only main open or only tab open bits */
    var hidetab = urllinkCommon.prefs.getBoolPref("hidetab");
    var hideopen  = urllinkCommon.prefs.getBoolPref("hideopen");

    /* Main menu buttons visible if selection and looks like URL */
    for (var i=0; i<urllinkCommon.urllinkBrowserMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkCommon.urllinkBrowserMenuItems[i] + urllinkCommon.menuPos());
        if (menuitem)
        {
            if ((hidetab  &&  menuitem.id.search(/open-tab/) >= 0)  ||  (hideopen  &&  menuitem.id.search(/open-link/) >= 0))
                menuitem.hidden = true;
            else
                menuitem.hidden = !(isLinkOrUrlSelection && isURL);
        }
        menuitem = document.getElementById(urllinkCommon.urllinkBrowserMenuItems[i] + urllinkCommon.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Alternate submenus visible if selection and doesn't look like URL */
    if (! (!isLinkOrUrlSelection || isURL))
    {
        /* Alternate menus not hidden;  regenerate from current prefs. */
        for (var i=0; i<urllinkCommon.urllinkAlternateBrowserMenus.length; i++)
        {
            var menuitem_id = urllinkCommon.urllinkAlternateBrowserMenus[i] + urllinkCommon.menuPos();
            if ((!hidetab  &&  menuitem_id.search(/open-tab/) >= 0)  ||  (!hideopen  &&  menuitem_id.search(/open-link/) >= 0))
                urllinkCommon.regenerateMenu( menuitem_id, 'urllinkBrowserOpenLink', i );
        }
    }
    for (var i=0; i<urllinkCommon.urllinkAlternateBrowserMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkCommon.urllinkAlternateBrowserMenuItems[i] + urllinkCommon.menuPos());
        if (menuitem)
        {
            if ((hidetab  &&  menuitem.id.search(/open-tab/) >= 0)  ||  (hideopen  &&  menuitem.id.search(/open-link/) >= 0) )
                menuitem.hidden = true;
            else
                menuitem.hidden = !isLinkOrUrlSelection || isURL;
        }
        menuitem = document.getElementById(urllinkCommon.urllinkAlternateBrowserMenuItems[i] + urllinkCommon.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Hide separators if both of the above hidden */
    {
        for (var i=0; i<2; i++)
        {
            var menuitem = document.getElementById(urllinkCommon.urllinkBrowserMenuSep + i + urllinkCommon.menuPos());
            if (menuitem)
            {
                menuitem.hidden =
                    (!(isLinkOrUrlSelection && isURL))  &&
                    (!isLinkOrUrlSelection || isURL);
            }
            menuitem = document.getElementById(urllinkCommon.urllinkBrowserMenuSep + i + urllinkCommon.menuPosAlt());
            if (menuitem)
            {
                menuitem.hidden = true;
            }
        }
    }
}


/* Some sites (e.g., kelkoo) obfuisctae their js links with base64! */
var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function decode64(realinput)
{
    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    var input = realinput.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    if (input != realinput)
    {
        /* Not Base64 */
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


/* find largest best javascript arg */
function getBestJavascriptArg(url)
{
    /* Avoid twatting the app. if a link that contains an embedded JS app. is clicked! */
    if (url.length > 1024)
        return '';

    /* Strip leader */
    url = url.replace(/^javascript:.*?\(/, '');

    /* Loop through looking for best; '/' has precedence */
    var haveSlash = false;
    var best = '';
    var start = 0;
    var pos = 0;
    var quote = '';
    while (pos < url.length)
    {
        /* Backslash? */
        if (url[pos] == '\\')
        {
            continue;
        }
        /* Start of quote? */
        else if (quote == ''  &&  (url[pos] == '\''  ||  url[pos] == '"'))
        {
            quote = url[pos];
            start = pos;
        }
        /* End of quote? */
        else if (quote != ''  &&  url[pos] == quote)
        {
            /* We want this if it has a slash and our best doesn't,
             * or they both do/don't have slashes it's bigger than our best
             */
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

    /* Is out best actualy base64 (e.g,. kelkoo?) */
    var decoded = decode64(best);
    if (decoded != '')
    {
         best = decoded;
    }

    return best;
}


/* strip bad leading and trailing characters */
function unmangleURL(url,wasLink)
{
    /* strip bad leading characters */
    /* Allow '(' if there's a following ')' (e.g., wikipedia) */
    var bracketed = (url.search(/\(.*\)/) != -1);
    var illegalChars = (bracketed  ?  /^[\.,\'\"\?!>\]]+/  :  /^[\.,\'\"\(\)\?!>\]]+/);
    url = url.replace(illegalChars, '');

    /* Perform custom search and replaces */
    url = urllinkCommon.customSearchAndReplace(url);

    /* Non-break spaces for within HTML (seen in TB) */
    url = url.replace(/\xA0/g, ' ');

    /* If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
     * If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
     */
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,'');

    /* Remove any JavaScript waffle */
    if (url.search(/^javascript:/) == 0)
    {
        /* Get out first string arg. */
        url = getBestJavascriptArg(url);

        /* Full URL?  If not, prefix current site */
        if (url.search(/^\w+:\/\//) == -1)
        {
            var thispage = window.content.location.href;
            if (url[0] == '/')
            {
                /* Put site URL on front: '/some/dir' -> 'http:/somesite/some/dir' */
                thispage = thispage.replace(/^(\w+:\/+.*?)\/.*/,"$1");
            }
            else
            {
                /* Put local dir URL on front: 'some/sub/dir' -> 'http:/somesite/pagedir/some/sub/dir' */
                thispage = thispage.replace(/^(\w+:\/+.*\/).*/,"$1");
            }
            url = thispage + url;
        }
    }

    /* strip bad ending characters */
    /* Allow ')' if there's a preceeding '(' (e.g., wikipedia) */
    illegalChars = (bracketed  ?  /[\.,\'\"\?!>\]]+$/  :  /[\.,\'\"\?!>\]\(\)]+$/);
    url = url.replace(illegalChars, '');

    /* UTF-8 encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
     * but that seems to be illegal.
     */
    url = urllinkCommon.utf8Encode(url);

    return url;
}


/* Callback from XUL */
function urllinkBrowserOpenLink(event,astab,format)
{
    var browser = getBrowser();
    var lnk;
    var wasLink = false;
    var prefix = {val:''};
    var suffix = {val:''};

    /* Determine prefix/suffix by splitting on '*' */
    urllinkCommon.splitFormat( format, prefix, suffix );

    if (gContextMenu.isTextSelected)
    {
        lnk = getBestSelection(gContextMenu);
    }
    else if (gContextMenu.onTextInput)
    {
        lnk = urllinkGetTextBoxText(gContextMenu.target);
    }
    else if (gContextMenu.onLink)
    {
        lnk = gContextMenu.link.href;
        wasLink = true;
    }
    lnk = urllinkCommon.fixURL( prefix.val + unmangleURL( lnk, wasLink ) + suffix.val );

    var referrer = urllinkCommon.getReferrer();
    if (astab == 1)
    {
        /* Tab */
        var loadInBackground = urllinkCommon.prefManager.getBoolPref('browser.tabs.loadInBackground');
        var tab = browser.addTab( lnk, referrer );
        if (!loadInBackground)
            browser.selectedTab = tab;
    }
    else
    {
        var newwindow = urllinkCommon.getBoolPref('newwindow');
        var usewindow = ( (!newwindow  &&  event.shiftKey)  ||  (newwindow  &&  !event.shiftKey) );

        if (usewindow)
        {
            /* New window */
            window.open( lnk, referrer );
        }
        else
        {
            /* Follow link */
            window.loadURI( lnk, referrer );
        }
    }
}
