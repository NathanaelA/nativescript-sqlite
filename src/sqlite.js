/**************************************************************************************
 * (c) 2015-2021, Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 * Version 2.7.0 - Android
 *************************************************************************************/
/* global global, require, module */

"use strict";
const DBInternal = require("nativescript-sqlite/sqlite-internal");

function Database(dbname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        //noinspection JSUnusedAssignment
        options = {};
    } else {
        //noinspection JSUnusedAssignment
        options = options || {};
    }

    if (options && options.multithreading && typeof global.Worker === 'function') {
        // We don't want this value passed into the worker; to try and start another worker (which would fail).
        delete options.multithreading;
        if (!DBInternal.HAS_COMMERCIAL) {
            throw new Error("Multithreading is a commercial only feature; see https://nativescript.tools/product/10");
        }
        // We have to wrap this in a try/catch because of Webpack 4
        try {
            const multiSQL = require("nativescript-sqlite-commercial/commercial-multi");
            return new multiSQL(dbname, options, callback);
        } catch (err) {
            console.warn("Multithreading is a commercial only feature; see https://nativescript.tools/product/10");
        }
    }
    return new DBInternal(dbname, options, callback);
}

// Copy static Properties & Static functions over so that they still work
for (let item in DBInternal) {
    if (DBInternal.hasOwnProperty(item)) {
        Database[item] = DBInternal[item];
    }
}

if (global.TNS_WEBPACK && global.TNS_WEBPACK >= 5) {
    if (global._MT_HAS_SQLITE) {
        Database.HAS_COMMERCIAL = (global._MT_HAS_SQLITE & 1) === 1;
        Database.HAS_ENCRYPTION = (global._MT_HAS_SQLITE & 2) === 2;
        Database.HAS_SYNC = (global._MT_HAS_SQLITE & 4) === 4;
        Database.HAS_KEYSTORE = (global._MT_HAS_SQLITE & 8) === 8;
    }
}

module.exports = Database;
