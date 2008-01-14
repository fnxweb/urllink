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
    urllinkBrowserMenuSep : 'urllink-browser-sep-',
    urllinkBrowserMenuItems : [
        'urllink-browser-open-tab',
        'urllink-browser-open-link' ],
    urllinkAlternateBrowserMenuItems : [
        'urllink-browser-open-tab-as',
        'urllink-browser-open-link-as' ],
    urllinkAlternateBrowserMenus : [
        'urllink-browser-open-link-as-popup', /* Order sic. */
        'urllink-browser-open-tab-as-popup' ],

    urllinkMailMenuSep : 'urllink-mail-sep-',
    urllinkMailMenuItems : [
        'urllink-mail-open-link' ],
    urllinkAlternateMailMenuItems : [
        'urllink-mail-open-link-as' ],
    urllinkAlternateMailMenus : [
        'urllink-mail-open-link-as-popup' ],

    isInThunderbird : false,
    checkedIsInThunderbird : false,


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


    inThunderbird: function ()
    {
        if (!this.checkedIsInThunderbird)
        {
            this.checkedIsInThunderbird = true;
            if (navigator.userAgent.search(/Thunderbird/gi) != -1)
                this.isInThunderbird = true;
        }
        return this.isInThunderbird;
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
            Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
        this.ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
        this.prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).
            getBranch('extensions.urllink.');

        this.inThunderbird();

        if (!this.prefs.prefHasUserValue('firsttime'))
        {
            var stringdb = this.getStringbundle();
            if (stringdb)
            {
                var intro = stringdb.getString('intro-message');
                this.prefs.setBoolPref('firsttime',true);
                alert(intro);
            }
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
            if( /[A-Za-z0-9-_.!~*'():/%?&=]/.test(ch) )
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
        url.replace(/&amp;/ig,'&');

        /* UTF-8 encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
         * but that seems to be illegal.
         */
        url = urllinkCommon.utf8Encode(url);

        return url;
    },


    /* Tidy up selected string */
    tidySelection: function ( str )
    {
        str = str.replace(/\t/g, ' ');              /* tabs to space */
        str = str.replace(/^[\n\r ]+/, '');         /* strip leading space */
        str = str.replace(/((\n|\r)[> ]*)+/g, '');  /* remove standard quote marks */
        str = str.replace(/[\n\r ]+$/, '');         /* strip spaces at the end */
        str = str.replace(/\\/g,'/');               /* backslash to forward slash */
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
                var menuitem = document.createElement('menuitem');
                if (menuitem)
                {
                    var accel = {val:''};
                    var text = {val:''};
                    var format = {val:''};

                    /* Pull out | and & bits */
                    this.processFormat( formatstr, withStr, accel, text, format );

                    /* Flesh out menu */
                    menuitem.setAttribute('label', withStr+" '"+format.val+"'");
                    if (accel.val != '')
                        menuitem.setAttribute('accesskey', accel.val);
                    menuitem.setAttribute('oncommand', func+'(event,'+astab+",'"+format.val+"')");
                    menuitem.setAttribute('temp','true');
                    submenu.appendChild(menuitem);
                }
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
        var messenger = Components.classes['@mozilla.org/messenger;1'].createInstance();
        messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
        messenger.launchExternalURL(url);
    }

}


//window.addEventListener('load', urllinkCommon.urllinkInit, true);
