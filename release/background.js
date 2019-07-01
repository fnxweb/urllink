// Main URL Link extension code
//   background.js
//
// Copyright (C) Neil Bird
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


// Prefs.
var prefs = { "debug": false };

// Comms to page codes
var comms = [];

// Current menu control - not just one bool, to cater for start-up when notrhing needs deleting
var currentUrlMenu = false; // URL menu is set up
var currentTxtMenu = false; // text menu is set up
var menuChanged    = false; // need to rebuild text menu anyway due to prefs change
var submenuCount   = 0;     // number of text submenus created from prefs (for later deletion)

// Current active selection
var activeSelection = "";

// Index into comms of last context menu trigger
var lastComms = -1;

// Functionality checks
var firefoxVersion = 56;  // min release

// Menus being deleted (need to waiut for them all to go before recreating so as to not dup. IDs)
var menusDeleting = 0;

// Menus required
let wantUrlMenu = false; /// isUrl;
let wantTxtMenu = true;  /// (!isUrl  ||  prefs.forcesubmenu);


// Extract accelkey from label
// TBD I don't know, this is getting ridiculous.  No menu accesskeys in webextensions yet!
//     https://bugzilla.mozilla.org/show_bug.cgi?id=1320462
// Going to go on the presumption that FF will honour & in text as Chrome does, and not have to set the shortcut
// as a separate field like we had to do with XUL.  So for now, this is just a stub to clean up the text so & isn't displayed.
function removeAccess( label )
{
    let idx = label.search(/&/);
    if (idx !== -1)
        return label.substr(0,idx) + label.substr(idx+1);
    return label;
}


// Return text to display in menu given format string
function getMenuText( formatstr )
{
    // formatstr = 'displaystr|format'
    let barpos = formatstr.indexOf("|");
    if (barpos === -1)
    {
        // Normal
        return browser.i18n.getMessage( "with-option", removeAccess( formatstr ) );
    }
    else
    {
        // Custom
        return removeAccess( formatstr.substr( 0, barpos ) );
    }
}


// Return actual format part out of menu given format string
function getMenuFormat( formatstr )
{
    // formatstr = 'format' or 'displaystr|format'
    let barpos = formatstr.indexOf("|");
    if (barpos === -1)
    {
        // Normal - menu entry is the format
        // NB: we strip menu-shortcut '&'s here;  if you have a URL that legitimately contains
        // an ampersand, and this would be before a menu shortcut (‽), to stop it being stripped
        // you just have to give a label.  Or double && I guess.
        return removeAccess( formatstr );
    }
    else
    {
        // Custom - format comes after the vertical bar
        return formatstr.substr( barpos+1 );
    }
}


// Wrap browser.menus.create for optional parentId
function browserMenusCreate( parentId, options )
{
    // Only add parent if it's set
    if (parentId !== "")
        options.parentId = parentId;

    // Do it
    browser.menus.create( options );
}


// Create selection submenu items for each of the two non-URL selection menus
function onContextMenuCreated( menuId, useAsParent )
{
    // Parent ID to use - to cater for the text submenu being promoted to the main menu
    let parentId = ( useAsParent  ?  menuId  :  "" );

    // Create always-there menus
    let text = removeAccess( browser.i18n.getMessage("unaltered") );
    browserMenusCreate( parentId, {
        id: menuId + "-unaltered",
        title: text
    });

    // Now create prefs menus
    if (prefs.hasOwnProperty("submenus"))
    {
        // Separator
        browserMenusCreate( parentId, {
            id: menuId + "-separator",
            type: "separator"
        });

        // Prefs.
        for (let n in prefs.submenus)
        {
            let formatstr = prefs.submenus[n];

            // Watch for custom separators
            if (formatstr.search(/^-+$/) === 0)
            {
                // Sep.
                browserMenusCreate( parentId, {
                    id: menuId + "-pref-" + n,
                    type: "separator"
                });
            }
            else
            {
                // Menu item
                browserMenusCreate( parentId, {
                    id: menuId + "-pref-" + n,
                    title: getMenuText( formatstr )
                });
            }
        }
        submenuCount = prefs.submenus.length;
    }
}


