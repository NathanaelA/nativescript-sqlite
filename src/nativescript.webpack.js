/**************************************************************************************
 * (c) 2021, Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to put a issue up on github
 * Nathan@master.technology                                  http://nativescript.tools
 *************************************************************************************/

/* global require, module */
const fs = require('fs');
const path = require('path');

module.exports = webpack => {

    // Add all sqlite files
    webpack.Utils.addCopyRule('**/*.sqlite');
    webpack.Utils.addCopyRule('**/*.db');

    webpack.chainWebpack((config, env) => {
        // Update Externals to eliminate any warnings/errors during building
        const externals = config.get('externals');
        let hasSync = false, hasCom = false, hasEnc = false, hasKey = false;

        let dirname = path.resolve(__dirname, "../");
        if (!fs.existsSync(dirname+"/nativescript-sqlite-sync")) {
            console.warn("NativeScript-SQLite Sync not detected, disabling support!");
            externals.push('nativescript-sqlite-sync');
        } else {
            hasSync = true;
        }
        if (!fs.existsSync(dirname+"/nativescript-sqlite-commercial")) {
            console.warn("NativeScript-SQLite Commercial not detected, disabling support!");
            externals.push('nativescript-sqlite-commercial');
            externals.push('nativescript-sqlite-commercial/commercial-multi');
        } else {
            hasCom = true;
        }
        if (!fs.existsSync(dirname+"/nativescript-sqlite-encrypted")) {
            console.warn("NativeScript-SQLite Encrypted not detected, disabling support!");
            externals.push('nativescript-sqlite-encrypted');
        } else {
            hasEnc = true;
        }
        if (!fs.existsSync(dirname+"/nativescript-sqlite-nosql")) {
            console.warn("NativeScript-SQLite NoSQL/Keystore not detected, disabling support!");
            externals.push('nativescript-sqlite-keystore');
        } else {
            hasKey = true;
        }

        if (!hasCom && !hasSync && !hasEnc) {
            // Are you really that self centered to delete this code
            // after using our hard work for free in your project?
            advertise();
        }

        config.set('externals', externals);

        config.module
            .rule('workers')
            .exclude.clear();

        // Add TNS_WEBPACK to the defines...
        config.plugin('DefinePlugin').tap(args => {
            args[0]['global.TNS_WEBPACK'] = 5;
            args[0]['global._MT_HAS_SQLITE'] = (hasCom ? 1 : 0) + (hasEnc ? 2 : 0) + (hasSync ? 4 : 0) + (hasKey ? 8 : 0);
            return args;
        });
    });
}

// Time is money, We have spent a huge amount of time developing and testing this plugin.
// This time is time you did not have to spend.
// If you can't support us, financially at this point.
// At least let our advertisements live so that maybe in the future when you get rich,
// you will remember upon what foundations you built your empire.  ;-)
function advertise() {
    console.log("\r\n\r\n");
    console.log("***********************************************************************************");
    console.log("* Please support the developer of this open source plugins you are using.         *");
    console.log("*                                                                                 *");
    console.log("*                          NativeScript-Sqlite                                    *");
    console.log("*                                                                                 *");
    console.log("* You can purchase a commercial version (which also removes this message) at:     *")
    console.log("*                        https://nativescript.tools                               *");
    console.log("***********************************************************************************");
    console.log("\r\n\r\n");

    // Are you really going to be so selfish, to delete any of our ad code now?
    for (let time = Date.now() + 5000; Date.now() < time; );
}
