/*
 * Copyright (c) 2003  Neil Bird  <mozilla@fnxweb.com>
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

var urllinkMailMenuSep = "urllink-mail-sep";
var urllinkMailMenuItems = new Array(
    "urllink-mail-open-link" );
var urllinkAlternateMailMenuItems = new Array(
    "urllink-mail-open-link-as",
    "urllink-mail-open-link-as-popup" );
var gInThunderbird = false;

// Every time a new window is made, urllinkMailInit will be called
window.addEventListener("load",urllinkMailInit,false);


function urllinkMailInit()
{
    if (navigator.userAgent.search(/Thunderbird/gi) != -1)
        gInThunderbird = true;

    if (document.getElementById("messagePaneContext"))
        document.getElementById("messagePaneContext").addEventListener("popupshowing",urllinkMailContext,false);
}



// raw version
function rawOpenNewWindowWith(url)
{
    if (!gInThunderbird)
    {
        /* Local browser - (from contentAreaUtils.js) to not sec. check file: URIs */
        if (url.search(/^file:/) == -1)
            urlSecurityCheck(url, document);

        // if and only if the current window is a browser window and it has a document with a character
        // set, then extract the current charset menu setting from the current document and use it to
        // initialize the new browser window...
        var charsetArg = null;
        var wintype = document.firstChild.getAttribute('windowtype');
        if (wintype == "navigator:browser")
            charsetArg = "charset=" + window._content.document.characterSet;

        var referrer = getReferrer(document);
        window.openDialog(getBrowserURL(), "_blank", "chrome,all,dialog=no", url, charsetArg, referrer);
    }
    else
    {
        /* Remote browser */
        var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
        messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
        messenger.launchExternalURL(url);
    }
}


// Raw version of comm/nsContextMenu.js:searchSelected
function rawSearchSelected(context)
{
    var focusedWindow = document.commandDispatcher.focusedWindow;
    var searchStr = focusedWindow.__proto__.getSelection.call(focusedWindow);
    searchStr = searchStr.toString();
    searchStr = searchStr.replace( /^\s+/, "" );
    searchStr = searchStr.replace(/(\n|\r)+/g, "");
    searchStr = searchStr.replace(/\t/g, " ");
    searchStr = searchStr.replace(/\s+$/,"");
    return searchStr;
}


// strip bad leading and trailing characters
// assume no leading/terminating white space (searchSelected() removes this)
// as a work-around of a seeming bug in Moz. which gives us " " in lieu of
// <CR> from some emails, assume " " is never valid in URLs and cut it out,
// only 'fixing' them to %20 if the URL seems to be a file.
function unmangleURL(url)
{
    // Remove OutLook delims. now
    url = url.replace(/^\<(.*)\>$/, "$1");

    // NT remote spec.
    url = url.replace(/^\\\\/, "file://///");
    // Yucky drive spec.
    url = url.replace(/^([A-Z]:)\\/, "file:///$1/");

    // strip bad leading characters
    url = url.replace(/^[^a-zA-Z]+/, "");
    // strip bad ending characters
    url = url.replace(/[\.,\'\"\)\?!>\]]+$/, "");
    // Convert inner spaces
    if (url.search(/^file:/) == 0)
    {
        url = url.replace(/ /g, "%20");
    }
    else
    {
        url = url.replace(/ /g, "");
    }

    // Convert [remaining] Doze dir seps.
    url = url.replace(/\\/g, "/");

    // If it's a mail link, strip off up to the '@'
    if (url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,"");

    return url;
}


function urllinkMailContext()
{
    var isTextOrUrlSelection = false, isURL = false;

    if (gContextMenu)
    {
        isTextOrUrlSelection = ( gContextMenu.isTextSelected || gContextMenu.onLink );
        if (isTextOrUrlSelection)
        {
            // See if selection looks like a URL
            // Always use selection if it exists
            var sel;
            if (gContextMenu.isTextSelected)
            {
                sel = rawSearchSelected(gContextMenu);
                sel = unmangleURL(sel);
            }
            else if (gContextMenu.onLink)
            {
                sel = gContextMenu.link.href;
                // Only do mailto: links
                if (sel.search(/^mailto:/) != 0)
                    isTextOrUrlSelection = false;
            }
            if (isTextOrUrlSelection && sel.search(/^(\w+:\/\/|www\.|ftp\.)/) == 0)
                isURL = true;
        }
    }

    /* Visible if selection and looks like URL */
    for(var i=0; i<urllinkMailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkMailMenuItems[i]);
        if (menuitem)
        {
            menuitem.hidden = !(isTextOrUrlSelection && isURL);
        }
    }
    /* Visible if selection and doesn't look like URL */
    for(var i=0; i<urllinkAlternateMailMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkAlternateMailMenuItems[i]);
        if (menuitem)
        {
            menuitem.hidden = !isTextOrUrlSelection || isURL;
        }
    }
    /* Hide separator if both of the above hidden */
    {
        var menuitem = document.getElementById(urllinkMailMenuSep);
        if (menuitem)
        {
            menuitem.hidden =
                (!(isTextOrUrlSelection && isURL))  &&
                (!isTextOrUrlSelection || isURL);
        }
    }
}


function fixURL(url)
{
    // make sure it has some sort of protocol
    if (url.search(/^\w+:\/\//) == -1)
    {
        if (url.search(/^ftp/) == 0)
        {
            url = "ftp://" + url;
        }
        else
        {
            url = "http://" + url;
        }
    }
    return url;
}


function urllinkMailOpenLink(prefix,suffix)
{
    var selURL;
    if (gContextMenu.isTextSelected)
    {
        selURL = rawSearchSelected(gContextMenu);
    }
    else if (gContextMenu.onLink)
    {
        selURL = gContextMenu.link.href;
    }
    selURL = unmangleURL(selURL);
    rawOpenNewWindowWith( fixURL( prefix + selURL + suffix ) );
}
