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
  if (ev.target.tagName.search(/^(li|div|span)$/i) === 0)
    ev.target.className = ev.target.className.replace(/ dragging\b/,'') + " dragging";
}


// Left item while dragging
function onDragLeave(ev)
{
  // If a valid item, stop highlighting it as a target
  if (ev.target.tagName.search(/^(li|div|span)$/i) === 0)
    ev.target.className = ev.target.className.replace(/ dragging\b/,'');
}



// Click on a tab selection button
function selectTab(ev, tabName)
{
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


// On page load
function preparePage(ev)
{
    // Set the first button/tab as active, and monitor it
    let menu_button = document.getElementById("menu-tab-button");
    menu_button.addEventListener( "click",  event => { selectTab(event,"menu") } );
    menu_button.click();

    // Monitor second button
    document.getElementById("sandr-tab-button").addEventListener( "click", event => { selectTab(event,"sandr") } );

    // Load prefs.
    browser.storage.local.get("preferences").then( results => {
        // Have something
        if (results.hasOwnProperty("preferences"))
            prefs = results["preferences"];

        // Working OK?
        if (prefs.hasOwnProperty("lastversion"))
        {
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
        }
    });
}


document.addEventListener("DOMContentLoaded", preparePage);
