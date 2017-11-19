// URL Link preference editing control
//   preferences.js
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


// Current prefs
var prefs = {};


// Dragging starts
function onDragStart(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
    if (prefs["debug"])
        console.log("URL Link dragging '" + ev.target.id + "'");
}


// Dragging over possible target
function onDragOver(ev)
{
    ev.preventDefault();
}


// Finished dragging
function onDrop(ev)
{
    // Handle event, ID origin
    ev.preventDefault();
    let originId = ev.dataTransfer.getData("text");
    let origin = document.getElementById(originId);

    // Fix up CSS
    onDragLeave(ev);

    // Correctly ID target
    let target = ev.target;
    if (target.tagName.search(/^span$/i) === 0)
        target = target.parentNode;
    if (target.tagName.search(/^div$/i) === 0)
        target = target.parentNode;

    // ID start and stop as ints
    let bits = originId.match(/^([^0-9]+)(.*)/);
    let set = bits[1];
    let originIndex = parseInt( bits[2] );
    bits = target.id.match(/^([^0-9]+)([0-9]+)(.*)/);
    let targetIndex = parseInt( bits[2] );

    if (prefs["debug"])
        console.log("URL Link dragged index " + originIndex + " to " + targetIndex);

    // Dropped into a separator, and dragging up?
    if (bits[3].length > 0  &&  originIndex > targetIndex)
        targetIndex++;  // Dropped onto a separator;  this way around, the target is the thing below it

    // Shuffling up or down?  (down is increasing index)
    if (originIndex === targetIndex)
    {
        // No change
        return;
    }
    else if (originIndex < targetIndex)
    {
        // Moving from top down, so shuffle up
        let moveText = origin.innerText;
        let item = document.getElementById( set + originIndex );
        for (let index = originIndex+1;  index <= targetIndex;  ++index)
        {
            let nextItem = document.getElementById( set + index );
            item.innerText = nextItem.innerText;
            item = nextItem;
        }
        item.innerText = moveText;
    }
    else
    {
        // Moving from bottom up, so shuffle down
        let moveText = origin.innerText;
        let item = document.getElementById( set + originIndex );
        for (let index = originIndex-1;  index >= targetIndex;  --index)
        {
            let nextItem = document.getElementById( set + index );
            item.innerText = nextItem.innerText;
            item = nextItem;
        }
        item.innerText = moveText;
    }
}


// Entered item while dragging
function onDragEnter(ev)
{
    // If a valid item, highlight it as a target
    if (ev.target.tagName && ev.target.tagName.search(/^(li|div|span)$/i) === 0)
        ev.target.className = ev.target.className.replace(/ dragging\b/,'') + " dragging";
}


// Left item while dragging
function onDragLeave(ev)
{
    // If a valid item, stop highlighting it as a target
    if (ev.target.tagName && ev.target.tagName.search(/^(li|div|span)$/i) === 0)
        ev.target.className = ev.target.className.replace(/ dragging\b/,'');
}



// Click on a tab selection button
function selectTab(ev, tabName)
{
    if (prefs["debug"])
        console.log("URL Link " + tabName + " selected");

    // Set all buttons as non-current
    let tabContent = document.getElementsByClassName("tab-content");
    for (let tab = 0; tab < tabContent.length; tab++)
        tabContent[tab].style.display = "none";

    // Hide all tabs
    let tabLinks = document.getElementsByClassName("tab-link");
    for (let tab = 0; tab < tabLinks.length; tab++) {
        tabLinks[tab].className = tabLinks[tab].className.replace(" active", "");
    }

    // Show selected tab
    document.getElementById(tabName + "-tab").style.display = "block";

    // Flag active button
    ev.currentTarget.className += " active";
}