// Remove a menu, keeping count
function browserMenusRemove( id )
{
    ++menusDeleting;
    browser.menus.remove( id ).then( result => {
        // Upon last deletion performed, can recreate menu tree
        --menusDeleting;
        if (menusDeleting == 0)
            createContextMenus()
    }).catch( result => {
        console.error("URL Link menu deletion failed");
    });
}


// Remove selection submenu items for the given ID
function removeContextMenuItems( menuId )
{
    // Remove always-there menu
    browserMenusRemove( menuId + "-unaltered" );

    // Now prefs menus
    if (submenuCount)
    {
        browserMenusRemove( menuId + "-separator" );
        for (let n = 0;  n < submenuCount;  ++n)
            browserMenusRemove( menuId + "-pref-" + n );
    }

    // And the top-level one
    browserMenusRemove( menuId );
}


// Refresh primary context menus/items
function updateContextMenus()
{
    if (prefs.debug)
        console.log("URL Link updating context menus");

    // Selection analysis
    // TBD selection analysis here;  currently, there is no point since we can't update the context menu once it's
    //     been displayed, inc. deleting items.
    //     Need something like onBeforeShow event.  See https://bugzilla.mozilla.org/show_bug.cgi?id=1215376
    //     For now, all we can do is just always hide the URL menu items, and always show the text ones.
    //     Basic functionality will only then work thorugh the “Unaltered” option of the text menu :-(
    //     Most of the logic below is thus redundant, but keep it under the hope we'll get the old ability back.
    //     WE NEED TO CALL THIS UPON PREFS CHANGES FOR THE TIME BEING TO ENSURE IT'S CREATED BEFORE IT'S NEEDED.
    //     Rejig whenever the above bug is included (allows dynamic menu updating) - not in FF dev as of end Oct '17!!

    /// let isUrl = (activeSelection.search(/^(https?|ftp)/) >= 0);

    // Menus required
    wantUrlMenu = false; /// isUrl;
    wantTxtMenu = true;  /// (!isUrl  ||  prefs.forcesubmenu);

    // Any change at all?
    if (wantUrlMenu === currentUrlMenu  &&  wantTxtMenu === currentTxtMenu  &&  !menuChanged)
        return;

    // In order to keep menu ordering the same, we have to always delete and re-create our menus (if they've changed).
    menusDeleting = 0;
    if (currentUrlMenu)
    {
        // Delete old URL menus
        currentUrlMenu = false;
        browserMenusRemove( "open-selected-url-in-new-tab" );
        browserMenusRemove( "open-selected-url" );
        browserMenusRemove( "main-menu-separator" );
        browserMenusRemove( "main-menu-help" );
    }
    if (currentTxtMenu)
    {
        // Delete old text menus
        currentTxtMenu = false;
        removeContextMenuItems( "open-selection-in-new-tab" );
        removeContextMenuItems( "open-selection" );
        browserMenusRemove( "main-menu-separator" );
        browserMenusRemove( "main-menu-help" );
        browserMenusRemove( "main-menu-prefs" );
    }

    // Await all deletions before recreating
    if (menusDeleting === 0)
        createContextMenus();
}


