/*********************************************************************************
 * (c) 2015, Master Technology
 * Licensed under the MIT license or contact me for a support / commercial license
 *
 * Any questions please feel free to email me or put a issue up on github
 * Version 0.0.1 - IOS                                Nathan@master-technology.com
 *********************************************************************************/

"use strict";
var appModule = require('application');
var fs = require('file-system');

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
    this._resultType = Database.RESULTSASARRAY;

    // Check to see if it has a path, or if it is a relative dbname
    //noinspection JSUnresolvedFunction
    var path;
    if (dbname.indexOf('/') === -1) {
        path = fs.knownFolders.documents().path;
		dbname = path + '/' + dbname;
    } else {
        path = dbname.substr(0, dbname.lastIndexOf('/')+1);
    }

    // Create "databases" folder if it is missing.  This causes issues on Emulators if it is missing
    // So we create it if it is missing

    try {
        if (!fs.File.exists(path)) {
            var fileManager = NSFileManager.defaultManager();
            if (!fileManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(path, true, null, null))
            {
                console.warn("SQLITE.CONSTRUCTOR - Creating DB Folder Error", err);
            }
        }
    }
    catch (err) {
        console.warn("SQLITE.CONSTRUCTOR - Creating DB Folder Error", err);
    }

    var self = this;
    //noinspection JSUnresolvedFunction
    return new Promise(function (resolve, reject) {
		var error;
        try {
            self._db = new interop.Reference();
            // SQLITE_OPEN_FULLMUTEX = 65536, SQLITE_OPEN_CREATE = 4, SQLITE_OPEN_READWRITE = 2
			error = sqlite3_open_v2(dbname, self._db, 4 | 2 | 65536, null);
        } catch (err) {
            callback && callback(err, null);
            reject(err);
            return;
        }
        if (error) {
            callback && callback(error, null);
            reject(error);
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
        this._resultType = Database.RESULTSASARRAY;
    } else if (value === Database.RESULTSASOBJECT) {
        this._resultType = Database.RESULTSASOBJECT;
    }
	return this._resultType;
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

    sqlite3_close(this._db.value);
    this._db = null;
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


    var res;
    try {
		var statement = new interop.Reference();
        res = sqlite3_prepare_v2(this._db.value, sql, -1, statement, null);
		if (res) {
			callback("SQLITE.ExecSQL Failed Prepare: "+res);
            return this;
		}
	    if (params !== undefined) {
            if (!this._bind(statement, params)) {
                callback("SQLITE.ExecSQL Bind Error");
                return this;
            }
		}
		var result = sqlite3_step(statement.value);
        sqlite3_finalize(statement.value);
        if (result && result !== 100 && result !== 101 ) {
            callback("SQLITE.ExecSQL Failed "+res);
            return this;
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
        var statement = new interop.Reference();
        var res = sqlite3_prepare_v2(this._db.value, sql, -1, statement, null);
        if (res) {
            callback("SQLITE.GET Failed Prepare: "+res);
            return this;
        }
        if (params !== undefined) {
            if (!this._bind(statement, params)) {
                callback("SQLITE.GET Bind Error");
                return this;
            }
        }
        var result = sqlite3_step(statement.value);
        if (result === 100) {
            cursor = this._getResults(statement, mode);
        }
        sqlite3_finalize(statement.value);
        if (result && result !== 100 && result !== 101) {
            callback("SQLITE.GET - Step Error" + result);
            return this;
        }
    } catch (err) {
        callback(err, null);
        return this;
    }

    // No Records
    if (!cursor) {
        callback(null, null);
        return this;
    }

    callback(null, cursor);
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

    var rows = [], res;
    try {
        var statement = new interop.Reference();
        res = sqlite3_prepare_v2(this._db.value, sql, -1, statement, null);
        if (res) {
        	callback("SQLITE.ALL - Prepare Error " + res);
            return this;
        }
		if (params !== undefined) {
           if (!this._bind(statement, params)) {
               callback("SQLITE.ALL Bind Error");
               return this;
           }
	    }
        do {
            var result = sqlite3_step(statement.value);
            if (result === 100) {
                var cursor = this._getResults(statement);
                if (cursor) {
                    rows.push(cursor)
                }
            } else if (result && result !== 101) {
                sqlite3_finalize(statement.value);
                callback("SQLITE.ALL - Database Error" + result);
                return this;
            }
        } while (result === 100);
        sqlite3_finalize(statement.value);
    } catch (err) {
        callback(err, null);
        return this;
    }

    // No Records
    if (rows.length === 0) {
        callback(null, null);
        return this;
    }

    callback(null, rows);
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

    var count=0, res;
    try {

        var statement = new interop.Reference();
        res = sqlite3_prepare_v2(this._db.value, sql, -1, statement, null);
		if (res) {
            errorCB("SQLITE.EACH Error in Prepare" + res);
            return this;
		}
        if (params !== undefined) {
            if (!this._bind(statement, params)) {
                errorCB("SQLITE.EACH Bind Error");
                return this;
            }
        }
        do {
            var result = sqlite3_step(statement.value);
            if (result === 100) {
                var cursor = this._getResults(statement);
                if (cursor) {
                    count++;
                    callback(null, cursor);
                }
            } else if (result && result !== 101) {
                sqlite3_finalize(statement.value);
                errorCB("SQLITE.EACH - Database Error "+ result);
                return this;
            }
        } while (result === 100);
        sqlite3_finalize(statement.value);
    } catch (err) {
        errorCB(err, null);
        return this;
    }

    // No Records
    if (count === 0) {
        errorCB(null, null);
        return this;
    }

    if (complete) {
        complete(null, count);
    }
    return this;
};

/**
 * Binds the Parameters in a Statement
 * @param statement
 * @param params
 * @private
		 */
Database.prototype._bind = function(statement, params) {
    var param;
    if (Object.prototype.toString.apply(params) === '[object Array]') {
        var count = params.length, res;
        for (var i=0; i<count; ++i) {
            if (params[i] == null) {
                res = sqlite3_bind_null(statement.value, i+1);
            } else {
                param = params[i].toString();
                res = sqlite3_bind_text(statement.value, i+1, param, -1, null );
            }
			if (res) {
                console.error("SQLITE.Binding Error ", res);
                return false;
            }
        }
    } else {
        if (params == null) {
            res = sqlite3_bind_null(statement.value, 1);
        } else {
            param = params.toString();
            res = sqlite3_bind_text(statement.value, 1, param, -1, null );
	    }
		if (res) {
            console.error("SQLITE.Binding Error ", res);
            return false;
        }
    }
    return true;
};

Database.prototype._getResult = function(statement, column) {
    var resultType = sqlite3_column_type(statement.value, column);
    switch (resultType) {
        case 1: // Int
            return sqlite3_column_int(statement.value, column).toString();
        case 2: // Float
            return sqlite3_column_double(statement.value, column).toString();
        case 3: // Text
            var res = sqlite3_column_text(statement.value, column).value;
            return res;
        case 4: // Blob
            return null; // TODO: We don't currently support Blobs
        case 5: // Null
            return null;
        default:
            return sqlite3_column_text(statement.value, column).value.toString();
    }
};

Database.prototype._getResults = function(statement, mode) {
    mode = mode || this._resultType;

    var cnt = sqlite3_column_count(statement.value), i, data;
    if (cnt === 0) return null;
    if (mode === Database.RESULTSASARRAY) {
        data = [];
        for (i=0;i<cnt;i++) {
            data.push(this._getResult(statement, i));
        }
        return data;
    } else {
        var colName;
        if (this._lastStatement === statement) {
            colName = this._lastResultColumns;
        } else {
            colName = [];
            for (i=0;i<cnt;i++) {
                var cn = sqlite3_column_name(statement.value, i).value;
                if (!cn || colName.contains(cn)) {
                    cn = "column"+i;
                }
                colName.push(cn);
            }
            this._lastResultColumns = colName;
            this._lastStatement = statement;
        }
        data = {};
        for (i=0;i<cnt;i++) {
            data[colName[i]] = this._getResult(statement, i);
        }
        return data;
    }
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