// Encode HTML
function htmlEncode(str)
{
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');}

// Decode HTML
function htmlDecode(str)
{
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');}


// Create a menu list item
function createLi( n, list, listtype, cls, text )
{
    let li = document.createElement("li");

    // List entry or separator?
    if (!listtype.length)
    {
        // Entry
        li.appendChild( document.createTextNode(text) );
        li.draggable = "true";
    }
    else
    {
        // Separator: span in a div in a li
        let div = document.createElement("div");
        div.appendChild( document.createElement("span") );
        li.appendChild( div );
    }

    // And the rest of the attributes
    li.setAttribute( "class", cls );
    li.id          = list + n + listtype;
    li.ondragstart = onDragStart;
    li.ondrop      = onDrop;
    li.ondragover  = onDragOver;
    li.ondragenter = onDragEnter;
    li.ondragleave = onDragLeave;

    return li;
}


// Apply prefs. to page
function displayPrefs()
{
    if (prefs["debug"])
        console.log("URL Link loading preferences to preferences page");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        if (prefs["debug"])
            console.log("URL Link preferences found");

        // Delete existing items
        let items = document.querySelectorAll("div.tab-content li");
        for (let n = items.length-1;  n >= 0;  --n)
            items[n].parentNode.removeChild( items[n] );

        // Find & populate menu list
        let list = document.querySelector("#menu-tab ul");
        for (let n in prefs.submenus)
        {
            if (n)
                list.appendChild( createLi( n, "menu", "sep", "li-sep", prefs.submenus[n] ) );
            list.appendChild( createLi( parseInt(n)+1, "menu", "", "li-data", prefs.submenus[n] ) );
        }

        // Find & populate search & replace list
        list = document.querySelector("#sandr-tab ul");
        for (let n in prefs.sandr)
        {
            if (n)
                list.appendChild( createLi( n, "sandr", "sep", "li-sep", prefs.sandr[n] ) );
            list.appendChild( createLi( parseInt(n)+1, "sandr", "", "li-data", prefs.sandr[n] ) );
        }

        // Populate basic flags
        document.getElementById("option-new-window").checked      = prefs["newwindow"];
        document.getElementById("option-force-sub-menu").checked  = prefs["forcesubmenu"];
        document.getElementById("option-background-tabs").checked = prefs["inbackground"];
        document.getElementById("option-debug").checked           = prefs["debug"];

        // Clear menu control
        items = document.querySelectorAll("input.menu-options");
        for (let n = items.length-1;  n >= 0;  --n)
            items[n].checked = false;

        // Repopulate menu control
        if (prefs["hidetab"])
            document.getElementById("option-hide-tab").checked = true;  // hide tab
        else if (prefs["hideopen"])
            document.getElementById("option-hide-open").checked = true;  // hide open
        else
            document.getElementById("option-both-options").checked = true;  // have both
    }
}


// Load prefs. to page
function savePrefs()
{
    if (prefs["debug"])
        console.log("URL Link saving preferences");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        // Process menu items
        prefs["submenus"] = [];
        let items = document.querySelectorAll("#menu-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].getAttribute("class").match(/sep$/))
                prefs["submenus"].push( items[n].textContent );

        // Process search and replace items
        prefs["sandr"] = [];
        items = document.querySelectorAll("#sandr-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].getAttribute("class").match(/sep$/))
                prefs["sandr"].push( items[n].textContent );

        // Process basic flags
        prefs["newwindow"]    = document.getElementById("option-new-window").checked;
        prefs["forcesubmenu"] = document.getElementById("option-force-sub-menu").checked;
        prefs["inbackground"] = document.getElementById("option-background-tabs").checked;
        prefs["debug"]        = document.getElementById("option-debug").checked;

        // Process menu control
        if (document.getElementById("option-hide-tab").checked)  // hide tab
        {
            prefs["hidetab"] = true;
            prefs["hideopen"] = false;
        }
        else if (document.getElementById("option-hide-open").checked)  // hide open
        {
            prefs["hidetab"] = false;
            prefs["hideopen"] = true;
        }
        else if (document.getElementById("option-both-options").checked)  // have both
        {
            prefs["hidetab"] = false;
            prefs["hideopen"] = false;
        }

        // OK, now save them
        if (prefs["debug"])
            console.log( "URL Link new preferences: " + JSON.stringify( prefs ) );
        //browser.storage.local.set({"preferences": prefs});
    }
}


// On page load
function preparePage(ev)
{
    if (prefs["debug"])
        console.log("URL Link preparing preferences page");

    // Set the first button/tab as active, and monitor it
    let menu_button = document.getElementById("menu-tab-button");
    menu_button.addEventListener( "click",  event => { selectTab(event,"menu") } );
    menu_button.click();

    // Monitor second button
    document.getElementById("sandr-tab-button").addEventListener( "click", event => { selectTab(event,"sandr") } );

    // Monitor save and cancel
    document.getElementById("prefs-save").addEventListener( "click", event => {
        event.preventDefault();
        savePrefs();
    });
    document.getElementById("prefs-cancel").addEventListener( "click", event => {
        event.preventDefault();
        displayePrefs();
    });

    // Load prefs.
    browser.storage.local.get("preferences").then( results => {
        // Have something
        if (results.hasOwnProperty("preferences"))
            prefs = results["preferences"];

        // Apply prefs.
        displayPrefs();
    });
}


document.addEventListener("DOMContentLoaded", preparePage);
