/**************************************************************************************
 * (c) 2015, Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to email me or put a issue up on github
 * Version 0.0.7 - Android                            Nathan@master-technology.com
 *************************************************************************************/

"use strict";
var appModule = require("application");

/*jshint undef: true */
/*global java, android, Promise */

// Needed for Creating Database - Android Specific flag
//var CREATEIFNEEDED = 0x10000000;

/***
 * Parses a Row of data into a JS Array
 * @param cursor
 * @returns {Array}
 * @constructor
 */
function DBGetRowArray(cursor) {
    var count = cursor.getColumnCount();
    var results = [];
    for (var i=0;i<count;i++) {
        var type = cursor.getType(i);
        switch (type) {
            case 0: // NULL
                results.push(null);
                break;

            case 1: // Integer
                results.push(cursor.getInt(i));
                break;

            case 2: // Float
                results.push(cursor.getFloat(i));
                break;

            case 3: // String
                results.push(cursor.getString(i));
                break;

            case 4: // Blob
                results.push(cursor.getBlob(i));
                break;

            default:
                throw new Error('SQLITE - Unknown Field Type ' + type);
        }
    }
    return results;
}

/***
 * Parses a Row of data into a JS Object
 * @param cursor
 * @returns {{}}
 * @constructor
 */
function DBGetRowObject(cursor) {
    var count = cursor.getColumnCount();
    var results = {};
    for (var i=0;i<count;i++) {
        var type = cursor.getType(i);
        var name = cursor.getColumnName(i);
        switch (type) {
            case 0: // NULL
                results[name] = null;
                break;

            case 1: // Integer
                results[name] = cursor.getInt(i);
                break;

            case 2: // Float
                results[name] = cursor.getFloat(i);
                break;

            case 3: // String
                results[name] = cursor.getString(i);
                break;

            case 4: // Blob
                results[name] = cursor.getBlob(i);
                break;

            default:
                throw new Error('SQLITE - Unknown Field Type '+ type);
        }
    }
    return results;
}
var DBGetRowResults = DBGetRowArray;

/***
 * Database Constructor
 * @param dbname - Database Name
 * @param callback - Callback when Done
 * @param options
 * @returns {Promise} object
 * @constructor
 */
function Database(dbname, options, callback) {
    if (!this instanceof Database) { // jshint ignore:line
        //noinspection JSValidateTypes
        return new Database(dbname, options, callback);
    }
    this._isOpen = false;

    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else {
        options = options || {};
    }

    // Check to see if it has a path, or if it is a relative dbname
    // dbname = "" - Temporary Database
    // dbname = ":memory:" = memory database
    if (dbname !== ""  && dbname !== ":memory:") {
        //var pkgName = appModule.android.context.getPackageName();
        dbname = appModule.android.context.getDatabasePath(dbname).getAbsolutePath();
        var path = dbname.substr(0, dbname.lastIndexOf('/') + 1);

        // Create "databases" folder if it is missing.  This causes issues on Emulators if it is missing
        // So we create it if it is missing

        try {
            var javaFile = new java.io.File(path);
            if (!javaFile.exists()) {
                javaFile.mkdirs();
                javaFile.setReadable(true);
                javaFile.setWritable(true);
            }
        }
        catch (err) {
            console.info("SQLITE.CONSTRUCTOR - Creating DB Folder Error", err);
        }
    }
    var self = this;

    return new Promise(function (resolve, reject) {
        try {
            if (dbname === ":memory:") {
                self._db = android.database.sqlite.SQLiteDatabase.create(null);
            } else {
                self._db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(dbname, null);
            }
        } catch (err) {
            console.error("SQLITE.CONSTRUCTOR -  Open DB Error", err);
            if (callback) { callback(err, null); }
            reject(err);
            return;
        }

        self._isOpen = true;
        if (callback) { callback(null, self); }
        resolve(self);
    });
}

/***
 * Constant that this structure is a sqlite structure
 * @type {boolean}
 */
Database.prototype._isSqlite = true;

/***
 * This gets or sets the database version
 * @param valueOrCallback to set or callback(err, version)
 * @returns Promise
 */
Database.prototype.version = function(valueOrCallback) {
    if (typeof valueOrCallback === 'function') {
        return this.get('PRAGMA user_version', function (err, data) {
            valueOrCallback(err, data && data[0]);
        }, Database.RESULTSASARRAY);
    } else if (!isNaN(valueOrCallback+0)) {
        return this.execSQL('PRAGMA user_version='+(valueOrCallback+0).toString());
    } else {
        return this.get('PRAGMA user_version', Database.RESULTSASARRAY);
    }
};

/***
 * Is the database currently open
 * @returns {boolean} - true if the db is open
 */
Database.prototype.isOpen = function() {
    return this._isOpen;
};

/***
 * Gets/Sets whether you get Arrays or Objects for the row values
 * @param value - Database.RESULTSASARRAY or Database.RESULTSASOBJECT
 * @returns {number} - Database.RESULTSASARRAY or Database.RESULTSASOBJECT
 */
