/* © Neil Bird
 *   $Id: urllinkCommon.js 887 2016-12-29 17:10:15Z neil $
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

console.log("URL Link Embedded WebExtension starting");

// Handle prefs. updates - create comms port and wait for messages down it
var port = browser.runtime.connect({ name: "urllink-legacy" });
port.onMessage.addListener( message => {  // message.content?
    console.log("URL Link legacy message received: " + JSON.stringify(message));
    if (message.hasOwnProperty("urllink-preferences"))
        browser.storage.local.set( {"preferences": message["urllink-preferences"]} );
});

// Check whether prefs. migrated
browser.storage.local.get("preferences").then( results => {
    if (results.hasOwnProperty("preferences"))
    {
        let prefs = results["preferences"];
        console.log("URL Link found previous prefs.: " + JSON.stringify(prefs));
    }

    // But always ask for current prefs., we don't/can't easily update on the fly
    console.log("URL Link asking for latest legacy prefs.");
    port.postMessage("urllink-preferences-request");
});