function createContextMenus()
{
    if (prefs.debug)
        console.log("URL Link creating context menus");

    // Direct trigger menu items
    if (wantUrlMenu)
    {
        currentUrlMenu = true;

        if (!prefs.hidetab)
            browser.menus.create({
                id: "open-selected-url-in-new-tab",
                title: removeAccess( browser.i18n.getMessage("open-selected-url-in-new-tab") ),
                contexts: ["selection","link"]
            });
        if (!prefs.hideopen)
            browser.menus.create({
                id: "open-selected-url",
                title: removeAccess( browser.i18n.getMessage("open-selected-url") ),
                contexts: ["selection","link"]
            });
    }

    // Sub-menus for text
    // However, if only one of the sub-menus is enabled (open here or open tab) then we don't need another submenu,
    // so add the items to the parent.  The always-show-submenu option overrides this.
    if (wantTxtMenu  ||  menuChanged)
    {
        currentTxtMenu = true;
        menuChanged = false;

        // Just one or both?
        if (!prefs.forcesubmenu  &&  !prefs.hidetab  &&  prefs.hideopen)
        {
            // Doing new-tab open only, include on main menu
            onContextMenuCreated( "open-selection-in-new-tab", false );
        }
        else if (!prefs.forcesubmenu  &&  prefs.hidetab  &&  !prefs.hideopen)
        {
            // Doing straight open only, include on main menu
            onContextMenuCreated( "open-selection", false );
        }
        else
        {
            // Want both (or forcing submenu), need submenus to distinguish which
            if (!prefs.hidetab)
                browser.menus.create({
                    id: "open-selection-in-new-tab",
                    title: removeAccess( browser.i18n.getMessage("open-selection-in-new-tab") ),
                    contexts: ["selection","link"]
                }, () => onContextMenuCreated( "open-selection-in-new-tab", true ) );
            if (!prefs.hideopen)
                browser.menus.create({
                    id: "open-selection",
                    title: removeAccess( browser.i18n.getMessage("open-selection") ),
                    contexts: ["selection","link"]
                }, () => onContextMenuCreated( "open-selection", true ) );
        }
    }

    // Separator
    browser.menus.create({
        id: "main-menu-separator",
        type: "separator",
        contexts: ["selection","link"]
    });
    // Help
    browser.menus.create({
        id: "main-menu-help",
        title: browser.i18n.getMessage("help"),
        contexts: ["selection","link"]
    });
    // Prefs
    browser.menus.create({
        id: "main-menu-prefs",
        title: browser.i18n.getMessage("prefs"),
        contexts: ["selection","link"]
    });
}


// Default prefs.
function defaultPrefs()
{
    return {

        // Simple ones
        "debug"        : false,
        "firsttime"    : false,
        "forcesubmenu" : false,
        "hideopen"     : false,
        "hidetab"      : false,
        "inbackground" : false,
        "lastversion"  : '',
        "newwindow"    : false,
        "topmenu"      : true,

        // Sub-menus
        "submenus" : [
            '&www.*',
            'www.*.&com',
            'www.*.&org',
            'www.*.&net',
            '&ftp.*',
            '--',
            'In &Google|https://www.google.com/search?q=*&source-id=mozilla%20firefox&start=0',
            'In Wi&kipedia|https://en.wikipedia.org/wiki/special:search?search=*&sourceid=mozilla-search'
                ],

        // Search and replace
        "sandr" : [
            '^//([^/])||file://///$1',  // convert Windows UNC into file:///// URL - was erroneously '^//||file:///'
            '^([A-Za-z]:)||file:///$1'  // convert Windows drive letter into file:/// URL
            ]

    };
}