Database.prototype.resultType = function(value) {
    if (value === Database.RESULTSASARRAY) {
        DBGetRowResults = DBGetRowArray;
    } else if (value === Database.RESULTSASOBJECT) {
        //noinspection JSValidateTypes
        DBGetRowResults = DBGetRowObject;
    }

    if (DBGetRowResults === DBGetRowArray) { return (Database.RESULTSASARRAY); }
    else { return (Database.RESULTSASOBJECT); }
};

/***
 * Closes this database, any queries after this will fail with an error
 * @param callback
 */
Database.prototype.close = function(callback) {

    var self = this;
    return new Promise(function(resolve, reject) {
        if (!self._isOpen) {
            if (callback) {
                callback('SQLITE.CLOSE - Database is already closed');
            }
            reject('SQLITE.CLOSE - Database is already closed');
            return;
        }

        self._db.close();
        self._isOpen = false;
        if (callback) {
            callback(null, null);
        }
        resolve();
    });
};

/***
 * Exec SQL
 * @param sql - sql to use
 * @param params - optional array of parameters
 * @param callback - (err, result) - can be last_row_id for insert, and rows affected for update/delete
 * @returns Promise
 */
Database.prototype.execSQL = function(sql, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    var self = this;
    return new Promise(function(resolve, reject) {
        var hasCallback = true;
        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.EXECSQL - Database is not open");
            return;
        }

        // Need to see if we have to run any status queries afterwords
        var flags = 0;
        var test = sql.trim().substr(0, 7).toLowerCase();
        if (test === 'insert ') {
            flags = 1;
        } else if (test === 'update ' || test === 'delete ') {
            flags = 2;
        }

        try {
            if (params !== undefined) {
                self._db.execSQL(sql, self._toStringArray(params));
            } else {
                self._db.execSQL(sql);
            }
        } catch (Err) {
            callback(Err, null);
            return;
        }

        switch (flags) {
            case 0:
                if (hasCallback) {
                    callback(null, null);
                }
                resolve(null);
                break;
            case 1:
                self.get('select last_insert_rowid()', function (err, data) {
                    if (hasCallback) {
                        callback(err, data && data[0]);
                    }
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data && data[0]);
                    }
                }, Database.RESULTSASARRAY);
                break;
            case 2:
                self.get('select changes()', function (err, data) {
                    if (hasCallback) {
                        callback(err, data && data[0]);
                    }
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data && data[0]);
                    }
                }, Database.RESULTSASARRAY);
                break;
            default:
                resolve();
        }

    });
};

/***
 * Get the first record result set
 * @param sql - sql to run
 * @param params - optional
 * @param callback - callback (error, results)
 * @param mode - allows you to manually override the results set to be a array or object
 * @returns Promise
 */
Database.prototype.get = function(sql, params, callback, mode) {
    if (typeof params === 'function') {
        mode = callback;
        callback = params;
        params = undefined;
    }

    var self = this;
    return new Promise(function(resolve, reject) {
        var hasCallback = true;
        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.GET - Database is not open", null);
            return;
        }

        var cursor;
        try {
            if (params !== undefined) {
                cursor = self._db.rawQuery(sql, self._toStringArray(params));
            } else {
                cursor = self._db.rawQuery(sql, null);
            }
        } catch (err) {
            callback(err, null);
            return;
        }

        // No Records
        if (cursor.getCount() === 0) {
            cursor.close();
            if (hasCallback) {
                callback(null, null);
            }
            resolve(null);
            return;
        }

        var results;
        try {
            cursor.moveToFirst();
            if (mode) {
                if (mode === Database.RESULTSASARRAY) {
                    results = DBGetRowArray(cursor); // jshint ignore:line
                } else if (mode === Database.RESULTSASOBJECT) {
                    results = DBGetRowObject(cursor); // jshint ignore:line
                } else {
                    results = DBGetRowResults(cursor); // jshint ignore:line
                }
            } else {
                results = DBGetRowResults(cursor); // jshint ignore:line
            }
            cursor.close();
        } catch (err) {
            callback(err, null);
            return;
        }
        if (hasCallback) {
            callback(null, results);
        }
        resolve(results);
    });
};

/***
 * This returns the entire result set in a array of rows
 * @param sql - Sql to run
 * @param params - optional
 * @param callback - (err, results)
 * @returns Promise
 */
Database.prototype.all = function(sql, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    var self = this;
    return new Promise(function(resolve, reject) {
        var hasCallback = true;
        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.ALL - Database is not open");
            return;
        }

        var cursor, count;
        try {
            if (params !== undefined) {
                cursor = self._db.rawQuery(sql, self._toStringArray(params));
            } else {
                cursor = self._db.rawQuery(sql, null);
            }
            count = cursor.getCount();
        } catch (err) {
            callback(err);
            return;
        }


        // No Records
        if (count === 0) {
            cursor.close();
            if (hasCallback) {
                callback(null, []);
            }
            resolve([]);
            return;
        }
        cursor.moveToFirst();

        var results = [];
        try {
            for (var i = 0; i < count; i++) {
                var data = DBGetRowResults(cursor); // jshint ignore:line
                results.push(data);
                cursor.moveToNext();
            }
            cursor.close();
        } catch (err) {
            callback(err);
            return;
        }
        if (hasCallback) {
            callback(null, results);
        }
        resolve(results);
    });
};

