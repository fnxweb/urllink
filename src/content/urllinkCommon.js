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


/* Access to moz */
const nsIPrefBranch = Components.interfaces.nsIPrefBranch;
var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

/* Short cut to prefs */
var prefs = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefService);
prefs = prefs.getBranch("extensions.urllink.");


/* Our bits */
var urllinkBrowserMenuSep = "urllink-browser-sep";
var urllinkBrowserMenuItems = new Array(
    "urllink-browser-open-tab",
    "urllink-browser-open-link" );
var urllinkAlternateBrowserMenuItems = new Array(
    "urllink-browser-open-tab-as",
    "urllink-browser-open-link-as" );
var urllinkAlternateBrowserMenus = new Array(
    "urllink-browser-open-link-as-popup", /* Order sic. */
    "urllink-browser-open-tab-as-popup" );

var urllinkMailMenuSep = "urllink-mail-sep";
var urllinkMailMenuItems = new Array(
    "urllink-mail-open-link" );
var urllinkAlternateMailMenuItems = new Array(
    "urllink-mail-open-link-as" );
var urllinkAlternateMailMenus = new Array(
    "urllink-mail-open-link-as-popup" );
var inThunderbird = false;


/* Menu defaults */
var defaultMenuItems = new Array(
    "www.",
    "www.*.com",
    "www.*.org",
    "www.*.net",
    "ftp." );


function getStringbundle()
{
    var bundle;
    var stringset = document.getElementById("stringbundleset");
    if (stringset)
    {
        var nodes = stringset.childNodes;
        for (var i=0;  i < nodes.length;  i++)
        {
            if (nodes[i].id == "urllink-strings")
            {
                bundle = nodes[i];
                break;
            }
        }
    }
    return bundle;
}


/* Minor annoyance */
var doneInitCheck = false;
window.addEventListener("load", urllinkInit, true);

function urllinkInit()
{
    if (doneInitCheck)
    {
        return;
    }
    else
    {
        doneInitCheck = true;
    }

    if (!prefs.prefHasUserValue("firsttime"))
    {
        var stringdb = getStringbundle();
        if (stringdb)
        {
            var intro = stringdb.getString("intro-message");
            prefs.setBoolPref("firsttime",true);
            alert(intro);
        }
    }
}


/* make sure URL has some sort of protocol */
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


/* Get prefix/suffix from '*' format; prefix/suffix passed by ref. */
function splitFormat( format, prefix, suffix )
{
    var starpos = format.search(/\*/);
    if (starpos == -1)
    {
        prefix.val = format;
        suffix.val = '';
    }
    else
    {
        prefix.val = format.substr(0,starpos);
        suffix.val = format.substr(starpos+1);
    }
}


/* Recreate named menu from prefs. */
function regenerateMenu( menuname, func, astab )
{
    var submenu = document.getElementById(menuname);
    if (!submenu)
    {
        return;
    }

    /* Delete existing */
    for (var i = 0;  i < submenu.childNodes.length; )
    {
        if (submenu.childNodes[i].hasAttribute("temp"))
        {
            var olditem = submenu.removeChild( submenu.childNodes[i] );
            delete olditem;
        }
        else
        {
            i++;
        }
    }

    /* Add new */
    var stringdb = getStringbundle();
    var withStr = ( stringdb ? stringdb.getString("popup-urllink-open-as") : '' );

    if (prefs.getPrefType("submenu.0") != nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        for (var i=0; i<defaultMenuItems.length; i++)
        {
            var format = defaultMenuItems[i];
            var menuitem = document.createElement("menuitem");
            if (menuitem)
            {
                menuitem.setAttribute("label", withStr+" '"+format+"'");
                menuitem.setAttribute("oncommand", func+"("+astab+",'"+format+"')");
                menuitem.setAttribute("temp","true");
                submenu.appendChild(menuitem);
            }
        }
    }
    else
    {
        /* Load prefs */
        var n = 0;
        while (prefs.getPrefType("submenu."+n) == nsIPrefBranch.PREF_STRING  &&
               prefs.prefHasUserValue("submenu."+n))
        {
            var format = prefs.getCharPref("submenu."+n);
            if (format)
            {
                var menuitem = document.createElement("menuitem");
                if (menuitem)
                {
                    menuitem.setAttribute("label", withStr+" '"+format+"'");
                    menuitem.setAttribute("oncommand", func+"("+astab+",'"+format+"')");
                    menuitem.setAttribute("temp","true");
                    submenu.appendChild(menuitem);
                }
            }
            n++;
        }
    }
}


/* getReferrer() has gone away in trunk builds and sometimes breaks in 1.0.x builds, so don't use it anymore */
function getReferrer()
{
    return ioService.newURI(document.location, null, null);
}
