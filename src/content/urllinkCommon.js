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


var urllinkCommon =
{

    /* Access to moz */
    nsIPrefBranch : false,
    prefManager : false,
    ioService : false,

    /* Short cut to prefs */
    prefs : false,


    /* Our bits */
    urllinkBrowserMenuSep : "urllink-browser-sep-",
    urllinkBrowserMenuItems : new Array(
        "urllink-browser-open-tab",
        "urllink-browser-open-link" ),
    urllinkAlternateBrowserMenuItems : new Array(
        "urllink-browser-open-tab-as",
        "urllink-browser-open-link-as" ),
    urllinkAlternateBrowserMenus : new Array(
        "urllink-browser-open-link-as-popup", /* Order sic. */
        "urllink-browser-open-tab-as-popup" ),

    urllinkMailMenuSep : "urllink-mail-sep-",
    urllinkMailMenuItems : new Array(
        "urllink-mail-open-link" ),
    urllinkAlternateMailMenuItems : new Array(
        "urllink-mail-open-link-as" ),
    urllinkAlternateMailMenus : new Array(
        "urllink-mail-open-link-as-popup" ),
    isInThunderbird : false,
    checkedIsInThunderbird : false,


    /* Menu defaults */
    defaultMenuItems : new Array(
        "www.",
        "www.*.com",
        "www.*.org",
        "www.*.net",
        "ftp.",
        "--",
        "Wikipedia|http://en.wikipedia.org/wiki/Special:Search?search=*&sourceid=mozilla-search" ),


    inThunderbird: function ()
    {
        if (!this.checkedIsInThunderbird)
        {
            this.checkedIsInThunderbird = true;
            if (navigator.userAgent.search(/Thunderbird/gi) != -1)
                isInThunderbird = true;
        }
        return isInThunderbird;
    },


    getStringbundle: function ()
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
    },


    /* Minor annoyance */
    doneInitCheck : false,

    urllinkInit: function ()
    {
        if (this.doneInitCheck)
        {
            return;
        }
        else
        {
            this.doneInitCheck = true;
        }

        this.nsIPrefBranch = Components.interfaces.nsIPrefBranch;
        this.prefManager =
            Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
        this.ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).
            getBranch("extensions.urllink.");

        this.inThunderbird();

        if (!this.prefs.prefHasUserValue("firsttime"))
        {
            var stringdb = this.getStringbundle();
            if (stringdb)
            {
                var intro = stringdb.getString("intro-message");
                this.prefs.setBoolPref("firsttime",true);
                alert(intro);
            }
        }
    },


    /* make sure URL has some sort of protocol, & change common 'errors' */
    fixURL: function (url)
    {
        /* Check proto */
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

        /* Change common faults */
        url.replace(/&amp;/ig,'&');
        url.replace(/\\/g,'/');

        return url;
    },


    /* Get prefix/suffix from '*' format; prefix/suffix passed by ref. */
    splitFormat: function ( format, prefix, suffix )
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
    },


    /* Recreate named menu from prefs. */
    regenerateMenu: function ( menuname, func, astab )
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
        var stringdb = this.getStringbundle();
        var withStr = ( stringdb ? stringdb.getString("popup-urllink-open-as") : '' );

        if (this.prefs.getPrefType("submenu.0") != this.nsIPrefBranch.PREF_STRING)
        {
            /* Nothing yet */
            for (var i = 0;  i < this.defaultMenuItems.length;  i++)
            {
                var format = defaultMenuItems[i];
                var menuitem = document.createElement("menuitem");
                if (menuitem)
                {
                    menuitem.setAttribute("label", withStr+" '"+format+"'");
                    menuitem.setAttribute("oncommand", func+"(event,"+astab+",'"+format+"')");
                    menuitem.setAttribute("temp","true");
                    submenu.appendChild(menuitem);
                }
            }
        }
        else
        {
            /* Load prefs */
            var n = 0;
            while (this.prefs.getPrefType("submenu."+n) == this.nsIPrefBranch.PREF_STRING  &&
                   this.prefs.prefHasUserValue("submenu."+n))
            {
                var prefstr = this.prefs.getCharPref("submenu."+n);
                if (prefstr)
                {
                    /* prefstr = 'displaystr|format' */
                    var barpos = prefstr.search('\\|');
                    var text, format;
                    if (barpos == -1)
                    {
                        text = withStr + " '" + prefstr + "'";
                        format = prefstr;
                    }
                    else
                    {
                        text = prefstr.substr(0,barpos);
                        format = prefstr.substr(barpos+1);
                    }

                    /* Create menuitem */
                    var menuitem;
                    if (prefstr.search(/^--*$/) == 0)
                    {
                        menuitem = document.createElement("menuseparator");
                    }
                    else
                    {
                        menuitem = document.createElement("menuitem");
                    }
                    if (menuitem)
                    {
                        menuitem.setAttribute("label", text);
                        menuitem.setAttribute("oncommand", func+"(event,"+astab+",'"+format+"')");
                        menuitem.setAttribute("temp","true");
                        submenu.appendChild(menuitem);
                    }
                }
                n++;
            }
        }
    },


    /* getReferrer() has gone away in trunk builds and sometimes breaks in 1.0.x builds, so don't use it anymore */
    getReferrer: function ()
    {
        return this.ioService.newURI(document.location, null, null);
    },


    /* For Thunderbird, to open links in a remote browser */
    launchExternalURL: function (url)
    {
        /* Remote browser */
        var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
        messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
        messenger.launchExternalURL(url);
    }

}


//window.addEventListener("load", urllinkCommon.urllinkInit, true);