/***
 * This sends each row of the result set to the "Callback" and at the end calls the complete callback upon completion
 * @param sql - sql to run
 * @param params - optional
 * @param callback - callback (err, rowsResult)
 * @param complete - callback (err, recordCount)
 * @returns Promise
 */
Database.prototype.each = function(sql, params, callback, complete) {
    if (typeof params === 'function') {
        complete = callback;
        callback = params;
        params = undefined;
    }

    // Callback is required
    if (typeof callback !== 'function') {
        throw new Error("SQLITE.EACH - requires a callback");
    }

    var self = this;
    return new Promise(function (resolve, reject) {

        // Set the error Callback
        var errorCB = complete || callback;

        var cursor, count;
        try {
            if (params !== undefined) {
                cursor = self._db.rawQuery(sql, self._toStringArray(params));
            } else {
                cursor = self._db.rawQuery(sql, null);
            }
            count = cursor.getCount();
        } catch (err) {
            errorCB(err, null);
            reject(err);
            return;
        }

        // No Records
        if (count === 0) {
            cursor.close();
            if (complete) {
                complete(null, 0);
            }
            resolve(0);
            return;
        }
        cursor.moveToFirst();

        try {
            for (var i = 0; i < count; i++) {
                var data = DBGetRowResults(cursor); // jshint ignore:line
                callback(null, data);
                cursor.moveToNext();
            }
            cursor.close();
        } catch (err) {
            errorCB(err, null);
            reject(err);
            return;
        }
        if (complete) {
            complete(null, count);
        }
        resolve(count);
    });
};

/***
 * Converts a Mixed Array to a String Array
 * @param params
 * @returns {Array}
 * @private
 */
Database.prototype._toStringArray = function(params) {
    var stringParams = [];
    if (Object.prototype.toString.apply(params) === '[object Array]') {
        var count = params.length;
        for (var i=0; i<count; ++i) {
            if (params[i] == null) { // jshint ignore:line
                stringParams.push(null);
            } else {
                stringParams.push(params[i].toString());
            }
        }
    } else {
        if (params == null) { // jshint ignore:line
            stringParams.push(null);
        } else {
            stringParams.push(params.toString());
        }
    }
    return stringParams;
};

/***
 * Is this a SQLite object
 * @param obj - possible sqlite object to check
 * @returns {boolean}
 */
Database.isSqlite = function(obj) {
    return obj && obj._isSqlite;
};

/**
 * Does this database exist on disk
 * @param name
 * @returns {*}
 */
Database.exists = function(name) {
    var dbName = appModule.android.context.getDatabasePath(name).getAbsolutePath();
    var dbFile = new java.io.File(dbName);
    return dbFile.exists();
};

/**
 * Delete the database file if it exists
 * @param name
 */
Database.deleteDatabase = function(name) {
    var dbName = appModule.android.context.getDatabasePath(name).getAbsolutePath();
    var dbFile = new java.io.File(dbName);
    if (dbFile.exists()) {
        dbFile.delete();
        dbFile = new java.io.File(dbName + '-journal');
        if (dbFile.exists()) {
            dbFile.delete();
        }
    }
};

/**
 * Copy the database from the install location
 * @param name
 */
Database.copyDatabase = function(name) {

    //Open your local db as the input stream
    var myInput = appModule.android.context.getAssets().open("app/"+name);

    var dbname = appModule.android.context.getDatabasePath(name).getAbsolutePath();
    var path = dbname.substr(0, dbname.lastIndexOf('/') + 1);

    // Create "databases" folder if it is missing.  This causes issues on Emulators if it is missing
    // So we create it if it is missing

    try {
        var javaFile = new java.io.File(path);
        if (!javaFile.exists()) {
            javaFile.mkdirs();
            javaFile.setReadable(true);
            javaFile.setWritable(true);
        }
    }
    catch (err) {
        console.info("SQLITE - COPYDATABASE - Creating DB Folder Error", err);
    }

   //Open the empty db as the output stream
    var myOutput = new java.io.FileOutputStream(dbname);


    var success = true;
    try {
        //transfer bytes from the inputfile to the outputfile
        var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.class.getField("TYPE").get(null), 1024);
        var length;
        while ((length = myInput.read(buffer)) > 0) {
            myOutput.write(buffer, 0, length);
        }
    }
    catch (err) {
        success = false;
    }


    //Close the streams
    myOutput.flush();
    myOutput.close();
    myInput.close();
    return success;
};

// Literal Defines
Database.RESULTSASARRAY  = 1;
Database.RESULTSASOBJECT = 2;

module.exports = Database;

