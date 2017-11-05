// Main URL Link extension code
//
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


// Prefs.
var prefs = {};

// Comms to page code
var comms;

// Debug enabled?
let debug = false;

// Current menu control - not just one bool, to cater for start-up when notrhing needs deleting
var currentMenuUrl = false; // current menu is for a URL
var currentMenuTxt = false; // current menu is for text
var menuChanged    = false; // need to rebuild text menu anyway due to prefs change
var submenuCount   = 0;     // number of submenus created from prefs (for later deletion)

// Current active selection
var activeSelection = "";

// Functionality checks
var firefoxVersion = 56;  // min release


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
    // formatstr = 'displaystr|format'
    let barpos = formatstr.indexOf("|");
    if (barpos === -1)
    {
        // Normal
        return formatstr;
    }
    else
    {
        // Custom
        return formatstr.substr( barpos+1 );
    }
}


// Create selection submenu items for each of the two non-URL selection menus
function onContextMenuCreated( menuId )
{
    // Create always-there menus
    let text = removeAccess( browser.i18n.getMessage("unaltered") );
    browser.menus.create({
        id: menuId + "-unaltered",
        title: text,
        parentId: menuId
    });

    // Now create prefs menus
    if (prefs.hasOwnProperty("submenus"))
    {
        // Separator
        browser.menus.create({
            id: menuId + "-separator",
            parentId: menuId,
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
                browser.menus.create({
                    id: menuId + "-pref-" + n,
                    parentId: menuId,
                    type: "separator"
                });
            }
            else
            {
                // Menu item
                browser.menus.create({
                    id: menuId + "-pref-" + n,
                    title: getMenuText( formatstr ),
                    parentId: menuId
                });
            }
        }
        submenuCount = prefs.submenus.length;
    }
}


// Remove selection submenu items for the given ID
function removeContextMenuItems( menuId )
{
    // Remove always-there menu
    browser.menus.remove( menuId + "-unaltered" );

    // Now prefs menus
    if (submenuCount)
    {
        browser.menus.remove( menuId + "-separator" );
        for (let n = 0;  n < submenuCount;  ++n)
            browser.menus.remove( menuId + "-pref-" + n );
    }

    // And the top-level one
    browser.menus.remove( menuId );
}


// Create primary context menus/items
function createContextMenus()
{
    // Selection analysis
    // TBD selection analysis here;  currently, there is no point since we can't update the context menu once it's
    //     been displayed, inc. deleting items.
    //     Need something like onBeforeShow event.  See https://bugzilla.mozilla.org/show_bug.cgi?id=1215376
    //     For now, all we can do is just always hide the URL menu items, and always show the text ones.
    //     Basic functionality will only then work thorugh the “Unaltered” option of the text menu :-(
    //     Most of the logic below is thus redundant, but keep it under the hope we'll get the old ability back.
    //     WE NEED TO CALL THIS UPON PREFS CHANGES FOR THE TIME BEING TO ENSURE IT'S CREATED BEFORE IT'S NEEDED.
    //     Rejig whenever the above bug is included (allows dynamic menu updating) - not in FF dev as of end Oct '17!!

    /// let isUrl = (activeSelection.search(/^(http|ftp)/) >= 0);

    // Menus required
    let wantUrlMenu = false; /// isUrl;
    let wantTxtMenu = true;  /// (!isUrl  ||  prefs["forcesubmenu"]);


    // Delete old?
    if (currentMenuUrl  &&  !wantUrlMenu)
    {
        // Delete old URL menus
        currentUrlMenu = false;
        browser.menus.remove( "open-selected-url-in-new-tab" );
        browser.menus.remove( "open-selected-url" );
        browser.menus.remove( "main-menu-separator" );
        browser.menus.remove( "main-menu-help" );
    }
    if ((currentMenuTxt  &&  !wantTxtMenu)  ||  menuChanged)
    {
        // Delete old text menus
        currentTxtMenu = false;
        removeContextMenuItems( "open-selection-in-new-tab" );
        removeContextMenuItems( "open-selection" );
        browser.menus.remove( "main-menu-separator" );
        browser.menus.remove( "main-menu-help" );
    }


    // Direct trigger menu items
    let createdMenus = false;
    if (wantUrlMenu  &&  !currentMenuUrl)
    {
        createdMenus = true;
        currentMenuUrl = true;

        browser.menus.create({
            id: "open-selected-url-in-new-tab",
            title: removeAccess( browser.i18n.getMessage("open-selected-url-in-new-tab") ),
            contexts: ["selection","link"]
        });
        browser.menus.create({
            id: "open-selected-url",
            title: removeAccess( browser.i18n.getMessage("open-selected-url") ),
            contexts: ["selection","link"]
        });
    }

    // Sub-menus for text
    if (wantTxtMenu  &&  (!currentMenuTxt  ||  menuChanged))
    {
        createdMenus = true;
        currentMenuTxt = true;
        menuChanged = false;

        browser.menus.create({
            id: "open-selection-in-new-tab",
            title: removeAccess( browser.i18n.getMessage("open-selection-in-new-tab") ),
            contexts: ["selection","link"]
        }, () => { onContextMenuCreated("open-selection-in-new-tab",true); } );
        browser.menus.create({
            id: "open-selection",
            title: removeAccess( browser.i18n.getMessage("open-selection") ),
            contexts: ["selection","link"]
        }, () => { onContextMenuCreated("open-selection",false); } );
    }

    // Created anything?
    if (createdMenus)
    {
        // Separator
        browser.menus.create({
            id: "main-menu-separator",
            type: "separator",
            contexts: ["selection","link"]
        });
        // Help TBD will become Prefs with will have a Help link
        browser.menus.create({
            id: "main-menu-help",
            title: browser.i18n.getMessage("help"),
            contexts: ["selection","link"]
        });
    }
}


