/* Copyright (c) 2006  Neil Bird  <mozilla@fnxweb.com>
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


/* Every time a new window is made, urllinkMailInit will be called */
window.addEventListener('load',urllinkMailInit,false);


function urllinkMailInit()
{
    urllinkCommon.urllinkInit();

    var context = document.getElementById('messagePaneContext');    /* TB 2 */
    if (!context)
        context = document.getElementById('mailContext');           /* TB 3 */
    if (context)
        context.addEventListener('popupshowing',urllinkMailContext,false);
}



/* raw version */
function rawOpenNewWindowWith(url)
{
    if (!urllinkCommon.inThunderbird())
    {
        /* Local browser - (from contentAreaUtils.js) to not sec. check file: URIs */
        if (url.search(/^file:/) == -1)
            urlSecurityCheck(url, document);

        /* if and only if the current window is a browser window and it has a document with a character
         * set, then extract the current charset menu setting from the current document and use it to
         * initialize the new browser window...
         */
        var charsetArg = null;
        var wintype = document.firstChild.getAttribute('windowtype');
        if (wintype == 'navigator:browser')
            charsetArg = 'charset=' + window._content.document.characterSet;

        var referrer = urllinkCommon.getReferrer();
        window.openDialog(getBrowserURL(), '_blank', 'chrome,all,dialog=no', url, charsetArg, referrer);
    }
    else
    {
        urllinkCommon.launchExternalURL(url);
    }
}


/* Selection ranges can contain spans of children;  this decodes them */
function spanString(span)
{
    var text = '';
    var nodes = span.childNodes.length;
    for (var n = 0;  n < nodes;  ++n)
    {
        var bit = span.childNodes[n];
        if (bit.data)
        {
            text += bit.data;
        }
        else if (bit.className)
        {
            if (bit.className.search(/^moz-txt-link/) == 0 || bit.className.search(/^moz-txt-tag/) == 0)
            {
                text += bit.innerHTML;
            }
            else if (bit.className.search(/^moz-txt-slash/) == 0)
            {
                text += spanString(bit);
            }
        }
    }

    return text;
}


/* Add a new text fragment to the existing text */
function addNewText( text, newtext )
{
    /* Add spaces in between fragments */
    var textsep = (text.val == ''  ?  ''  :  ' ');

    /* If we have a \n\r span in our URL, it's a link that's been broken across lines.
     * Almost certainly, this has been done on a space or a hyphen, so if the new line
     * isn't preceeded by a space or hyphen, add a space (Outlook can often split on
     * a space, but then not include the space, only the \n!).
     */
    newtext = newtext.replace( /([^- ])[\n\r]+/g, "$1 \n" );

    /* Do it */
    text.val += textsep + newtext;
}


/* Process a node's children */
function selectionStringFrag( frag, text, recurse )
{
    if (recurse >= 10)
        return;

    var nodes = frag.val.childNodes.length;

    for (var n = 0;  n < nodes;  ++n)
    {
        var bit = frag.val.childNodes[n];
        if (bit.data)
        {
            addNewText( text, bit.data );
        }
        else if (bit.className)
        {
            if (bit.className.search(/^moz-txt-link/) == 0  ||  bit.className.search(/^moz-txt-tag/) == 0)
            {
                addNewText( text, bit.innerHTML );
            }
            else if (bit.className.search(/^moz-txt-slash/) == 0)
            {
                addNewText( text, spanString(bit) );
            }
        }
        else if (bit.childNodes  &&  bit.childNodes.length)
        {
            var newfrag = {val : bit };
            selectionStringFrag( newfrag, text, recurse+1 );
        }
    }
}


/* Raw access to text of a selection.
 * Default toString op. mangles \n to space
 */
function selectionString(sel)
{
    var ranges = sel.rangeCount;
    var text = {val  : ''};
    for (var r = 0;  r < ranges;  ++r)
    {
        var range = sel.getRangeAt(r);
        var frag = {val : range.cloneContents()};
        selectionStringFrag( frag, text, 0 );
    }

    /* This can end up empty (!);  seemingly when the view is pseudo-HTML and the quoted text is the blue line.
     * Fall back to toString();  annoyingly, in this instance the pigging thing does have the '\n's in  :-/
     */
    if (text.val == '')
        text.val = sel.toString();

    return text.val;
}


/* Raw version of comm/nsContextMenu.js:searchSelected
 * Now using mail/base/content/nsContextMenu.js
 */
function rawSearchSelected(context)
{
    var focusedWindow = document.commandDispatcher.focusedWindow;
    /* var searchStr = focusedWindow.__proto__.getSelection.call(focusedWindow); */
    var searchStr = focusedWindow.getSelection();
    /* searchStr = searchStr.toString(); */
    searchStr = selectionString(searchStr);
    searchStr = urllinkCommon.tidySelection(searchStr);
    return searchStr;
}


