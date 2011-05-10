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


/* Clean up namespace */
if (!fnxweb)  var fnxweb = {};
if (!fnxweb.urllink)  fnxweb.urllink = {};


fnxweb.urllink.common =
{
    /* Current version */
    version : '',
    addonID : '{139a120b-c2ea-41d2-bf70-542d9f063dfd}',

    /* Access to moz */
    nsIPrefBranch : false,
    prefManager : false,
    ioService : false,

    /* Short cut to prefs */
    prefs : false,


    /* Our bits */
    BrowserMenuSep : 'urllink-browser-sep-',
    BrowserMenuItems : [
        'urllink-browser-open-tab',
        'urllink-browser-open-link' ],
    AlternateBrowserMenuItems : [
        'urllink-browser-open-tab-as',
        'urllink-browser-open-link-as' ],
    AlternateBrowserMenus : [
        'urllink-browser-open-link-as-popup', /* Order sic. */
        'urllink-browser-open-tab-as-popup' ],

    MailMenuSep : 'urllink-mail-sep-',
    MailMenuItems : [
        'urllink-mail-open-link' ],
    AlternateMailMenuItems : [
        'urllink-mail-open-link-as' ],
    AlternateMailMenus : [
        'urllink-mail-open-link-as-popup' ],

    isInThunderbird : false,
    isInFirefox4Plus : false,
    checkedApplication : false,


    /* Menu defaults */
    defaultMenuItems : [
        '&www.*',
        'www.*.&com',
        'www.*.&org',
        'www.*.&net',
        '&ftp.*',
        '--',
        'In &Google|http://www.google.com/search?q=*&source-id=Mozilla%20Firefox&start=0',
        'In Wi&kipedia|http://en.wikipedia.org/wiki/Special:Search?search=*&sourceid=mozilla-search' ],

    /* Search and replace defaults */
    defaultSandrItems : [
        '^//||file:///',            /* convert Windows UNC into file: URL */
        '^([A-Za-z]:)||file:///$1'  /* convert Windows drive letter into file: URL */
        ],


    checkApplication: function ()
    {
        if (!this.checkedApplication)
        {
            this.checkedApplication = true;
            if (navigator.userAgent.search(/Thunderbird/gi) != -1  ||  navigator.userAgent.search(/Shredder/gi) != -1)
                this.isInThunderbird = true;
            if (navigator.userAgent.search(/Firefox\/([0-9])\./gi) != -1)
            {
                var vn = parseInt(navigator.userAgent.replace(/.*Firefox\/([0-9]+)\..*/gi,'$1'));
                if (vn >= 4)
                    this.isInFirefox4Plus = true;
            }
        }
    },


    getStringbundle: function ()
    {
        var bundle;
        var stringset = document.getElementById('stringbundleset');
        if (stringset)
        {
            var nodes = stringset.childNodes;
            for (var i=0;  i < nodes.length;  i++)
            {
                if (nodes[i].id == 'urllink-strings')
                {
                    bundle = nodes[i];
                    break;
                }
            }
        }
        return bundle;
    },


    menuPos: function ()
    {
        return (this.prefs.getBoolPref('topmenu') ? '-top' : '-bottom');
    },

    menuPosAlt: function ()
    {
        return (!this.prefs.getBoolPref('topmenu') ? '-top' : '-bottom');
    },

    getBoolPref: function (name)
    {
        return this.prefs.getBoolPref(name);
    },


    /* Minor annoyance */
    doneInitCheck : false,

    checkVersion : function (myversion)
    {
        this.version = myversion;

        /* See if major version has changed
         * Firstly, fake an entry if not yet stored version
         */
        if (!this.prefs.prefHasUserValue('lastversion'))
            this.prefs.setCharPref('lastversion','0.00.0');

        /* Now get major versions */
        var lastversion = this.prefs.getCharPref('lastversion').replace(/^([0-9]+\.[0-9]+).*/,'$1');
        var version = this.version.replace(/^([0-9]+\.[0-9]+).*/,'$1');

        /* Show changelog if there have been major changes */
        if (lastversion != version)
            setTimeout( function() {    /* allow delay for MacOS to size main window */
                    openDialog(
                        'chrome://urllink/content/urllinkChangelog.xul', 'URL Link - Latest Changes',
                        'dialog=no,modal=no,resizable=yes,width=640,height=512');
                    }, 1 );

        this.prefs.setCharPref('lastversion',this.version);
    },

    Init: function ()
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
            Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
        this.ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
        this.prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).
            getBranch('extensions.urllink.');

        this.checkApplication();

        if (!this.prefs.prefHasUserValue('firsttime'))
        {
            /* First-time use message */
            var stringdb = this.getStringbundle();
            if (stringdb)
            {
                var intro = stringdb.getString('intro-message');
                this.prefs.setBoolPref('firsttime',true);
                setTimeout( function() {    /* allow delay for MacOS to size main window */
                        alert(intro);
                        }, 1 );
            }
        }
        else
        {
            /* Async. req. for our version so we can check it & maybe produce a changelog.
            /* http://siphon9.net/loune/2010/07/getting-your-firefox-extension-version-number/
             */
            var ascope = { };

            if (typeof(Components.classes["@mozilla.org/extensions/manager;1"]) != 'undefined')
            {
                var extMan = Components.classes["@mozilla.org/extensions/manager;1"].
                    getService(Components.interfaces.nsIExtensionManager);
                var ext = extMan.getItemForID(this.addonID);
                ext.QueryInterface(Components.interfaces.nsIUpdateItem);
                this.checkVersion(ext.version);
                return;
            }

            if (typeof(Components.utils) != 'undefined' && typeof(Components.utils.import) != 'undefined')
            {
                Components.utils.import("resource://gre/modules/AddonManager.jsm", ascope);
            }

            ascope.AddonManager.getAddonByID(this.addonID, function (addon) {fnxweb.urllink.common.checkVersion(addon.version);} );
        }
    },


    /* utf8Encode funny characters */
    utf8Encode: function (url)
    {
        var retval = '';
        var len = url.length;
        for (var i = 0; i < len; ++i)
        {
            var ch = url.charAt(i);
            /* Include certain chars we'll let through even though they're not 'valid' */
            if( /[A-Za-z0-9-_.!~*'():/%?&=#@]/.test(ch) )
            {
                /* Allowed */
                retval += ch;
            }
            else
            {
                /* Must encode */
                retval += encodeURIComponent( url[i] );
            }
        }
        return retval;
    },


    /* make sure URL has some sort of protocol, & change common 'errors' */
    fixURL: function (url)
    {
        /* Check proto */
        if (url.search(/^mailto:/) == -1  &&  url.search(/^[-_\w]+:\/\//) == -1)
        {
            if (url.search(/^ftp/) == 0)
            {
                url = 'ftp://' + url;
            }
            else if (url.search(/@/) >= 0)
            {
                url = 'mailto:' + url;
            }
            else
            {
                url = 'http://' + url;
            }
        }

        /* Change common faults */
        url = url.replace(/&amp;/ig,'&');

        /* UTF-8 encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
         * but that seems to be illegal.
         */
        url = this.utf8Encode(url);

        return url;
    },


    /* Check variable is defined (used for ContextMenu against key chortcuts */
    isDefined: function ( variable )
    {
        return (typeof(window[variable]) == 'undefined')? false : true;
    },


    /* Tidy up selected string */
    tidySelection: function ( str )
    {
        str = str.replace('\xAD','');                   /* seen in Google 'did you mean' links */
        str = str.replace('\xA0','');                   /* seen in Thunderbird compose window */
        str = str.replace(/\t/g, ' ');                  /* tabs to space */
        str = str.replace(/^[\n\r ]+/, '');             /* strip leading space */
        str = str.replace(/((\n|\r) *>[> ]*)+/g, '');   /* remove standard quote marks */
        str = str.replace(/[\n\r ]+$/, '');             /* strip spaces at the end */
        str = str.replace(/\\/g,'/');                   /* backslash to forward slash */
        str = str.replace(/(\n|\r| )+/g, ' ');          /* amy remaining multiple newlines/spaces to single spaces */
        return str;
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


    /* Extract accelkey from label */
    extractLabel: function ( accel, label )
    {
        var idx = label.val.search(/&/);
        if (idx != -1)
        {
            accel.val = label.val[idx+1];
            label.val = label.val.substr(0,idx) + label.val.substr(idx+1);
        }
    },


    /* Pull out | and & bits from format string */
    processFormat: function ( formatstr, withstr, accel, text, format )
    {
        /* formatstr = 'displaystr|format' */
        var barpos = formatstr.search('\\|');
        if (barpos == -1)
        {
            format.val = formatstr;
            this.extractLabel( accel, format );
            text.val = withstr + " '" + format.val + "'";
        }
        else
        {
            text.val = formatstr.substr(0,barpos);
            format.val = formatstr.substr(barpos+1);
            this.extractLabel( accel, text );
        }
    },


    /* Process menu format strings into menu items */
    generateMenuItem: function ( submenu, func, astab, withStr, formatstr )
    {
        /* Create menuitem */
        var menuitem;
        if (formatstr.search(/^--*$/) == 0)
        {
            menuitem = document.createElement('menuseparator');
        }
        else
        {
            menuitem = document.createElement('menuitem');
        }
        if (menuitem)
        {
            var accel = {val:''};
            var text = {val:''};
            var format = {val:''};

            /* Pull out | and & bits */
            this.processFormat( formatstr, withStr, accel, text, format );

            /* Flesh out menu */
            menuitem.setAttribute('label', text.val);
            if (accel.val != '')
                menuitem.setAttribute('accesskey', accel.val);
            menuitem.setAttribute('oncommand', func+"(event,"+astab+",'"+format.val+"')");
            menuitem.setAttribute('temp','true');
            submenu.appendChild(menuitem);
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
            if (submenu.childNodes[i].hasAttribute('temp'))
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
        var withStr = ( stringdb ? stringdb.getString('popup-urllink-open-as') : '' );

        if (this.prefs.getPrefType('submenu.0') != this.nsIPrefBranch.PREF_STRING)
        {
            /* Nothing yet */
            for (var i = 0;  i < this.defaultMenuItems.length;  i++)
            {
                var formatstr = this.defaultMenuItems[i];
                if (formatstr)
                    this.generateMenuItem( submenu, func, astab, withStr, formatstr );
            }
        }
        else
        {
            /* Load prefs */
            var n = 0;
            while (this.prefs.getPrefType('submenu.'+n) == this.nsIPrefBranch.PREF_STRING  &&
                   this.prefs.prefHasUserValue('submenu.'+n))
            {
                var formatstr = this.prefs.getCharPref('submenu.'+n);
                if (formatstr)
                    this.generateMenuItem( submenu, func, astab, withStr, formatstr );
                n++;
            }
        }
    },


    /* Perform an individual preference-defined search and replace operation on the given string */
    singleSearchAndReplace: function (str,sandr)
    {
        /* Separate out lhs (regex) and rhs (repl) */
        var barpos = sandr.search('\\|\\|');
        if (barpos != -1)
        {
            /* Got 'em */
            var restr = sandr.substr(0,barpos);
            var repl = sandr.substr(barpos+2);
            var reopt = '';

            /* May have regex opts (e.g. 'g')
             * Use 'D' for debug alerts
             */
            var barpos = repl.search('\\|\\|');
            if (barpos != -1)
            {
                reopt = repl.substr(barpos+2);
                repl = repl.substr(0,barpos);
            }

            /* Debug? */
            var actualreopt = reopt.replace(/D/,'');
            var debug = (actualreopt != reopt);

            /* Do it */
            if (restr)
            {
                var regex = new RegExp( restr, actualreopt );
                if (regex)
                {
                    var newstr = str.replace( regex, repl );
                    if (debug)
                    {
                        alert( "URL Link debug\nConversion: '" + sandr + "'\nFrom: '" + str + "'\nTo: '" + newstr + "'" );
                    }
                    str = newstr;
                }
            }
        }
        return str;
    },


    /* Perform the preference-defined search and replace operations on the given string */
    customSearchAndReplace: function (str)
    {
        /* Any user defined ones? */
        if (this.prefs.getPrefType('sandr.0') != this.nsIPrefBranch.PREF_STRING)
        {
            /* Nothing yet */
            for (var i = 0;  i < this.defaultSandrItems.length;  i++)
            {
                var sandr = this.defaultSandrItems[i];
                if (sandr)
                    str = this.singleSearchAndReplace(str,sandr);
            }
        }
        else
        {
            /* Load prefs */
            var n = 0;
            while (this.prefs.getPrefType('sandr.'+n) == this.nsIPrefBranch.PREF_STRING  &&
                   this.prefs.prefHasUserValue('sandr.'+n))
            {
                var sandr = this.prefs.getCharPref('sandr.'+n);
                if (sandr)
                    str = this.singleSearchAndReplace(str,sandr);
                n++;
            }
        }
        return str;
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
        var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance();
        messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
        messenger.launchExternalURL(url);
    }

}