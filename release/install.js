const APP_DISPLAY_NAME = "URL Link Handler";
const APP_NAME = "urllink";
const APP_PACKAGE = "/FNX/urllink";
const APP_VERSION = "1.06.2";

const APP_JAR_FILE = "urllink.jar";
const APP_CONTENT_FOLDER = "content/urllink/";
const APP_LOCALE_FOLDER  = "locale/en-US/urllink/";
const APP_LOCALE_FR_FOLDER  = "locale/fr-FR/urllink/";
const APP_LOCALE_IT_FOLDER  = "locale/it-IT/urllink/";

const APP_SUCCESS_MESSAGE = "New menu items will appear on the mail compose and browser context menu when text is selected.\n\n";


// profile installs only work since 2003-03-06
var instToProfile;
if (buildID >= 2003030700)
	instToProfile = true;
else if ( buildID == 0) //dev.
	instToProfile = true;
else
	instToProfile = false;

var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
var cflag   = instToProfile ? PROFILE_CHROME                 : DELAYED_CHROME;


initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

var err = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_FILE, chromef, null)

if (err == SUCCESS)
{
    var jar = getFolder(chromef, APP_JAR_FILE);
    var sofar = "[register content]";

    err = registerChrome(CONTENT | cflag, jar, APP_CONTENT_FOLDER);
    if (err == SUCCESS || err == REBOOT_NEEDED)
    {
        sofar = "[register locale]";
        err = registerChrome(LOCALE | cflag, jar, APP_LOCALE_IT_FOLDER);
        err = registerChrome(LOCALE | cflag, jar, APP_LOCALE_FR_FOLDER);
        err = registerChrome(LOCALE | cflag, jar, APP_LOCALE_FOLDER);
    }
    if (err == SUCCESS || err == REBOOT_NEEDED)
    {
        sofar = "[perform installation]";
        err = performInstall();
    }

    switch (err)
    {
        case SUCCESS:
            alert( APP_NAME + " " + APP_VERSION + " has been succesfully installed.\n" + APP_SUCCESS_MESSAGE );
            break;
        case REBOOT_NEEDED:
            alert( APP_NAME + " " + APP_VERSION + " has been succesfully installed.\n" + APP_SUCCESS_MESSAGE +
                    "Please restart your browser before continuing." );
            break;
        default:
            alert( "Install failed " + sofar + ".  Error code: " + err );
            cancelInstall(err);
    }
}
else
{
    alert( "Failed to create " + APP_JAR_FILE + "\n" +
            "You probably don't have appropriate permissions \n" +
            "(write access to phoenix/chrome directory). \n" +
            "_____________________________\nError code:" + err );
    cancelInstall(err);
}
