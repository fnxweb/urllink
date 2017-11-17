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


function onDragStart(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
}

function onDragOver(ev)
{
  ev.preventDefault();
}

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

function onDragEnter(ev)
{
  if (ev.target.tagName.search(/^(li|div|span)$/i) === 0)
    ev.target.className = ev.target.className.replace(/ dragging\b/,'') + " dragging";
}

function onDragLeave(ev)
{
  if (ev.target.tagName.search(/^(li|div|span)$/i) === 0)
    ev.target.className = ev.target.className.replace(/ dragging\b/,'');
}

function selectTab(ev, tabName)
{
    let tabContent = document.getElementsByClassName("tab-content");
    for (let tab = 0; tab < tabContent.length; tab++)
        tabContent[tab].style.display = "none";
    let tabLinks = document.getElementsByClassName("tab-link");
    for (let tab = 0; tab < tabLinks.length; tab++) {
        tabLinks[tab].className = tabLinks[tab].className.replace(" active", "");
    }
    document.getElementById(tabName + "-tab").style.display = "block";
    ev.currentTarget.className += " active";
}


function preparePage(ev)
{
    let menu_button = document.getElementById("menu-tab-button");
    menu_button.addEventListener( "click",  event => { selectTab(event,"menu") } );
    menu_button.click();
    document.getElementById("sandr-tab-button").addEventListener( "click", event => { selectTab(event,"sandr") } );

    let lis = document.querySelectorAll("li.li-data,li.li-sep");
    for (let li = 0;  li < lis.length;  ++li)
    {
        lis[li].ondragstart = onDragStart;
        lis[li].ondrop      = onDrop;
        lis[li].ondragover  = onDragOver;
        lis[li].ondragenter = onDragEnter;
        lis[li].ondragleave = onDragLeave;
    }
}


document.addEventListener("DOMContentLoaded", preparePage);
