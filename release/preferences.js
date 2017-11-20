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
    if (prefs.debug)
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
    let originText = origin.querySelector("span.entry");

    // Fix up CSS
    onDragLeave(ev);

    // Correctly ID target
    let target = ev.target;
    if (target.tagName.search(/^span$/i) === 0)
        target = target.parentNode;
    if (target.tagName.search(/^div$/i) === 0)
        target = target.parentNode;
    let targetText = target.querySelector("span.entry");

    // ID start and stop as ints
    let bits = originId.match(/^([^0-9]+)(.*)/);
    let set = bits[1];
    let originIndex = parseInt( bits[2] );
    bits = target.id.match(/^([^0-9]+)([0-9]+)(.*)/);
    let targetIndex = parseInt( bits[2] );

    if (prefs.debug)
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
        let moveText = originText.innerText;
        let item = document.getElementById( set + originIndex );
        let itemText = item.querySelector("span.entry");
        for (let index = originIndex+1;  index <= targetIndex;  ++index)
        {
            let nextItem = document.getElementById( set + index );
            let nextText = nextItem.querySelector("span.entry");
            itemText.innerText = nextText.innerText;
            item = nextItem;
            itemText = nextText;
        }
        itemText.innerText = moveText;
    }
    else
    {
        // Moving from bottom up, so shuffle down
        let moveText = originText.innerText;
        let item = document.getElementById( set + originIndex );
        let itemText = item.querySelector("span.entry");
        for (let index = originIndex-1;  index >= targetIndex;  --index)
        {
            let nextItem = document.getElementById( set + index );
            let nextText = nextItem.querySelector("span.entry");
            itemText.innerText = nextText.innerText;
            item = nextItem;
            itemText = nextText;
        }
        itemText.innerText = moveText;
    }
}


// Entered item while dragging
function onDragEnter(ev)
{
    // If a valid item, highlight it as a target
    if (ev.target.tagName && ev.target.tagName.search(/^(li|div|span)$/i) === 0)
        ev.target.className = ev.target.className.replace(/ dragging\b/g,'') + " dragging";
}


// Left item while dragging
function onDragLeave(ev)
{
    // If a valid item, stop highlighting it as a target
    if (ev.target.tagName && ev.target.tagName.search(/^(li|div|span)$/i) === 0)
        ev.target.className = ev.target.className.replace(/ dragging\b/g,'');
}



// Click on a tab selection button
function selectTab(ev, tabName)
{
    if (prefs.debug)
        console.log("URL Link " + tabName + " selected");

    // Set all buttons as non-current
    let tabContent = document.getElementsByClassName("tab-content");
    for (let tab = 0; tab < tabContent.length; tab++)
        tabContent[tab].style.display = "none";

    // Hide all tabs
    let tabLinks = document.getElementsByClassName("tab-link");
    for (let tab = 0; tab < tabLinks.length; tab++) {
        tabLinks[tab].className = tabLinks[tab].className.replace(/ active\b/g, "");
    }

    // Show selected tab
    document.getElementById(tabName + "-tab").style.display = "block";

    // Flag active button
    ev.currentTarget.className += " active";
}


// Set a li draggable
function setDraggable(el)
{
    el.ondragstart = onDragStart;
    el.ondrop      = onDrop;
    el.ondragover  = onDragOver;
    el.ondragenter = onDragEnter;
    el.ondragleave = onDragLeave;
}


// Create a menu list item
function createLi( n, list, listtype, cls, text )
{
    let li = document.createElement("li");

    // List entry or separator?
    if (listtype != "sep")
    {
        // Entry
        // .. edit button
        let span = document.createElement("span");
        span.className = "edit-button";
        span.appendChild( document.createTextNode("✍") );
        li.appendChild( span );

        // Entry itself
        span = document.createElement("span");
        span.className = "entry";
        span.appendChild( document.createTextNode(text) );
        li.appendChild( span );
        li.draggable = true;
    }
    else
    {
        // Separator: span in a div in a li
        let div = document.createElement("div");
        div.appendChild( document.createElement("span") );
        li.appendChild( div );
    }

    // And the rest of the attributes; drag stuff if it's not the "add" line
    li.className = cls;
    li.id        = list + n + listtype;
    if (listtype != "add")
        setDraggable( li );

    return li;
}


