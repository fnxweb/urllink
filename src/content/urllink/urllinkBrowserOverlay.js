/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * Copyright (c) 2001-2002  Ted Mielczarek
 * This version (C) 2003  Neil Bird
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

var urllinkBrowserMenuSep = "urllink-browser-sep";
var urllinkBrowserMenuItems = new Array(
    "urllink-browser-open-tab",
    "urllink-browser-open-link" );
var urllinkAlternateBrowserMenuItems = new Array(
    "urllink-browser-open-tab-as",
    "urllink-browser-open-tab-as-popup",
    "urllink-browser-open-link-as",
    "urllink-browser-open-link-as-popup" );

var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);


/* Every time a new browser window is made, urllinkBrowserInit will be called */
window.addEventListener("load",urllinkBrowserInit,false);


function urllinkBrowserInit()
{
    var contentAreaContextMenu = document.getElementById("contentAreaContextMenu");
    if (contentAreaContextMenu)
        contentAreaContextMenu.addEventListener("popupshowing",urllinkBrowserContext,false);
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
        return "";

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

    searchStr = searchStr.replace(/^\s+/, "");
    searchStr = searchStr.replace(/(\n|\r)*/g, "");
    searchStr = searchStr.replace(/\s+$/, "");

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

    /* Visible if selection and looks like URL */
    for(var i=0; i<urllinkBrowserMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkBrowserMenuItems[i]);
        if (menuitem)
        {
            menuitem.hidden = !(isLinkOrUrlSelection && isURL);
        }
    }
    /* Visible if selection and doesn't look like URL */
    for(var i=0; i<urllinkAlternateBrowserMenuItems.length; i++)
    {
        var menuitem = document.getElementById(urllinkAlternateBrowserMenuItems[i]);
        if (menuitem)
        {
            menuitem.hidden = !isLinkOrUrlSelection || isURL;
        }
    }
    /* Hide separator if both of the above hidden */
    {
        var menuitem = document.getElementById(urllinkBrowserMenuSep);
        if (menuitem)
        {
            menuitem.hidden =
                (!(isLinkOrUrlSelection && isURL))  &&
                (!isLinkOrUrlSelection || isURL);
        }
    }
}


/* strip bad leading and trailing characters */
function unmangleURL(url,wasLink)
{
    /* strip bad leading characters */
    url = url.replace(/^[^a-zA-Z]+/, "");

    /* If it's a mail link in an actual hyperlink, strip off up to the '@' (convert mail link into web link)
     * If it's a textual mailto:, we'll activate it [if user wants a fake web link, don't select the "mailto:"!]
     */
    if (wasLink  &&  url.search(/^mailto:/) == 0)
        url = url.replace(/^mailto:.*@/,"");

    /* Remove any JavaScript waffle */
    if (url.search(/^javascript:/) == 0)
    {
        /* Get out first string arg. */
        url = url.replace(/^javascript:.*?\(.*?['"](.*?)['"].*/, "$1");

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
    url = url.replace(/[\.,\'\"\)\?!>\]]+$/, "");

    return url;
}


/* make sure it has some sort of protocol */
function fixURL(url)
{
    if (url.search(/^mailto:/) == -1  &&  url.search(/^\w+:\/\//) == -1)
    {
        if (url.search(/^ftp/) == 0)
        {
            url = "ftp://" + url;
        }
        else if (url.search(/@/) >= 0)
        {
            url = "mailto:" + url;
        }
        else
        {
            url = "http://" + url;
        }
    }

    return url;
}


/* getReferrer() has gone away in trunk builds and sometimes breaks in 1.0.x builds, so don't use it anymore */
function getReferrer()
{
    return ioService.newURI(document.location, null, null);
}


/* Callback from XUL */
function urllinkBrowserOpenLink(typ,prefix,suffix)
{
    var browser = getBrowser();
    var lnk;
    var wasLink = false;

    /* if (gContextMenu.onSaveableLink) */
    /* { */
    /*     lnk = gContextMenu.link.href; */
    /* } */
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
    lnk = fixURL( prefix + unmangleURL( lnk, wasLink ) + suffix );

    var referrer = getReferrer();
    if (typ == 1)
    {
        /* Tab */
        var loadInBackground = prefManager.getBoolPref("browser.tabs.loadInBackground");
        var tab = browser.addTab( lnk, referrer );
        if (!loadInBackground)
            browser.selectedTab = tab;
    }
    else
    {
        /* Window */
        window.loadURI( lnk, referrer );
    }
}
