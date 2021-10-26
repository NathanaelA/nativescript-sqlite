/************************************************************************************
 * (c) 2015-2021 Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to email me or put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 * Version 2.7.0 - iOS
 ***********************************************************************************/
/* global global, require, module */

"use strict";
const fs = require('@nativescript/core/file-system');

/* jshint undef: true, camelcase: false */
/* global Promise, NSFileManager, NSBundle, NSString, interop, sqlite3_open_v2, sqlite3_close, sqlite3_prepare_v2, sqlite3_step,
 sqlite3_finalize, sqlite3_bind_null, sqlite3_bind_text, sqlite3_column_type, sqlite3_column_int64,
 sqlite3_column_double, sqlite3_column_text, sqlite3_column_count, sqlite3_column_name, sqlite3_bind_blob */

let _DatabasePluginInits = [];
const TRANSIENT = new interop.Pointer(-1);


/***
 * Converts a string to a UTF-8 char array and wraps it in an adopted pointer
 * (which is GC managed and kept alive until it's referenced by a variable).
 * The reason for doing it is that iOS runtime marshals JS string arguments via
 * temporary buffers which are deallocated immediately after the call returns. In
 * some cases however, we need them to stay alive for subsequent native calls
 * because otherwise attempts to read the freed memory may lead to unpredictable
 * app crashes.
 * E.g. `sqlite3_step` function happens to use the stored `char *` passed as
 * `dbname` to `sqlite3_open_v2`.
 * @param str
 * @returns {AdoptedPointer} object
 */
function toCharPtr(str) {
    const objcStr = NSString.stringWithString(str);
    // UTF8 strings can be encoded in 4 byte representing each character
    // We are wasting a few bytes of memory, just to make sure we have enough room to copy it...
    const bufferSize = ((str.length) * 4) + 1;
    const buffer = interop.alloc(bufferSize);

    objcStr.getCStringMaxLengthEncoding(buffer, bufferSize, NSUTF8StringEncoding);

    return buffer;
}

/***
 * Creates a Cursor Tracking Statement for reading result sets
 * @param statement
 * @param resultType
 * @param valuesType
 * @constructor
 */
function CursorStatement(statement, resultType, valuesType) {
    this.statement = statement;
    this.resultType = resultType;
    this.valuesType = valuesType;
    this.built = false;
    this.columns = [];
}

//noinspection JSValidateJSDoc
/***
 * Database Constructor
 * @param dbname - Database Name
 * @param options - options
 * @param callback - Callback when Done
 * @returns {Promise} object
 * @constructor
 */