/* strip bad leading and trailing characters
 * assume no leading/terminating white space (searchSelected() removes this)
 * as a work-around of a seeming bug in Moz. which gives us " " in lieu of
 * <CR> from some emails.
 */
function unmangleURL(url,wasLink)
{
    /* Remove OutLook delims. now */
    url = url.replace(/^\<(.*)\>$/, "$1");

    /* Perform custom search and replaces */
    url = urllinkCommon.customSearchAndReplace(url);

    /* strip bad leading characters */
    url = url.replace(/^[\.,\'\"\)\?!>\]]+/, '');
    /* strip bad ending characters */
    url = url.replace(/[\.,\'\"\)\?!>\]]+$/, '');

    /* UTF-8 encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
     * but that seems to be illegal.
     */
    url = urllinkCommon.utf8Encode(url);

    /* If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
     * If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
     */
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,'');

    return url;
}


/* Called on popup display */
function urllinkMailContext()
{
    var isTextOrUrlSelection = false, isURL = false;

    if (gContextMenu)
    {
        /* TB2 has isTextSelected, TB3 has isContentSelected */
        isTextOrUrlSelection = ( gContextMenu.isTextSelected || gContextMenu.onLink || gContextMenu.isContentSelected );
        if (isTextOrUrlSelection)
        {
            /* See if selection looks like a URL
             * Always use selection if it exists
             */
            var sel;
            if (gContextMenu.isTextSelected  ||  gContextMenu.isContentSelected)
            {
                sel = rawSearchSelected(gContextMenu);
                sel = unmangleURL(sel,false);
            }
            else if (gContextMenu.onLink)
            {
                wasLink = true;
                sel = gContextMenu.link.href;
                /* Only do mailto: links */
                if (sel.search(/^mailto:/) != 0)
                    isTextOrUrlSelection = false;
            }
            if (isTextOrUrlSelection && sel.search(/^(mailto:|\w+:\/\/|www\.|ftp\.|.*@)/) == 0)
                isURL = true;
        }
    }

    /* Visible if selection and looks like URL */
    for (var i=0; i<urllinkCommon.urllinkMailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkCommon.urllinkMailMenuItems[i] + urllinkCommon.menuPos());
        if (menuitem)
        {
            menuitem.hidden = !(isTextOrUrlSelection && isURL);
        }
        menuitem = document.getElementById(urllinkCommon.urllinkMailMenuItems[i] + urllinkCommon.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Visible if selection and doesn't look like URL */
    if (! (!isTextOrUrlSelection || isURL))
    {
        /* Alternate menus not hidden;  regenerate from current prefs. */
        for (var i=0; i<urllinkCommon.urllinkAlternateMailMenus.length; i++)
        {
            urllinkCommon.regenerateMenu( urllinkCommon.urllinkAlternateMailMenus[i] + urllinkCommon.menuPos(),
                'urllinkMailOpenLink', 0 );
        }
    }
    for (var i=0; i<urllinkCommon.urllinkAlternateMailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkCommon.urllinkAlternateMailMenuItems[i] + urllinkCommon.menuPos());
        if (menuitem)
        {
            menuitem.hidden = !isTextOrUrlSelection || isURL;
        }
        menuitem = document.getElementById(urllinkCommon.urllinkAlternateMailMenuItems[i] + urllinkCommon.menuPosAlt());
        if (menuitem)
        {
            menuitem.hidden = true;
        }
    }

    /* Hide separators if both of the above hidden */
    {
        for (var i=0; i<2; i++)
        {
            var menuitem = document.getElementById(urllinkCommon.urllinkMailMenuSep + i + urllinkCommon.menuPos());
            if (menuitem)
            {
                menuitem.hidden =
                    (!(isTextOrUrlSelection && isURL))  &&
                    (!isTextOrUrlSelection || isURL);
            }
            menuitem = document.getElementById(urllinkCommon.urllinkMailMenuSep + i + urllinkCommon.menuPosAlt());
            if (menuitem)
            {
                menuitem.hidden = true;
            }
        }
    }
}


function urllinkMailOpenLink(event,astab,format)  /* event/astab not used in mailer */
{
    var wasLink = false;
    var selURL;
    var prefix = {val:''};
    var suffix = {val:''};

    /* Determine prefix/suffix by splitting on '*' */
    urllinkCommon.splitFormat( format, prefix, suffix );

    /* TB2 has isTextSelected, TB3 has isContentSelected */
    if (gContextMenu.isTextSelected  ||  gContextMenu.isContentSelected)
    {
        selURL = rawSearchSelected(gContextMenu);
    }
    else if (gContextMenu.onLink)
    {
        wasLink = true;
        selURL = gContextMenu.link.href;
    }
    selURL = unmangleURL(selURL,wasLink);
    rawOpenNewWindowWith( urllinkCommon.fixURL( prefix.val + selURL + suffix.val ) );
}