// Page message handler
function onMessage( message, senderPort )
{
    if (prefs.debug)
        console.log("URL Link message from page: " + JSON.stringify(message));

    // Remember where message came from
    lastComms = -1;
    for (let port = 0;  port < comms.length;  ++port)
        if (comms[port] === senderPort)
        {
            lastComms = port;
            break;
        }

    // Which message?
    if (message["message"] === "contextMenu")
        // Menu started
        activeSelection = message["selection"];
    else if (message["message"] === "urllink-prefs-req")
        // New page has asked for prefs, broadcast it
        senderPort.postMessage({"message":"urllink-prefs", "prefs": prefs});
    else if (message["message"] === "urllink-prefs-defaults-req")
        // Default prefs. requested (prbably prefs. page' Defaults button), send them back
        senderPort.postMessage({"message":"urllink-prefs-defaults", "prefs": defaultPrefs()});
    else if (message["message"] === "urllink-prefs-changed")
    {
        // New prefs. have been saved;  pass to all pages
        prefs = message["prefs"];
        menuChanged = true;
        for (let port in comms)
            comms[port].postMessage({"message":"urllink-prefs", "prefs": prefs});

        // TBD rebuild menus now while we're not doing it on the fly
        updateContextMenus();
    }
    else
        console.error("URL Link unrecognised message: " + JSON.stringify(message));

    // Now we can create menus
    // TBD no point re-doing them until FF supports regen. of menus on the fly (see above bug link)
    ///updateContextMenus();
}