// Default prefs.
function defaultPrefs()
{
    return {

        // Simple ones
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
            'In &Google|http://www.google.com/search?q=*&source-id=mozilla%20firefox&start=0',
            'In Wi&kipedia|http://en.wikipedia.org/wiki/special:search?search=*&sourceid=mozilla-search'
                ],

        // Search and replace
        "sandr" : [
            '^//||file:///',            // convert Windows UNC into file: URL
            '^([A-Za-z]:)||file:///$1'  // convert Windows drive letter into file: URL
            ]

    };
}


// For deleted prefs.
// TBD when certain
function deleteOldPrefs()
{
    delete prefs["topmenu"];
}



// Page message handler
function onMessage(message)
{
    if (debug)
        console.log("URL Link message from page: " + JSON.stringify(message));
    if (message["message"] === "contextMenu")
        activeSelection = message["selection"];

    // Now we can create menus
    // TBD no point re-doing them until FF supports regen. of menus on the fly (see above bug link)
    ///createContextMenus();
}


// utf8Encode funny characters
function utf8Encode(url)
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

    // UTF-8 encode the URL to get rid of illegal characters. 'escape' would give us '%uXXXX's here,
    // but that seems to be illegal.
    // Addendum:  let's not do this for Windows file: links, as an attempt to correctly handle non-Latin1
    // filenames
    if (url.search(/^(\/\/|[A-Za-z]:|file:\/\/\/[A-Za-z]:)/) != 0)
        url = utf8Encode(url);

    return url;
}


// Handle request to open a link from a menu selection
function openLink( menuItemId, tabId, withShift )
{
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

    if (debug)
        console.log( `URL Link: ${menuItemId} using '${prefix}' + '${activeSelection}' + '${suffix}'` );

    // Continue processing selection (it has been unmangled by the content script)
    let lnk = activeSelection;
    if (lnk == '')
        return;
    lnk = fixURL( prefix + lnk + suffix );

    if (debug)
        console.log( `URL Link: fixed '${lnk}'` );

    if (inTab)
    {
        // Tab
        let props = {
            "active": !prefs["inbackground"],
            "url": lnk
        };
        if (firefoxVersion >= 57)
            props["openerTabId"] = tabId;
        browser.tabs.create( props );
    }
    else
    {
        // New window?  And <Shift> selects oppopsite of current pref.
        var newWindow = ( (!prefs.newwindow  &&  withShift)  ||  (prefs.newwindow  &&  !withShift) );
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
        if (debug)
            console.log("URL Link found prefs.: " + JSON.stringify(prefs));
    }
    else
    {
        if (debug)
            console.log("URL Link found no valid prefs.: " + JSON.stringify(results));
    }

    // Validate
    let defaults = defaultPrefs();
    let writePrefs = false;
    if (!prefs.hasOwnProperty("lastversion"))
    {
        if (debug)
            console.log("URL Link not found prefs., setting defaults");
        prefs = defaults;
        if (debug)
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
    }

    // Check version
    let thisVn = browser.runtime.getManifest().version;
    if (prefs["lastversion"] !== thisVn)
    {
        prefs["lastversion"] = thisVn;
        writePrefs = true;
    }

    // Re-write prefs?
    if (writePrefs)
        browser.storage.local.set({"preferences": prefs});

    // Tell window our prefs. if comms are up
    if (typeof(comms) !== "undefined")
        comms.postMessage({"message":"urllink-prefs", "prefs": prefs});

    // TBD until we can create the context menu dynamically/*IN TIME*, must pre-create it now.
    createContextMenus();
},
error => {
    console.log(`URL Link prefs. fetch error '${error}'`);
});


// Add menu handler
browser.menus.onClicked.addListener( (info, tab) => {
    // Selection stats
    let withShift = (info.modifiers.includes("Shift"));

    // On tab?
    let tabId = tab.id;

    // Help?
    if (info.menuItemId === "main-menu-help")
    {
        // Help window
        openHelpWindow();
    }
    else
    {
        // Handle menu option
        openLink( info.menuItemId, tabId, withShift );
    }
});


// Create comms with page code
browser.runtime.onConnect.addListener( port => {
    // Connected
    comms = port;

    // If we have our prefs yet, send them
    if (prefs.hasOwnProperty("lastversion"))
        comms.postMessage({"message":"urllink-prefs", "prefs": prefs});

    // Messages from page
    comms.onMessage.addListener( onMessage );
});


// Finally - changed?
browser.runtime.onInstalled.addListener( details => {
    // Maybe not do this this on minor versions ...
    if (details.reason === "update")
    {
        // Show changelog
        browser.tabs.create({ "url": "history.html" });

        // Update known version
        if (prefs.hasOwnProperty("lastversion"))
        {
            prefs["lastversion"] = browser.runtime.getManifest().version;
            browser.storage.local.set({"preferences": prefs});
        }
    }
});