// Editable entries
function makeEditable( li )
{
    // Make editable on button click
    let edit = li.querySelector("span.edit-button");
    let text = li.querySelector("span.entry");
    edit.addEventListener( "click", event => {
        li.className = li.className.replace(/ draggable\b/g,'');
        li.draggable = false;
        text.contentEditable = true;
        text.className += " editing";
    } );

    // Add add-item one needs to bin its + when editing it
    text.addEventListener( "click", event => {
        if (text.className.match(/\bediting\b/)  &&  text.textContent == "+")
            text.textContent = "";
    });

    // Handler for finishing up
    function finishEditing( event )
    {
        if (prefs.debug)
            console.log("URL Link finished editing " + li.id);

        // Tidy up
        let text = event.target;
        text.contentEditable = false;
        text.textContent = event.target.textContent.replace(/[\r\n]/g,"");
        text.className = event.target.className.replace(/ editing\b/g,"");
        li.draggable = true;
        li.className += " draggable";

        // Was it an additional one?
        if (li.id.match(/add\b/))
        {
            // Yes;  if empty, just put back
            if (text.textContent == "" || text.textContent == "+")
            {
                if (prefs.debug)
                    console.log("URL Link edited new but left it blank");
                text.textContent = "+";
            }
            else
            {
                if (prefs.debug)
                    console.log("URL Link added new entry");

                // Make it a normal one
                li.id = li.id.replace(/add\b/g,"");
                setDraggable( li );

                // Add a new +;  need to ID whether menu or sandr
                let list = text.closest("ul");
                let size = list.querySelectorAll("li.li-data").length;
                let tab = list.parentNode;
                if (tab.id.search("menu") >= 0)
                    addPlusEntry( list, size, "menu" );
                else
                    addPlusEntry( list, size, "sandr" );
            }
        }
    }

    // Enter will stop editing
    text.addEventListener( "keypress", event => {
        if (event.keyCode == 10 || event.keyCode == 13)
        {
            event.preventDefault();
            event.target.blur();
        }
    });

    // Catch end of edit due to loss of focus too
    text.addEventListener( "blur", event => {
        finishEditing( event );
    }, false );
}


// Add a new + entry
function addPlusEntry( list, n, type )
{
    list.appendChild( createLi( n, type, "sep", "li-sep", "" ) );
    let li = createLi( parseInt(n)+1, type, "add", "li-data", "+" );
    makeEditable( li );
    list.appendChild( li );
}


// Apply prefs. to page
function displayPrefs()
{
    if (prefs.debug)
        console.log("URL Link loading preferences to preferences page");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        if (prefs.debug)
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
                list.appendChild( createLi( n, "menu", "sep", "li-sep", "" ) );
            let li = createLi( parseInt(n)+1, "menu", "", "li-data draggable", prefs.submenus[n] );
            makeEditable( li );
            list.appendChild( li );
        }

        // Allow for adding a new one
        addPlusEntry( list, prefs.submenus.length, "menu" );

        // Find & populate search & replace list
        list = document.querySelector("#sandr-tab ul");
        for (let n in prefs.sandr)
        {
            if (n)
                list.appendChild( createLi( n, "sandr", "sep", "li-sep", "" ) );
            let li = createLi( parseInt(n)+1, "sandr", "", "li-data", prefs.sandr[n] );
            makeEditable( li );
            list.appendChild( li );
        }

        // Allow for adding a new one
        addPlusEntry( list, prefs.sandr.length, "sandr" );

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
    if (prefs.debug)
        console.log("URL Link saving preferences");

    // Working OK?
    if (prefs.hasOwnProperty("lastversion"))
    {
        // Process menu items
        prefs["submenus"] = [];
        let items = document.querySelectorAll("#menu-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].className.match(/sep$/))
            {
                let text = items[n].querySelector("span.entry");
                prefs["submenus"].push( text.textContent );
            }

        // Process search and replace items
        prefs["sandr"] = [];
        items = document.querySelectorAll("#sandr-tab li");
        for (let n = 0;  n < items.length;  ++n)
            if (!items[n].className.match(/sep$/))
            {
                let text = items[n].querySelector("span.entry");
                prefs["sandr"].push( text.textContent );
            }

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
        if (prefs.debug)
            console.log( "URL Link new preferences: " + JSON.stringify( prefs ) );
        //browser.storage.local.set({"preferences": prefs});
    }
}


// On page load
function preparePage(ev)
{
    if (prefs.debug)
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
        displayPrefs();
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
