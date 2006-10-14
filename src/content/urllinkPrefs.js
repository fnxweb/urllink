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


function openNewWindow(url)
{
    // [culled from Download Manager/downbarpref]
    // If I open it from my preferences window the "about" window is modal for some reason
    // open it from the browser window, it is not modal
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var wrecent = wm.getMostRecentWindow("navigator:browser");
    wrecent.open(url);
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
    for (var i=0; i<defaultMenuItems.length; i++)
    {
        listbox.appendItem( defaultMenuItems[i], "" );
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


function addItem()
{
    var newitembox = document.getElementById("urllinkNewItem");
    var newitem = newitembox.value;
    if (newitem != "")
    {
        listbox.appendItem(newitem,"");
        var idx = listbox.getRowCount() - 1;
        listbox.selectedIndex = idx;
        listbox.ensureIndexIsVisible( idx );
        newitembox.value = "";
    }
}


function loadPrefs()
{
    if (!listbox)
    {
        listbox = document.getElementById("urllinkMenuItems");
    }
    if (prefs.getPrefType("submenu.0") != nsIPrefBranch.PREF_STRING)
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
        while (prefs.getPrefType("submenu."+n) == nsIPrefBranch.PREF_STRING)
        {
            listbox.appendItem( prefs.getCharPref("submenu."+n), "" );
            n++;
        }
    }
}


function setPrefs(doclose)
{
    /* Blat current prefs */
    var n = 0;
    while (prefs.getPrefType("submenu."+n) == nsIPrefBranch.PREF_STRING)
    {
        if (prefs.prefHasUserValue("submenu."+n))
        {
            prefs.clearUserPref("submenu."+n);
        }
        n++;
    }

    /* Replace prefs */
    var n = 0;
    while (n < listbox.getRowCount())
    {
        prefs.setCharPref( "submenu."+n, listbox.getItemAtIndex(n).label );
        n++;
    }

    /* Done */
    if (doclose)
    {
        window.close();
    }
}
