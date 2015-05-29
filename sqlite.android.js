/*********************************************************************************
 * (c) 2015, Master Technology
 * Licensed under the MIT license or contact me for a support / commercial license
 *
 * Any questions please feel free to email me or put a issue up on github
 * Version 0.0.6 - Android                            Nathan@master-technology.com
 *********************************************************************************/

"use strict";
var appModule = require("application");

// Needed for Creating Database - Android Specific flag
//var CREATEIFNEEDED = 0x10000000;


/***
 * Parses a Row of data into a JS Array
 * @param cursor
 * @returns {Array}
 * @constructor
 */
function DBGetRowArray(cursor) {
    //noinspection JSUnresolvedFunction
    var count = cursor.getColumnCount();
    var results = [];
    for (var i=0;i<count;i++) {
        //noinspection JSUnresolvedFunction
        var type = cursor.getType(i);
        switch (type) {
            case 0: // NULL
                results.push(null);
                break;

            case 1: // Integer
                //noinspection JSUnresolvedFunction
                results.push(cursor.getInt(i));
                break;

            case 2: // Float
                //noinspection JSUnresolvedFunction
                results.push(cursor.getFloat(i));
                break;

            case 3: // String
                //noinspection JSUnresolvedFunction
                results.push(cursor.getString(i));
                break;

            case 4: // Blob
                //noinspection JSUnresolvedFunction
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
    //noinspection JSUnresolvedFunction
    var count = cursor.getColumnCount();
    var results = {};
    for (var i=0;i<count;i++) {
        //noinspection JSUnresolvedFunction
        var type = cursor.getType(i);
        //noinspection JSUnresolvedFunction
        var name = cursor.getColumnName(i);
        switch (type) {
            case 0: // NULL
                results[name] = null;
                break;

            case 1: // Integer
                //noinspection JSUnresolvedFunction
                results[name] = cursor.getInt(i);
                break;

            case 2: // Float
                //noinspection JSUnresolvedFunction
                results[name] = cursor.getFloat(i);
                break;

            case 3: // String
                //noinspection JSUnresolvedFunction
                results[name] = cursor.getString(i);
                break;

            case 4: // Blob
                //noinspection JSUnresolvedFunction
                results[name] = cursor.getBlob(i);
                break;

            default:
                throw new Error('SQLITE - Unknown Field Type '+ type);
        }
    }
    return results;
}
var DBGetRowResults = DBGetRowArray;

/**
 * Used to throw a error if a callback wasn't supplied
 * @param err
 * @constructor
 */
function CallbackThrowError(err) {
    if (err) {
        throw new Error(err);
    }
}


//noinspection JSValidateJSDoc
/***
 * Database Constructor
 * @param dbname - Database Name
 * @param callback - Callback when Done
 * @returns {Promise} object
 * @constructor
 */
function Database(dbname, callback) {
    if (!this instanceof Database) {
        //noinspection JSValidateTypes
        return new Database(dbname, callback);
    }
    this._isOpen = false;

    // Check to see if it has a path, or if it is a relative dbname
    //noinspection JSUnresolvedFunction
    // dbname = "" - Temporary Database
    // dbname = ":memory:" = memory database
    if (dbname !== ""  && dbname !== ":memory:") {
        var pkgName = appModule.android.context.getPackageName();
        var path = '/data/data/' + pkgName + '/databases/';
        if (dbname.indexOf('/') === -1) {
            dbname = path + dbname;
        } else {
            path = dbname.substr(0, dbname.lastIndexOf('/') + 1);
        }


        // Create "databases" folder if it is missing.  This causes issues on Emulators if it is missing
        // So we create it if it is missing

        try {
            //noinspection JSUnresolvedVariable
            var javaFile = new java.io.File(path);
            if (!javaFile.exists()) {
                //noinspection JSUnresolvedFunction
                javaFile.mkdirs();
                //noinspection JSUnresolvedFunction
                javaFile.setReadable(true);
                //noinspection JSUnresolvedFunction
                javaFile.setWritable(true);
            }
        }
        catch (err) {
            console.info("SQLITE.CONSTRUCTOR - Creating DB Folder Error", err);
        }
    }
    var self = this;
    //noinspection JSUnresolvedFunction
    return new Promise(function (resolve, reject) {
        try {
            //noinspection JSUnresolvedVariable, JSUnresolvedFunction
            if (dbname === ":memory:") {
                self._db = android.database.sqlite.SQLiteDatabase.create(null);
            } else {
                self._db = android.database.sqlite.SQLiteDatabase.openOrCreateDatabase(dbname, null);
            }
        } catch (err) {
            console.error("SQLITE.CONSTRUCTOR -  Open DB Error", err);
            callback && callback(err, null);
            reject(err);
            return;
        }

        self._isOpen = true;
        callback && callback(null, self);
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
 */
Database.prototype.version = function(valueOrCallback) {
    if (typeof valueOrCallback === 'function') {
        this.get('PRAGMA user_version', function (err, data) {
            valueOrCallback(err, data && data[0]);
        }, Database.RESULTSASARRAY);
    } else if (!isNaN(valueOrCallback+0)) {
        this.execSQL('PRAGMA user_version='+(valueOrCallback+0).toString());
    }
};

//noinspection JSUnusedGlobalSymbols
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

    if (DBGetRowResults === DBGetRowArray) return (Database.RESULTSASARRAY);
    else return (Database.RESULTSASOBJECT);
};

/***
 * Closes this database, any queries after this will fail with an error
 * @param callback
 */
Database.prototype.close = function(callback) {
    if (!this._isOpen) {
        if (callback) {
            callback('SQLITE.CLOSE - Database is already closed');
            return;
        } else {
            throw new Error('SQLITE.CLOSE - Database is already closed');
        }
    }

    this._db.close();
    this._isOpen = false;
    if (callback) {
        callback(null, null);
    }
    return this;
};

/***
 * Exec SQL
 * @param sql - sql to use
 * @param params - optional array of parameters
 * @param callback - (err, result) - can be last_row_id for insert, and rows affected for update/delete
 * @returns {Database}
 */
Database.prototype.execSQL = function(sql, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    if (typeof callback !== 'function') {
        callback = CallbackThrowError;
    }

    if (!this._isOpen) {
        callback("SQLITE.EXECSQL - Database is not open", null);
        return this;
    }
    
    // Need to see if we have to run any status queries afterwords
    var flags = 0;
    var test = sql.trim().substr(0,7).toLowerCase();
    if (test === 'insert ') {
        flags = 1;
    } else if (test === 'update ' || test === 'delete ') {
        flags = 2;
    }

    try {
        if (params !== undefined) {
            this._db.execSQL(sql, this._toStringArray(params));
        } else {
            this._db.execSQL(sql);
        }
    } catch (Err) {
        callback(Err, null);
        return this;
    }


    switch (flags) {
        case 0:
            callback(null, null);
            break;
        case 1:
            this.get('select last_insert_rowid()', function(err, data) {
                callback(err, data && data[0]);
            }, Database.RESULTSASARRAY);
            break;
        case 2:
            this.get('select changes()', function (err, data) {
                callback(err, data && data[0]);
            }, Database.RESULTSASARRAY);
            break;
    }

    return this;
};

/***
 * Get the first record result set
 * @param sql - sql to run
 * @param params - optional
 * @param callback - callback (error, results)
 * @param mode - allows you to manually override the results set to be a array or object
 * @returns {Database}
 */
Database.prototype.get = function(sql, params, callback, mode) {
    if (typeof params === 'function') {
        mode = callback;
        callback = params;
        params = undefined;
    }

    if (typeof callback !== 'function') {
        callback = CallbackThrowError;
    }

    if (!this._isOpen) {
        callback("SQLITE.GET - Database is not open", null);
        return this;
    }

    var cursor;
    try {
        if (params !== undefined) {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, this._toStringArray(params));
        } else {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, null);
        }
    } catch (err) {
        callback(err, null);
        return this;
    }

    // No Records
    if (cursor.getCount() === 0) {
        cursor.close();
        callback(null, null);
        return this;
    }

    var results;
    try {
        //noinspection JSUnresolvedFunction
        cursor.moveToFirst();
        if (mode) {
           if (mode === Database.RESULTSASARRAY) {
               results = DBGetRowArray(cursor);
           } else if (mode === Database.RESULTSASOBJECT ) {
               results = DBGetRowObject(cursor);
           } else {
               results = DBGetRowResults(cursor);
           }
        } else {
            results = DBGetRowResults(cursor);
        }
        cursor.close();
    } catch (err) {
        callback(err, null);
        return this;
    }
    callback(null, results);
    return this;
};

/***
 * This returns the entire result set in a array of rows
 * @param sql - Sql to run
 * @param params - optional
 * @param callback - (err, results)
 * @returns {Database}
 */
Database.prototype.all = function(sql, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    if (typeof callback !== 'function') {
        callback = CallbackThrowError;
    }

    if (!this._isOpen) {
        callback("SQLITE.ALL - Database is not open", null);
        return this;
    }

    var cursor, count;
    try {
        if (params !== undefined) {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, this._toStringArray(params));
        } else {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, null);
        }
        count = cursor.getCount();
    } catch (err) {
        callback(err, null);
        return this;
    }


    // No Records
    if (count === 0) {
        cursor.close();
        callback(null, null);
        return this;
    }
    //noinspection JSUnresolvedFunction
    cursor.moveToFirst();

    var results=[];
    try {
        for (var i=0;i<count;i++) {
            var data = DBGetRowResults(cursor);
            results.push(data);
            //noinspection JSUnresolvedFunction
            cursor.moveToNext();
        }
        cursor.close();
    } catch (err) {
        callback(err, null);
        return this;
    }
    callback(null, results);
    return this;
};

