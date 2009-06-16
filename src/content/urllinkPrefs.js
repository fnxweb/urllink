/* Copyright (c) 2006  Neil Bird
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

var menuitemsListbox; /* = document.getElementById("urllinkMenuItems"); */
var newmenuitembox;
var sandritemsListbox;
var newsandritembox;
var topmenu;
var newwindow;
var openoptions;


function openNewWindow(url)
{
    if (urllinkCommon.inThunderbird())
    {
        // Have to hope browser has URL Link installed as well for now ...
        urllinkCommon.launchExternalURL(url);
    }
    else
    {
        // [culled from Download Manager/downbarpref]
        // If I open it from my preferences window the "about" window is modal for some reason
        // open it from the browser window, it is not modal
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
        var wrecent = wm.getMostRecentWindow("navigator:browser");
        wrecent.open(url);
    }
}


function itemUp(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx >= 1)
    {
        var item = listbox.removeItemAt(idx);
        idx--;
        listbox.insertItemAt( idx, item.getAttribute("label"), item.getAttribute("value") );
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


function itemDown(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx != -1  &&  idx < listbox.getRowCount() - 1)
    {
        var item = listbox.removeItemAt(idx);
        idx++;
        if (idx == listbox.getRowCount())
        {
            listbox.appendItem( item.getAttribute("label"), item.getAttribute("value") );
        }
        else
        {
            listbox.insertItemAt( idx, item.getAttribute("label"), item.getAttribute("value") );
        }
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


function setDefaults(listbox,defaults)
{
    while (listbox.getRowCount() > 0)
    {
        listbox.removeItemAt(0);
    }
    for (var i=0; i<defaults.length; i++)
    {
        listbox.appendItem( defaults[i], "" );
    }
}


function deleteItem(listbox)
{
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        listbox.removeItemAt(idx);
        var size = listbox.getRowCount();
        if (idx >= 0 && idx < size)
        {
            listbox.selectedIndex = idx;
        }
        else if (idx >= size)
        {
            listbox.selectedIndex = listbox.getRowCount() - 1;
        }
        else if (size)
        {
            listbox.selectdeIndex = 0;
        }
    }
}


function addItem(listbox,newitembox,force)
{
    var newitem = newitembox.value;
    var selecteditem = "";
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        selecteditem = listbox.getItemAtIndex(idx).getAttribute("label");
    }
    if (newitem != ""  &&  (force  ||  newitem != selecteditem))
    {
        listbox.appendItem(newitem,"");
        var idx = listbox.getRowCount() - 1;
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
        newitembox.value = "";
    }
}


/* Click on menu items list */
function onPrefsMenuSelect()
{
    /* Set text entry to selection for 'editing' of exiting entries */
    var idx = menuitemsListbox.selectedIndex;
    if (idx != -1)
    {
        newmenuitembox.value = menuitemsListbox.getItemAtIndex(idx).getAttribute("label");
    }
}


/* Click on search-and-replace items list */
function onPrefsSandrSelect()
{
    /* Set text entry to selection for 'editing' of exiting entries */
    var idx = sandritemsListbox.selectedIndex;
    if (idx != -1)
    {
        newsandritembox.value = sandritemsListbox.getItemAtIndex(idx).getAttribute("label");
    }
}