// Hex encode funny characters ("%xx")
function hexEncode(url)
{
    let retval = '';
    let len = url.length;
    for (let i = 0; i < len; ++i)
    {
        let ch = url.charAt(i);
        // Include certain chars we'll let through even though they're not 'valid'
        if( /[A-Za-z0-9-_.!~*'():/%?&=#@]/.test(ch) )
        {
            // Allowed
            retval += ch;
        }
        else
        {
            // Must encode
            retval += encodeURIComponent( url[i] );
        }
    }
    return retval;
}


// make sure URL has some sort of protocol, & change common 'errors'
function fixURL(url)
{
    // Stop here if target URL is Javascript;  don't want to break it
    if (url.search(/^javascript:/) != -1)
        return url;

    // Check whether proto supplied
    if (url.search(/^mailto:/) == -1  &&  url.search(/^[-_\w]+:\/\//) == -1)
    {
        // Add presumed proto if none given
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

    // Change common faults
    url = url.replace(/&amp;/ig,'&');

    // Hex encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
    // but that seems to be illegal.
    // Addendum:  let's not do this for Windows file: links, as an attempt to correctly handle non-Latin1
    // filenames (file:///X:/ or file://///server/share/)
    if (url.search(/^(\/\/|[A-Za-z]:|file:\/\/\/[A-Za-z]:)|file:\/\/\/\/\//) != 0)
        url = hexEncode(url);

    return url;
}


// Handle request to open a link from a menu selection
function openLink( menuItemId, tabId, mods )
{
    // Shouldn't come in here with no selection now.
    if (activeSelection.length === 0)
    {
        console.error("URL Link triggered with no selection");
        return;
    }

    // In new tab?
    let inTab = (menuItemId.indexOf("-in-new-tab") > 0);

    // ID custom option
    let prefix = '';
    let suffix = '';
    let customPref = menuItemId.match(/-pref-([0-9]+)/);
    if (customPref  &&  customPref.length == 2)
    {
        // Use custom pref.
        let pref = parseInt( customPref[1] );
        let format = getMenuFormat( prefs.submenus[pref] );
        let starPos = format.search(/\*/);
        if (starPos == -1)
        {
            prefix = format;
            suffix = '';
        }
        else
        {
            prefix = format.substr(0,starPos);
            suffix = format.substr(starPos+1);
        }
    }

    if (prefs.debug)
        console.log( `URL Link: ${menuItemId} using '${prefix}' + '${activeSelection}' + '${suffix}'` );

    // Continue processing selection (it has been unmangled by the content script)
    let lnk = activeSelection;
    if (lnk == '')
        return;
    lnk = prefix + lnk + suffix;

    // |p on the end of a URL denotes always-open-in-private-window
    let optidx = lnk.search(/\|p/i);
    if (optidx != -1)
    {
        // Have options
        let opts = lnk.substr(optidx);
        lnk = lnk.substr( 0, optidx );

        // Which?
        if (opts.search(/p/i) != -1)
            mods.ctrl = true;

        if (prefs.debug)
            console.log( `URL Link: options '${opts}'` );
    }

    // Fix up the link
    lnk = fixURL( lnk );
    if (prefs.debug)
        console.log( `URL Link: fixed '${lnk}'` );

    // file?
    let force_active = false;
    if (lnk.search("file:") == 0)
    {
        // TBD we can't open file links at the moment.  Put in into the clipboard and get the user to use it.
        // Also, we can't write to the clipboard from here, so send it back to the page ...
        // Nothing we can do if the comms/port detection has failed :-(
        if (lastComms >= 0  &&  lastComms < comms.length)
        {
            comms[lastComms].postMessage({"message":"urllink-set-clipboard", "text":lnk});
        }
        else
        {
            console.error("URL Link failed to determine origin tab for '" + lnk + "' request, can't set clipboard!")
            return;
        }
        lnk = browser.extension.getURL( "manual.html");
        force_active = true;
    }

    // How to open?
    // Ctrl overrides all, sends to private window
    if (mods.ctrl)
    {
        // Private window
        browser.windows.create({
            // TBD unsupported by Firefox @v56-57dev  "focused": true,
            "url": lnk,
            "incognito": true
        });
    }
    else
    {
        // Normal, honour relevant menu
        if (inTab)
        {
            // Tab
            let props = {
                "active": !prefs.inbackground || force_active,
                "url": lnk
            };
            if (firefoxVersion >= 57)
                props["openerTabId"] = tabId;
            browser.tabs.create( props );
        }
        else
        {
            // New window?  And <Shift> selects oppopsite of current pref.
            var newWindow = ( (!prefs.newwindow  &&  mods.shift)  ||  (prefs.newwindow  &&  !mods.shift) );
            if (newWindow)
            {
                // New window
                browser.windows.create({
                    // TBD unsupported by Firefox @v56-57dev  "focused": true,
                    "url": lnk
                });
            }
            else
            {
                // Follow link
                browser.tabs.update(
                    tabId,
                    { "url": lnk }
                );
            }
        }
    }

    // Done with that selection (get it again next context-click)
    activeSelection = "";
}


// Open correct help window
function openHelpWindow()
{
    // Useful trick to determine which of our locales is actually in use ...
    let currentLocale = browser.i18n.getMessage( "__locale" );
    let lnk = browser.extension.getURL( `_locales/${currentLocale}/help.html` );

    // Open help
    browser.windows.create({
        // TBD unsupported by Firefox @v56-57dev  "focused": true,
        "url": lnk
    });
}



//// Start

// Check FF version for API compatibility
browser.runtime.getBrowserInfo().then( result => {
    if (result.hasOwnProperty("version"))
    {
        let match = result["version"].match(/^([0-9]+)/);
        if (match  &&  match.length == 2)
            firefoxVersion = parseInt( match[1] );
    }
});

// Read prefs.
browser.storage.local.get("preferences").then( results => {
    // Have something
    if (results.hasOwnProperty("preferences"))
    {
        prefs = results["preferences"];
        if (prefs.debug)
            console.log("URL Link found prefs.: " + JSON.stringify(prefs));
    }
    else
    {
        if (prefs.debug)
            console.log("URL Link found no valid prefs.: " + JSON.stringify(results));
    }

    // Validate - ensure stored prefs have any nbew prefs and old ones are binned
    let defaults = defaultPrefs();
    let writePrefs = false;
    if (!prefs.hasOwnProperty("lastversion"))
    {
        // Stored prefs empty
        if (prefs.debug)
            console.log("URL Link not found prefs., setting defaults");
        prefs = defaults;
        if (prefs.debug)
            console.log("URL Link defaults: " + JSON.stringify(prefs));
        writePrefs = true;
    }
    else
    {
        // Add to current prefs. any new ones available in defaults
        for (let def in defaults)
            if (defaults.hasOwnProperty(def)  &&  !prefs.hasOwnProperty(def))
            {
                prefs[def] = defaults[def];
                writePrefs = true;
            }

        // And remove from current prefs any not in defaults any more
        for (let pref in prefs)
            if (prefs.hasOwnProperty(pref)  &&  !defaults.hasOwnProperty(pref))
            {
                delete prefs[pref];
                writePrefs = true;
            }
    }

    // Patch up old defaults - whoopsie
    if (prefs.sandr.length  &&  prefs.sandr[0] === '^//||file:///')
    {
        prefs.sandr[0] = defaults.sandr[0];
        writePrefs = true;
    }

    // Check version
    let thisVn = browser.runtime.getManifest().version;
    if (prefs.lastversion !== thisVn)
    {
        prefs.lastversion = thisVn;
        writePrefs = true;
    }

    // Re-write prefs?
    if (writePrefs)
        browser.storage.local.set({"preferences": prefs});

    // Tell window our prefs. if comms are up
    for (let port in comms)
        comms[port].postMessage({"message":"urllink-prefs", "prefs": prefs});

    // TBD until we can create the context menu dynamically/*IN TIME*, must pre-create it now.
    updateContextMenus();
},
error => {
    console.error(`URL Link prefs. fetch error '${error}'`);
});


// Add menu handler
browser.menus.onClicked.addListener( (info, tab) => {
    // Selection stats
    let withShift = (info.modifiers.includes("Shift"));
    let withCtrl  = (info.modifiers.includes("Ctrl"));

    // On tab?
    let tabId = tab.id;

    // Help?
    if (info.menuItemId === "main-menu-help")
    {
        // Help window
        openHelpWindow();
    }
    else if (info.menuItemId === "main-menu-prefs")
    {
        // Prefs window
        browser.runtime.openOptionsPage();
    }
    else
    {
        // Handle menu option
        openLink( info.menuItemId, tabId, { shift:withShift, ctrl:withCtrl } );
    }
});


// Create comms with page code
// NB - we get a new callback and port for each page, so need to capture them all
browser.runtime.onConnect.addListener( port => {
    // If we have our prefs yet, send them
    if (prefs.hasOwnProperty("lastversion"))
        port.postMessage({"message":"urllink-prefs", "prefs": prefs});

    // Connected - create port mamager object
    let idx = comms.length;

    // Messages from page
    port.onMessage.addListener( message => onMessage( message, port ) );

    // Handle loss
    port.onDisconnect.addListener( p => {
        port = null;
        comms.splice( idx, 1 );
    });

    // Remember the comms channel
    comms.push( port );
});


// Finally - changed?
browser.runtime.onInstalled.addListener( details => {
    // Maybe not do this this on minor versions ...
    if (details.reason === "update")
    {
        let showChangelog = false;

        // Check version
        if (prefs.hasOwnProperty("lastversion"))
        {
            let newvn = browser.runtime.getManifest().version;
            if (details.previousVersion !== newvn)
                showChangelog = true;

            // Update records
            prefs.lastversion = newvn;
            browser.storage.local.set({"preferences": prefs});
        }

        // Show changelog?
        if (showChangelog)
            browser.tabs.create({ "url": "changelog.html" });
    }
});


// Finally, add our required content script into all appropriate open tabs.
// Originally https://discourse.mozilla.org/t/why-content-script-does-not-work-borderify-js/10009/3
// Modifed to simply just for us.
browser.tabs.query({}).then( tabs => {
    browser.runtime.getManifest().content_scripts.forEach(({ js, css, matches, exclude_matches, }) => {
        tabs.map(({ id, url, }) => {
            if (!url  ||  url.match(/^(about|moz-extension):/)) { return; }
            // No injected CSS yet  css && css.forEach(file => browser.tabs.insertCSS(id, { file, }));
            try { js && js.forEach(file => chrome.tabs.executeScript(id, { file, }).catch( e => {} )); } catch (e) {}
        });
    });
});