/***
 * This sends each row of the result set to the "Callback" and at the end calls the complete callback upon completion
 * @param sql - sql to run
 * @param params - optional
 * @param callback - callback (err, rowsResult)
 * @param complete - callback (err, recordCount)
 * @returns {Database}
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

    // Set the error Callback
    var errorCB = complete || callback;

    var cursor, count;
    try {
        if (params !== undefined) {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, this._toStringArray(params));
        } else {
            //noinspection JSUnresolvedFunction
            cursor = this._db.rawQuery(sql, null);
        }
        count = cursor.getCount();
    } catch (err) {
        errorCB(err, null);
        return this;
    }

    // No Records
    if (count === 0) {
        errorCB(null, null);
        cursor.close();
        return this;
    }
    //noinspection JSUnresolvedFunction
    cursor.moveToFirst();

    try {
        for (var i=0;i<count;i++) {
            var data = DBGetRowResults(cursor);
            callback(null, data);
            //noinspection JSUnresolvedFunction
            cursor.moveToNext();
        }
        cursor.close();
    } catch (err) {
        errorCB(err, null);
        return this;
    }
    if (complete) {
        complete(null, count);
    }
    return this;
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
            if (params[i] == null) {
                stringParams.push(null);
            } else {
                stringParams.push(params[i].toString());
            }
        }
    } else {
        if (params == null) {
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

// Literal Defines
Database.RESULTSASARRAY  = 1;
Database.RESULTSASOBJECT = 2;

module.exports = Database;