function loadPrefs()
{
    if (!menuitemsListbox)
    {
        urllinkCommon.urllinkInit();

        menuitemsListbox = document.getElementById("urllinkMenuItems");
        newmenuitembox = document.getElementById("urllinkNewMenuItem");
        sandritemsListbox = document.getElementById("urllinkSandrItems");
        newsandritembox = document.getElementById("urllinkNewSandrItem");
        topmenu = document.getElementById("urllinkTopmenu");
        newwindow = document.getElementById("urllinkNewWindow");
        openoptions = document.getElementById("urllinkOpenOptions");
        menuitemsListbox.addEventListener("select",onPrefsMenuSelect, false);
        sandritemsListbox.addEventListener("select",onPrefsSandrSelect, false);
    }

    /* Set up submenu */
    if (urllinkCommon.prefs.getPrefType("submenu.0") != urllinkCommon.nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        setDefaults( menuitemsListbox, urllinkCommon.defaultMenuItems );
    }
    else
    {
        /* Clear list */
        while (menuitemsListbox.getRowCount() > 0)
        {
            menuitemsListbox.removeItemAt(0);
        }

        /* Read prefs into list */
        var n = 0;
        while (urllinkCommon.prefs.getPrefType("submenu."+n) == urllinkCommon.nsIPrefBranch.PREF_STRING)
        {
            menuitemsListbox.appendItem( urllinkCommon.prefs.getCharPref("submenu."+n), "" );
            n++;
        }
    }

    /* Set up submenu */
    if (urllinkCommon.prefs.getPrefType("sandr.0") != urllinkCommon.nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        setDefaults( sandritemsListbox, urllinkCommon.defaultSandrItems );
    }
    else
    {
        /* Clear list */
        while (sandritemsListbox.getRowCount() > 0)
        {
            sandritemsListbox.removeItemAt(0);
        }

        /* Read prefs into list */
        var n = 0;
        while (urllinkCommon.prefs.getPrefType("sandr."+n) == urllinkCommon.nsIPrefBranch.PREF_STRING)
        {
            sandritemsListbox.appendItem( urllinkCommon.prefs.getCharPref("sandr."+n), "" );
            n++;
        }
    }

    /* And the rest */
    topmenu.checked = urllinkCommon.prefs.getBoolPref("topmenu");
    newwindow.checked = urllinkCommon.prefs.getBoolPref("newwindow");
    if (urllinkCommon.prefs.getBoolPref("hidetab"))
        openoptions.selectedIndex = 1;  /* hide tab */
    else if (urllinkCommon.prefs.getBoolPref("hideopen"))
        openoptions.selectedIndex = 2;  /* hide open */
    else
        openoptions.selectedIndex = 0;  /* have both */
}


function setPrefs(doclose)
{
    /* Blat current prefs */
    var n = 0;
    while (urllinkCommon.prefs.getPrefType("submenu."+n) == urllinkCommon.nsIPrefBranch.PREF_STRING)
    {
        if (urllinkCommon.prefs.prefHasUserValue("submenu."+n))
        {
            urllinkCommon.prefs.clearUserPref("submenu."+n);
        }
        n++;
    }
    n = 0;
    while (urllinkCommon.prefs.getPrefType("sandr."+n) == urllinkCommon.nsIPrefBranch.PREF_STRING)
    {
        if (urllinkCommon.prefs.prefHasUserValue("sandr."+n))
        {
            urllinkCommon.prefs.clearUserPref("sandr."+n);
        }
        n++;
    }

    /* Replace prefs */
    n = 0;
    while (n < menuitemsListbox.getRowCount())
    {
        urllinkCommon.prefs.setCharPref( "submenu."+n, menuitemsListbox.getItemAtIndex(n).getAttribute("label") );
        n++;
    }
    n = 0;
    while (n < sandritemsListbox.getRowCount())
    {
        urllinkCommon.prefs.setCharPref( "sandr."+n, sandritemsListbox.getItemAtIndex(n).getAttribute("label") );
        n++;
    }
    urllinkCommon.prefs.setBoolPref("topmenu", topmenu.checked);
    urllinkCommon.prefs.setBoolPref("newwindow", newwindow.checked);
    switch (openoptions.selectedIndex)
    {
        case 1:
            urllinkCommon.prefs.setBoolPref("hidetab", true);
            urllinkCommon.prefs.setBoolPref("hideopen", false);
            break;
        case 2:
            urllinkCommon.prefs.setBoolPref("hidetab", false);
            urllinkCommon.prefs.setBoolPref("hideopen", true);
            break;
        default:
            urllinkCommon.prefs.setBoolPref("hidetab", false);
            urllinkCommon.prefs.setBoolPref("hideopen", false);
    }

    /* Done */
    if (doclose)
    {
        window.close();
    }
}
