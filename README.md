**URL Link** is a small Firefox and Thunderbird extension that allows you to select a non-URL in a mail/news message or web-page, and open it in a browser window.
___
[![Build Status](https://travis-ci.org/fnxweb/urllink.svg?branch=master)](https://travis-ci.org/fnxweb/urllink)

URL Link has been wholly re-written to be a WebExtension. **This new version will not work on Thunderbird as it does not support WebExtensions.** I may have to release a separate forked copy of URL Link just for Thunderbird; if I do, I shall try to use the name *URL Link Legacy* so you can watch out for that.

*Preference editing is back in and has been completely re-written — please report any issues to me or via a bug on GitHub.  The force-submenu option does not yet do anything as menus cannot currently be recreated on-the-fly (Firefox issue).*

**Explanation of required permissions**
* _Access your data for all websites_ — installs a “content script” into visited pages in order to better analyse the current selection.
* _Input data to the clipboard_ — copies file:/// URLs to the clipboard for pasting (in lieu of automatic access).
* _Access browser tabs_ — open new windows and tabs.


For emails, it reconnects links in emails which have been broken across several lines, and also replaces spaces with the URL character code %20 so that you may follow emailed network 'file:' links (which it auto-detects from Windows "X:" or \\servdir references).

For web pages, it also allows you to select textual links/URLs in web pages or edit boxes, and follow them as if they were real links. It will also let you use actual links, and analyses mailto: links as well.

It analyses 'mailto:' links (converts, e.g., mailto:someone@somesite.com to http://www.somesite.com) and can also 'follow' javascript: links that would otherwise generate a pop-up (e.g., http://www.kelkoo.co.uk/).

There are currently more translations than I care to keep listing here (thanks to the guys at http://www.babelzilla.org/)!  Unfortunately, Babelzilla has retired due to the new format of Firefox add-ons.  If you would like to provide new translations, or fix existing ones, please email me, add them to a feature-request issue on GitHub, or add them in a GitHub fork for me to pull in.


URL Link has a preferences dialogue allowing customisation of the 'not a proper URL' sub-menu which converts, e.g., "sometext" to "www.sometext.com", so that locale-specific conversions can be added (like 'www.*.co.uk').

Nicknames can be applied to the entries (such that the nickname appears in the menu, not the conversion string) by using a bar '|', *e.g.*:

"In Google|http://www.google.com/search?q=*&source-id=Mozilla%20Firefox&start=0"

It also allows separators to be added to the custom menu by using entries made up of hyphens, e.g. "--".

Hold down **Shift** when opening a link in the current window to instead open in a new window.

Either hold down **Control** when opening a link, or add **|p** to the end of a custom menu entry to make that entry always open in  a private window.  *E.g.*:

"In Google|http://www.google.com/search?q=*&source-id=Mozilla%20Firefox&start=0|p"

You can also set up custom search and replace strings (e.g., convert Windows driver letter to some file:///mnt/smb/ path for Linux users).


If you have problems with file: or network (\\server\share) links, especially in Thunderbird emails, see the following page:

http://kb.mozillazine.org/Links_to_local_pages_do_not_work#Firefox_1.5.2C_SeaMonkey_1.0_and_newer

However, **note that Firefox currently does not allow add-ins to acess file:/// URLs at all**.  Until they cater for this, I am providing a work-around that copies the required file:/// URL to the clipboard, and prompts you to paste-and-go into a new tab.
