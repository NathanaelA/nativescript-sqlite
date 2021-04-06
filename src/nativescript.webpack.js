/**************************************************************************************
 * (c) 2021, Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 *************************************************************************************/

/* global require, module */
const fs = require('fs');
const path = require('path');

module.exports = webpack => {

    // Add all sqlite files
    webpack.Utils.addCopyRule('**/*.sqlite');

    // Used to update any existing configurations with more rules...
    webpack.chainWebpack((config, env) => {

        // Update Externals to eliminate any warnings during building
        const externals = config.get('externals');
        let dirname = path.resolve(__dirname, "../");
        if (!fs.existsSync(dirname+"/nativescript-sqlite-sync")) {
            console.warn("NativeScript-SQLite Sync not detected, disabling support!");
            externals.push('nativescript-sqlite-sync');
        }
        if (!fs.existsSync(dirname+"/nativescript-sqlite-commercial")) {
            console.warn("NativeScript-SQLite Commercial not detected, disabling support!");
            externals.push('nativescript-sqlite-commercial');
        }
        if (!fs.existsSync(dirname+"/nativescript-sqlite-encrypted")) {
            console.warn("NativeScript-SQLite Encrypted not detected, disabling support!");
            externals.push('nativescript-sqlite-encrypted');
        }
        config.set('externals', externals);

        // Add TNS_WEBPACK to the defines...
        config.plugin('DefinePlugin').tap(args => {
            args[0]['global.TNS_WEBPACK'] = 5;
            return args;
        });
    });
}
