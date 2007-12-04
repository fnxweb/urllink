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

var listbox; /* = document.getElementById("urllinkMenuItems"); */
var newitembox;
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


function itemUp()
{
    var idx = listbox.selectedIndex;
    if (idx >= 1)
    {
        var item = listbox.removeItemAt(idx);
        idx--;
        listbox.insertItemAt( idx, item.label, item.value );
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


function itemDown()
{
    var idx = listbox.selectedIndex;
    if (idx != -1  &&  idx < listbox.getRowCount() - 1)
    {
        var item = listbox.removeItemAt(idx);
        idx++;
        if (idx == listbox.getRowCount())
        {
            listbox.appendItem( item.label, item.value );
        }
        else
        {
            listbox.insertItemAt( idx, item.label, item.value );
        }
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
    }
}


function setDefaults()
{
    while (listbox.getRowCount() > 0)
    {
        listbox.removeItemAt(0);
    }
    for (var i=0; i<urllinkCommon.defaultMenuItems.length; i++)
    {
        listbox.appendItem( urllinkCommon.defaultMenuItems[i], "" );
    }
}


function deleteItem()
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


function addItem(force)
{
    var newitem = newitembox.value;
    var selecteditem = "";
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        selecteditem = listbox.getItemAtIndex(idx).label;
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


function onPrefsSelect()
{
    /* Set text entry to selection for 'editing' of exiting entries */
    var idx = listbox.selectedIndex;
    if (idx != -1)
    {
        newitembox.value = listbox.getItemAtIndex(idx).label;
    }
}


function loadPrefs()
{
    if (!listbox)
    {
        urllinkCommon.urllinkInit();
        listbox = document.getElementById("urllinkMenuItems");
        newitembox = document.getElementById("urllinkNewItem");
        topmenu = document.getElementById("urllinkTopmenu");
        newwindow = document.getElementById("urllinkNewWindow");
        openoptions = document.getElementById("urllinkOpenOptions");
        listbox.addEventListener("select",onPrefsSelect, false);
    }

    /* Fix old prefs */
    if (urllinkCommon.prefs.getPrefType("openonly") == urllinkCommon.nsIPrefBranch.PREF_BOOL)
    {
        urllinkCommon.prefs.setBoolPref("hidetab", urllinkCommon.prefs.getPrefType("openonly"));
        urllinkCommon.prefs.clearUserPref("openonly");
    }
    if (urllinkCommon.prefs.getPrefType("tabonly") == urllinkCommon.nsIPrefBranch.PREF_BOOL)
    {
        urllinkCommon.prefs.setBoolPref("hideopen", urllinkCommon.prefs.getPrefType("tabonly"));
        urllinkCommon.prefs.clearUserPref("tabonly");
    }

    /* Now submenu */
    if (urllinkCommon.prefs.getPrefType("submenu.0") != urllinkCommon.nsIPrefBranch.PREF_STRING)
    {
        /* Nothing yet */
        setDefaults();
    }
    else
    {
        /* Clear list */
        while (listbox.getRowCount() > 0)
        {
            listbox.removeItemAt(0);
        }

        /* Read prefs into list */
        var n = 0;
        while (urllinkCommon.prefs.getPrefType("submenu."+n) == urllinkCommon.nsIPrefBranch.PREF_STRING)
        {
            listbox.appendItem( urllinkCommon.prefs.getCharPref("submenu."+n), "" );
            n++;
        }
    }

    /* And rest */
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

    /* Replace prefs */
    var n = 0;
    while (n < listbox.getRowCount())
    {
        urllinkCommon.prefs.setCharPref( "submenu."+n, listbox.getItemAtIndex(n).label );
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