function Database(dbname, options, callback) {
    if (!(this instanceof Database)) { // jshint ignore:line
        //noinspection JSValidateTypes
        return new Database(dbname, options, callback);
    }
    this._messageHandlers = [];
    this._isOpen = false;
    this._resultType = Database.RESULTSASARRAY;
    this._valuesType = Database.VALUESARENATIVE;

    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else {
        options = options || {};
    }

    this._options = options;

    // Check to see if it has a path, or if it is a relative dbname
    // DBNAME = "" - is a Temporary Database
    // DBNAME = ":memory:" - is a Memory only database
    if (dbname !== "" && dbname !== ":memory:") {
        let path;
        if (dbname.indexOf('/') === -1) {
            // noinspection JSUnresolvedVariable, JSUnresolvedFunction
            path = fs.knownFolders.documents().path;
            dbname = path + '/' + dbname;
        } else {
            path = dbname.substr(0, dbname.lastIndexOf('/') + 1);
        }

        // Create "databases" folder if it is missing.  This causes issues on Emulators if it is missing
        // So we create it if it is missing

        try {
            // noinspection JSUnresolvedVariable
            if (!fs.File.exists(path)) {
                //noinspection JSUnresolvedFunction
                const fileManager = iosProperty(NSFileManager, NSFileManager.defaultManager);
                //noinspection JSUnresolvedFunction
                if (!fileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(path, true, null, null)) {
                    console.warn("SQLITE.CONSTRUCTOR - Creating DB Folder Error");
                }
            }
        } catch (err) {
            console.warn("SQLITE.CONSTRUCTOR - Creating DB Folder Error", err);
        }
    }
    this._dbnamePtr = toCharPtr(dbname);
    const self = this;
    //noinspection JSUnresolvedFunction
    return new Promise(function (resolve, reject) {
        let error;
        try {
            let flags = 0;
            if (typeof options.iosFlags !== 'undefined') {
                flags = options.iosFlags;
            }

            self._db = new interop.Reference();
            if (options && options.readOnly) {
                // SQLITE_OPEN_FULLMUTEX = 65536, SQLITE_OPEN_READONLY = 1 ---- 1 | 65536 = 65537
                error = sqlite3_open_v2(self._dbnamePtr, self._db, 65537 | flags, null);
            } else {
                // SQLITE_OPEN_FULLMUTEX = 65536, SQLITE_OPEN_CREATE = 4, SQLITE_OPEN_READWRITE = 2 --- 4 | 2 | 65536 = 65542
                error = sqlite3_open_v2(self._dbnamePtr, self._db, 65542 | flags, null);
            }
            self._db = self._db.value;
        } catch (err) {
            if (callback) {
                callback(err, null);
            }
            reject(err);
            return;
        }
        if (error) {
            if (callback) {
                callback(error, null);
            }
            reject(error);
            return;
        }

        self._isOpen = true;

        let doneCnt = _DatabasePluginInits.length, doneHandled = 0;
        const done = function (err) {
            if (err) {
                doneHandled = doneCnt;  // We don't want any more triggers after this
                if (callback) {
                    callback(err, null);
                }
                reject(err);
                return;
            }
            doneHandled++;
            if (doneHandled === doneCnt) {
                if (callback) {
                    callback(null, self);
                }
                resolve(self);
            }
        };

        if (doneCnt) {
            try {
                for (let i = 0; i < doneCnt; i++) {
                    _DatabasePluginInits[i].call(self, options, done);
                }
            } catch (err) {
                done(err);
            }
        } else {
            if (callback) {
                callback(null, self);
            }
            resolve(self);
        }

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
Database.prototype.version = function (valueOrCallback) {
    return new Promise((resolve, reject) => {
        if (typeof valueOrCallback === 'function') {
            this.get('PRAGMA user_version', function (err, data) {
                const value = data && parseInt(data[0], 10);
                valueOrCallback(err, value);
                if (err) {
                    reject(err);
                } else resolve(value);
            }, Database.RESULTSASARRAY);
        } else if (!isNaN(valueOrCallback + 0)) {
            this.execSQL('PRAGMA user_version=' + (valueOrCallback + 0).toString()).then(resolve, reject);
        } else {
            this.get('PRAGMA user_version', undefined, undefined, Database.RESULTSASARRAY).then((data) => {
                resolve(data && parseInt(data[0], 10))
            }).catch(reject);
        }
    });
};

/***
 * Is the database currently open
 * @returns {boolean} - true if the db is open
 */
Database.prototype.isOpen = function () {
    return this._isOpen;
};

/***
 * Gets/Sets whether you get Arrays or Objects for the row values
 * @param value - Database.RESULTSASARRAY or Database.RESULTSASOBJECT
 * @returns {number} - Database.RESULTSASARRAY or Database.RESULTSASOBJECT
 */
Database.prototype.resultType = function (value) {
    if (value === Database.RESULTSASARRAY) {
        this._resultType = Database.RESULTSASARRAY;
    } else if (value === Database.RESULTSASOBJECT) {
        this._resultType = Database.RESULTSASOBJECT;
    }
    return this._resultType;
};

/***
 * Gets/Sets whether you get Native or Strings for the row values
 * @param value - Database.VALUESARENATIVE or Database.VALUESARESTRINGS
 * @returns {number} - Database.VALUESARENATIVE or Database.VALUESARESTRINGS
 */
Database.prototype.valueType = function (value) {
    if (value === Database.VALUESARENATIVE) {
        this._valuesType = Database.VALUESARENATIVE;
    } else if (value === Database.VALUESARESTRINGS) {
        this._valuesType = Database.VALUESARESTRINGS;
    }
    return this._valuesType;
};

/**
 * Dummy transaction function for public version
 * @param callback
 * @returns {Promise<T>}
 */
Database.prototype.begin = function (callback) {
    throw new Error("Transactions are a Commercial version feature.");
};

/**
 * Dummy prepare function for public version
 * @param sql
 * @returns {*}
 */
Database.prototype.prepare = function (sql) {
    throw new Error("Prepared statements are a Commercial version feature.");
};

// noinspection JSUnusedLocalSymbols
/**
 * Dummy sync enable tracking function for public version
 * @returns {*}
 */
Database.prototype.enableTracking = function (tables, options, callback) {
    throw new Error("Table sync is a Commercial version feature.");
};


/***
 * Closes this database, any queries after this will fail with an error
 * @param callback
 * @returns Promise
 */
Database.prototype.close = function (callback) {

    const self = this;
    return new Promise(function (resolve, reject) {
        if (!self._isOpen) {
            if (callback) {
                callback('SQLITE.CLOSE - Database is already closed');
            }
            reject('SQLITE.CLOSE - Database is already closed');
            return;

        }

        sqlite3_close(self._db);
        self._db = null;
        self._isOpen = false;
        if (self._dbnamePtr != null) {

            /*
             * On the daily app, this one throws Adopted Pointer Error
             *
             * Using this workaround till we update the dependencies
             *
             * self_dbNamePtr is only a database name buffer whose will be freed by GC after null
             */
            try {
                interop.free(self._dbnamePtr);
            } catch (e) {
                console.error("ignore", e);
            }
            self._dbnamePtr = null;
        }
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
Database.prototype.execSQL = function (sql, params, callback) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    const self = this;
    return new Promise(function (resolve, reject) {

        let hasCallback = true;
        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.EXECSQL - Database is not open");
            return;
        }

        // Need to see if we have to run any status queries afterwords
        let flags = 0;
        let test = sql.trim().substr(0, 7).toLowerCase();
        if (test === 'insert ') {
            flags = 1;
        } else if (test === 'update ' || test === 'delete ') {
            flags = 2;
        }


        let res;
        try {
            let statement = new interop.Reference();
            res = sqlite3_prepare_v2(self._db, sql, -1, statement, null);
            statement = statement.value;
            if (res) {
                callback("SQLITE.ExecSQL Failed Prepare: " + res);
                return;
            }
            if (params !== undefined) {
                if (!self._bind(statement, params)) {
                    sqlite3_finalize(statement);
                    callback("SQLITE.ExecSQL Bind Error");
                    return;
                }
            }
            let result = sqlite3_step(statement);
            sqlite3_finalize(statement);
            if (result && result !== 100 && result !== 101) {
                callback("SQLITE.ExecSQL Failed " + result);
                return;
            }

        } catch (Err) {
            callback(Err, null);
            return;
        }


        switch (flags) {
            case 0:
                if (hasCallback) {
                    callback();
                }
                resolve();
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
                }, Database.RESULTSASARRAY | Database.VALUESARENATIVE);
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
                }, Database.RESULTSASARRAY | Database.VALUESARENATIVE);
                break;

            default:
                if (hasCallback) {
                    callback();
                }
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
Database.prototype.get = function (sql, params, callback, mode) {
    if (typeof params === 'function') {
        mode = callback;
        callback = params;
        params = undefined;
    }


    const self = this;
    return new Promise(function (resolve, reject) {
        let hasCallback = true;

        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.GET - Database is not open");
            return;
        }

        let cursor;
        try {
            let statement = new interop.Reference();
            let res = sqlite3_prepare_v2(self._db, sql, -1, statement, null);
            if (res) {
                callback("SQLITE.GET Failed Prepare: " + res);
                return;
            }
            statement = statement.value;
            let cursorStatement = new CursorStatement(statement, self._resultType, self._valuesType);

            if (params !== undefined) {
                if (!self._bind(statement, params)) {
                    sqlite3_finalize(statement);
                    callback("SQLITE.GET Bind Error");
                    return;
                }
            }

            let result = sqlite3_step(statement);
            if (result === 100) {
                cursor = self._getResults(cursorStatement, mode);
            }
            sqlite3_finalize(statement);
            if (result && result !== 100 && result !== 101) {
                callback("SQLITE.GET - Step Error" + result);
                return;
            }
        } catch (err) {
            callback(err);
            return;
        }

        // No Records
        if (!cursor) {
            if (hasCallback) {
                callback(null, null);
            }
            resolve(null);
            return;
        }

        if (hasCallback) {
            callback(null, cursor);
        }
        resolve(cursor);
    });
};

/***
 * This returns the entire result set in a array of rows
 * @param sql - Sql to run
 * @param params - optional
 * @param callback - (err, results)
 * @param mode - set a specific return mode
 * @returns Promise
 */
Database.prototype.all = function (sql, params, callback, mode) {
    if (typeof params === 'function') {
        callback = params;
        params = undefined;
    }

    const self = this;
    return new Promise(function (resolve, reject) {

        let hasCallback = true;
        if (typeof callback !== 'function') {
            callback = reject;
            hasCallback = false;
        }

        if (!self._isOpen) {
            callback("SQLITE.ALL - Database is not open");
            return;
        }

        let rows = [], res;
        try {
            let statement = new interop.Reference();
            res = sqlite3_prepare_v2(self._db, sql, -1, statement, null);
            if (res) {
                callback("SQLITE.ALL - Prepare Error " + res);
                return;
            }

            statement = statement.value;
            let cursorStatement = new CursorStatement(statement, self._resultType, self._valuesType);

            if (params !== undefined) {
                if (!self._bind(statement, params)) {
                    sqlite3_finalize(statement);
                    callback("SQLITE.ALL Bind Error");
                    return;
                }
            }

            let result;
            do {
                result = sqlite3_step(statement);
                if (result === 100) {
                    let cursor = self._getResults(cursorStatement, mode);
                    if (cursor) {
                        rows.push(cursor);
                    }
                } else if (result && result !== 101) {
                    sqlite3_finalize(statement);
                    callback("SQLITE.ALL - Database Error" + result);
                    return;
                }
            } while (result === 100);
            sqlite3_finalize(statement);
        } catch (err) {
            callback(err, null);
            return;
        }

        // No Records
        if (rows.length === 0) {
            if (hasCallback) {
                callback(null, []);
            }
            resolve([]);
            return;
        }

        if (hasCallback) {
            callback(null, rows);
        }
        resolve(rows);
    });
};

/***
 * This sends each row of the result set to the "Callback" and at the end calls the complete callback upon completion
 * @param sql - sql to run
 * @param params - optional
 * @param callback - callback (err, rowsResult)
 * @param complete - callback (err, recordCount)
 * @returns {Promise}
 */
Database.prototype.each = function (sql, params, callback, complete) {
    if (typeof params === 'function') {
        complete = callback;
        callback = params;
        params = undefined;
    }

    // Callback is required
    if (typeof callback !== 'function') {
        throw new Error("SQLITE.EACH - requires a callback");
    }

    const self = this;
    return new Promise(function (resolve, reject) {

        // Set the error Callback
        let errorCB = complete || callback;

        let count = 0, res;
        try {

            let statement = new interop.Reference();
            res = sqlite3_prepare_v2(self._db, sql, -1, statement, null);
            if (res) {
                errorCB("SQLITE.EACH Error in Prepare" + res);
                reject("SQLITE.EACH Error in Prepare" + res);
                return;
            }
            statement = statement.value;
            let cursorStatement = new CursorStatement(statement, self._resultType, self._valuesType);

            if (params !== undefined) {
                if (!self._bind(statement, params)) {
                    sqlite3_finalize(statement);
                    errorCB("SQLITE.EACH Bind Error");
                    reject("SQLITE.EACH Bind Error");
                    return;
                }
            }
            let result;
            do {
                result = sqlite3_step(statement);
                if (result === 100) {
                    let cursor = self._getResults(cursorStatement);
                    if (cursor) {
                        count++;
                        callback(null, cursor);
                    }
                } else if (result && result !== 101) {
                    sqlite3_finalize(statement);
                    errorCB("SQLITE.EACH - Database Error " + result);
                    reject("SQLITE.EACH - Database Error " + result);
                    return;
                }
            } while (result === 100);
            sqlite3_finalize(statement);
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

/**
 * Binds the Parameters in a Statement
 * @param statement
 * @param params
 * @private
 */
Database.prototype._bind = function (statement, params) {
    let param, res;

    if (Array.isArray(params)) {
        const count = params.length;
        for (let i = 0; i < count; ++i) {
            if (params[i] == null) { // jshint ignore:line
                res = sqlite3_bind_null(statement, i + 1);
            } else if (params[i].isKindOfClass && (params[i].isKindOfClass(NSData.class()))) {
                const obj = params[i];
                res = sqlite3_bind_blob(statement, i + 1, obj.bytes, obj.length, TRANSIENT);
            } else {
                param = params[i].toString();
                res = sqlite3_bind_text(statement, i + 1, param, -1, TRANSIENT);
            }
            if (res) {
                console.error("SQLITE.Binding Error ", res);
                return false;
            }
        }
    } else {
        if (params == null) { // jshint ignore:line
            res = sqlite3_bind_null(statement, 1);
        } else if (params.isKindOfClass && (params.isKindOfClass(NSData.class()))) {
            const obj = params;
            res = sqlite3_bind_blob(statement, 1, obj.bytes, obj.length, TRANSIENT);
        } else {
            param = params.toString();
            res = sqlite3_bind_text(statement, 1, param, -1, TRANSIENT);
        }
        if (res) {
            console.error("SQLITE.Binding Error ", res);
            return false;
        }
    }
    return true;
};

Database.prototype._getNativeResult = function (statement, column) {
    const resultType = sqlite3_column_type(statement, column);
    switch (resultType) {
        case 1: // Int
            return sqlite3_column_int64(statement, column);
        case 2: // Float
            return sqlite3_column_double(statement, column);
        case 3: // Text
            //noinspection JSUnresolvedFunction
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
        case 4: // Blob
            return NSData.dataWithBytesLength(sqlite3_column_blob(statement, column), sqlite3_column_bytes(statement, column));
        case 5: // Null
            return null;
        default:
            //noinspection JSUnresolvedFunction
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
    }
};

Database.prototype._getStringResult = function (statement, column) {
    const resultType = sqlite3_column_type(statement, column);
    switch (resultType) {
        case 1: // Int
            //return sqlite3_column_int(statement, column).toString();
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
        case 2: // Float
            //return sqlite3_column_double(statement, column).toString();
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
        case 3: // Text
            //noinspection JSUnresolvedFunction
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
        case 4: // Blob
            return NSData.dataWithBytesLength(sqlite3_column_blob(statement, column), sqlite3_column_bytes(statement, column));
        case 5: // Null
            return null;
        default:
            //noinspection JSUnresolvedFunction
            return NSString.stringWithUTF8String(sqlite3_column_text(statement, column)).toString();
    }
};

Database.prototype._getResults = function (cursorStatement, mode) {
    let resultType, valueType;
    let statement = cursorStatement.statement;
    let i;

    if (!mode) {
        resultType = cursorStatement.resultType;
        valueType = cursorStatement.valuesType;
    } else {
        resultType = (mode & (Database.RESULTSASARRAY | Database.RESULTSASOBJECT));
        valueType = (mode & (Database.VALUESARENATIVE | Database.VALUESARESTRINGS));
        if (resultType <= 0) {
            resultType = cursorStatement.resultType;
        }
        if (valueType <= 0) {
            valueType = cursorStatement.valuesType;
        }
    }

    // Track this statements information so we don't have to build it each time
    if (!cursorStatement.built) {
        cursorStatement.count = sqlite3_column_count(statement);
        if (resultType === Database.RESULTSASOBJECT) {
            for (i = 0; i < cursorStatement.count; i++) {
                //noinspection JSUnresolvedFunction
                let cn = NSString.stringWithUTF8String(sqlite3_column_name(statement, i)).toString();
                if (!cn || cursorStatement.columns.indexOf(cn) >= 0) {
                    cn = "column" + i;
                }
                cursorStatement.columns.push(cn);
            }
        }
        cursorStatement.built = true;
    }

    let cnt = cursorStatement.count, data;
    if (cnt === 0) {
        return null;
    }
    if (resultType === Database.RESULTSASARRAY) {
        data = [];
        if (valueType === Database.VALUESARESTRINGS) {
            for (i = 0; i < cnt; i++) {
                data.push(this._getStringResult(statement, i));
            }
        } else {
            for (i = 0; i < cnt; i++) {
                data.push(this._getNativeResult(statement, i));
            }
        }
        return data;
    } else {
        let colName = cursorStatement.columns;
        data = {};
        if (valueType === Database.VALUESARESTRINGS) {
            for (i = 0; i < cnt; i++) {
                data[colName[i]] = this._getStringResult(statement, i);
            }
        } else {
            for (i = 0; i < cnt; i++) {
                data[colName[i]] = this._getNativeResult(statement, i);
            }
        }
        return data;
    }
};

Database.prototype.notify = function (type, message) {
    if (typeof global.postMessage === 'function') {
        postMessage({id: -2, type: type, message: message});
    } else {
        console.error("SQLite: Not in a thread");

        // Local Notify
        this._notify(type, message);
    }
};

Database.prototype._notify = function (type, message) {
    if (type == null || typeof this._messageHandlers[type] === "undefined") {
        return;
    }
    let handlers = this._messageHandlers[type];
    try {
        for (let i = 0; i < handlers; i++) {
            handlers[i](message, type, this);
        }
    } catch (err) {
        console.error("SQLite: Error in user code ", err, err.stack);
    }
}

Database.prototype.addMessageHandler = function (type, callback) {
    if (typeof this._messageHandlers[type] === 'undefined') {
        this._messageHandlers[type] = [];
    }
    this._messageHandlers[type].push(callback);
};

Database.prototype.removeMessageHandler = function (type, callback) {
    if (type != null && typeof this._messageHandlers[type] === "undefined") {
        console.error("SQLite: This message handler " + type + " does not exist.");
        return;
    }

    if (callback) {
        // Remove all message handles that match this callback & this db...
        for (let i = 0; i < this._messageHandlers[type].length; i++) {
            if (this._messageHandlers[type][i].callback === callback) {
                this._messageHandlers[type].splice(i, 1);
                i--;
            }
        }
    } else if (type != null) {
        // Remove all message handlers for this type
        this._messageHandlers[type] = [];
    } else {
        // Remove all message handlers for this database
        this._messageHandlers = [];
    }
};

/***
 * Is this a SQLite object
 * @param obj - possible sqlite object to check
 * @returns {boolean}
 */
Database.isSqlite = function (obj) {
    return obj && obj._isSqlite;
};

Database.exists = function (name) {
    if (name.indexOf('/') === -1) {
        name = fs.knownFolders.documents().path + '/' + name;
    }

    //noinspection JSUnresolvedFunction
    const fileManager = iosProperty(NSFileManager, NSFileManager.defaultManager);

    return fileManager.fileExistsAtPath(name);
};

Database.deleteDatabase = function (name) {
    //noinspection JSUnresolvedFunction
    const fileManager = iosProperty(NSFileManager, NSFileManager.defaultManager);

    let path;
    if (name.indexOf('/') === -1) {
        path = fs.knownFolders.documents().path + '/';
    } else {
        path = name.substr(0, name.lastIndexOf('/') + 1);
        name = name.substr(path.length);
    }

    if (!fileManager.fileExistsAtPath(path + name)) {
        return;
    }

    // Need to remove the trailing .sqlite
    let idx = name.lastIndexOf('.');
    if (idx) {
        name = name.substr(0, idx);
    }

    let files = fileManager.contentsOfDirectoryAtPathError(path, null);
    if (!files) {
        return;
    }

    for (let i = 0; i < files.count; i++) {
        const fileName = files.objectAtIndex(i);
        if (fileName.indexOf(name) !== -1) {
            fileManager.removeItemAtPathError(path + fileName, null);
        }
    }
};

Database.copyDatabase = function (name, destName) {
    //noinspection JSUnresolvedFunction

    const fileManager = iosProperty(NSFileManager, NSFileManager.defaultManager);

    let path;
    if (name.indexOf('/') === -1) {
        path = fs.knownFolders.documents().path + '/';
    } else {
        path = name.substr(0, name.lastIndexOf('/') + 1);
        name = name.substr(path.length);
    }

    let source = fs.knownFolders.currentApp().path + '/' + name;

    if (!destName) {
        destName = name;
    } else if (destName.indexOf("/") >= 0) {
        destName = destName.substring(destName.lastIndexOf('/') + 1);
    }

    let destination = path + destName;
    fileManager.copyItemAtPathToPathError(source, destination, null);
};

function UsePlugin(loadedSrc, DBModule) {
    if (loadedSrc.prototypes) {
        for (let key in loadedSrc.prototypes) {
            if (!loadedSrc.prototypes.hasOwnProperty(key)) {
                continue;
            }
            if (DBModule.prototype[key]) {
                DBModule.prototype["_" + key] = DBModule.prototype[key];
            }
            DBModule.prototype[key] = loadedSrc.prototypes[key];
        }
    }
    if (loadedSrc.statics) {
        for (let key in loadedSrc.statics) {
            if (!loadedSrc.statics.hasOwnProperty(key)) {
                continue;
            }
            DBModule[key] = loadedSrc.statics[key];
        }
    }
    if (typeof loadedSrc.init === 'function') {
        _DatabasePluginInits.push(loadedSrc.init);
    }
}

function iosProperty(_this, property) {
    if (typeof property === "function") {
        // xCode < 8
        return property.call(_this);
    } else {
        // xCode >= 8
        return property;
    }
}

// Literal Defines
Database.prototype.RESULTSASARRAY = Database.RESULTSASARRAY = 1;
Database.prototype.RESULTSASOBJECT = Database.RESULTSASOBJECT = 2;
Database.prototype.VALUESARENATIVE = Database.VALUESARENATIVE = 4;
Database.prototype.VALUESARESTRINGS = Database.VALUESARESTRINGS = 8;


/** These are optional plugins, must have a static require statement for webpack **/
TryLoadingCommercialPlugin();
TryLoadingEncryptionPlugin();
TryLoadingSyncPlugin();

function TryLoadingCommercialPlugin() {
    try {
        const sqlCom = require('nativescript-sqlite-commercial');
        UsePlugin(sqlCom, Database);
    } catch (e) { /* Do Nothing if it doesn't exist as it is an optional plugin */
    }
}

function TryLoadingEncryptionPlugin() {
    try {
        const sqlEnc = require('nativescript-sqlite-encrypted');
        UsePlugin(sqlEnc, Database);
    } catch (e) { /* Do Nothing if it doesn't exist as it is an optional plugin */
    }
}

function TryLoadingSyncPlugin() {
    try {
        const sqlSync = require('nativescript-sqlite-sync');
        UsePlugin(sqlSync, Database);
    } catch (e) { /* Do Nothing if it doesn't exist as it is an optional plugin */
    }
}


module.exports = Database;

