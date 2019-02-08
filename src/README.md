[![npm](https://img.shields.io/npm/v/nativescript-sqlite.svg)](https://www.npmjs.com/package/nativescript-sqlite)
[![npm](https://img.shields.io/npm/dt/nativescript-sqlite.svg?label=npm%20downloads)](https://www.npmjs.com/package/nativescript-sqlite)
[![Twitter Follow](https://img.shields.io/twitter/follow/congocart.svg?style=social&label=Follow%20me)](https://twitter.com/congocart)


# NativeScript sqlite

A NativeScript module providing sqlite actions for Android and iOS. (with multi-threading)

## Developed by
[![MasterTech](https://plugins.nativescript.rocks/i/mtns.png)](https://plugins.nativescript.rocks/mastertech-nstudio)


## License

There are two possible licenses this is released under;

[![npm](https://img.shields.io/npm/l/nativescript-sqlite.svg?style=plastic)](https://www.npmjs.com/package/nativescript-sqlite)
![license](https://img.shields.io/badge/license-Commercial-blue.svg?style=plastic)


### NativeScript-Sqlite Free version

This is released under the MIT License, meaning you are free to include this in any type of program -- However for entities that need a support contract, changes, enhancements and/or a commercial license please see [http://nativescript.tools](http://nativescript.tools/product/10)

[![Donate](https://img.shields.io/badge/Donate-PayPal-brightgreen.svg?style=plastic)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=HN8DDMWVGBNQL&lc=US&item_name=Nathanael%20Anderson&item_number=nativescript%2dsqlite&no_note=1&no_shipping=1&currency_code=USD&bn=PP%2dDonationsBF%3ax%3aNonHosted)
[![Patreon](https://img.shields.io/badge/Pledge-Patreon-brightgreen.svg?style=plastic)](https://www.patreon.com/NathanaelA)


### NativeScript-SQLite Commercial/Encrypted Version
This is released under a commercial license, allowing you to use the commercial version of the plugin in your projects.

The [commercial version](http://nativescript.tools/product/10) comes with the following enhancements:
- TypeScript definitions
- Totally backwards compatible with the free version
- Prepared statements
- Multilevel transaction support
- Encryption
- Full source code
- **Multi-threading** 

Note: On iOS when installing the encryption, you **might** have to delete the following file:
`node_modules/nativescript-sqlite/platforms/ios/module.modulemap`.  And then run a `tns platform clean ios`
This file is REQUIRED for normal un-encrypted sqlite; but it can conflict with encryption on some versions of XCode.  When you run the app; if you get a console line about encryption not being linked in; then this is the cause.
 

## Example Application

An example application can be cloned from this repo, in the demo folder.
To use you need to do:
1. `npm install tns-core-modules`
2. `tns platform add ios` or `tns platform add android`
3. `tns plugin add nativescript-sqlite`

***optional***
* `tns plugin add nativescript-sqlite-commercial-???.tgz`
* `tns plugin add nativescript-sqlite-encrypted-???.tgz`

Then run the app the normal way you would.


## Installation

Run `tns plugin add nativescript-sqlite` in your ROOT directory of your project.

***optional***
* `tns plugin add nativescript-sqlite-commercial-???.tgz`
* `tns plugin add nativescript-sqlite-encrypted-???.tgz`


## Webpacking

If you are including your own sqlite database embedded in your app; and you are webpacking then around line 100 of the `webpack.config.js` is
a section that looks like so:

```js
    // Copy assets to out dir. Add your own globs as needed.
            new CopyWebpackPlugin([
                { from: "App_Resources/**" },
                { from: "fonts/**" },
                { from: "**/*.jpg" },
                { from: "**/*.png" },
```

Add a new line `{from: "**/*.sqlite"}` so that it will pick up your sqlite file while bundling the application.

In addition if you are not using the Commercial or Encrypted plugin; you would need to add:

```
externals: {
     'nativescript-sqlite-commercial': 'nativescript-sqlite-commercial',
     'nativescript-sqlite-encrypted': 'nativescript-sqlite-encrypted',
},
```
so that it ignores those during webpacking...

## Usage

To use the sqlite module you must first `require()` it:

```js
var Sqlite = require( "nativescript-sqlite" );
```

After you have a reference to the module you can then call the available methods.
The database defaults to returning result sets in arrays; i.e. [[field1, field2, ...], [field1, field2], [field1, field2] ...] you can change this to returning them in objects if you desire.

## Shipping a Database with the application

If you are planning on shipping a database with the application; drop the file in your projects /app folder (`src` if using Angular).  The Sqlite.copyDatabase("database_name") will copy the database from that folder to the proper database folder on your platform.


### Callbacks
* All callbacks have the standard (Error, result) prototype
* USE CALLBACKS or PROMISES; it is not recommended to use both

### Promises
* Will either call your *reject* with the error or the *resolve* with the answer
* USE CALLBACKS or PROMISES; it is not recommended to use both

### Constants
* Sqlite.RESULTSASARRAY - Returns results as Arrays (ex: select name, phone --- results  [[name,phone]])
* Sqlite.RESULTSASOBJECT - Returns results as Objects (ex: select name, phone --- results [{name: name, phone: phone}]
* Sqlite.VALUESARENATIVE - Returns the values as the native values; i.e. Integer = Integer, Float = Number
* Sqlite.VALUESARESTRINGS - Returns all the values as a string; so the Integer 1 would be returned as "1"


* Sqlite.HAS_COMMERCIAL - will be true if commercial library is loaded.
* Sqlite.HAS_ENCRYPTION - will be true if encryption library is loaded.

### Methods
#### new Sqlite(dbname, options, callback)
##### Parameters
* dbname: your database name.   This can be ":memory:" for a memory Database. This can be "" for a Temporary Database.
* options 
  * "readOnly", which if set to true will make the db read only when it opens it
  * "key", used for using/opening encrypted databases (See Encryption at bottom of document)
  * "multithreading", enable background multitasking.  All SQL is ran on a background worker thread.  
* (optional) callback (error, db): db is the fully OPEN database object that allows interacting with the db.
* RETURNS: promise of the DB object

 You should choose either to use a promise or a callback; you can use whichever you are most comfortable with -- however, as with this example, you CAN use both if you want; but side effects WILL occur with some functions.

```js
// my-page.js
var Sqlite = require( "/path/to/node_modules/nativescript-sqlite" );
var db_promise = new Sqlite("MyTable", function(err, db) {
    if (err) {
      console.error("We failed to open database", err);
    } else {
      // This should ALWAYS be true, db object is open in the "Callback" if no errors occurred
      console.log("Are we open yet (Inside Callback)? ", db.isOpen() ? "Yes" : "No"); // Yes
    }
});

db_promise.then(function(db) {
    // This should ALWAYS be true, db object is open in the "then"
      console.log("Are we open yet (Inside Promise)? ", db.isOpen() ? "Yes" : "No"); // Yes
      db.close();
   }, function(err) {
     console.error("We failed to open database", err);
   });
```

#### Sqlite.isSqlite()
##### Parameters
* object to check
* RETURNS: Boolean, True or False if the object passed to this function is a sqlite database

```js
// my-page.js
new Sqlite("test.db", function(err, db) {
  console.log("Is a Sqlite Database:", Sqlite.isSqlite(db) ? "Yes" : "No");  // Should print "Yes"
});
```

#### Sqlite.exists()
##### Parameters
* database name
* RETURNS: Boolean, True if the database exists in the App/OS Database folder


#### Sqlite.deleteDatabase()
* database name to delete in the App/OS Database folder
* RETURNS: Nothing


#### Sqlite.copyDatabase()
* database name to copy from your app folder to the proper database folder on the OS
* RETURNS: True if copy was successful
* NOTES: This will only copy the file if it does not already exist at the destination.

```js
// If we are in Debug Code, we always delete the database first so that the latest copy of the database is used...
if (DEBUGMODE && Sqlite.exists("mydatabase.sqlite")) {
  Sqlite.deleteDatabase("mydatabase.sqlite");
}
if (!Sqlite.exists("mydatabase.sqlite")) {
  Sqlite.copyDatabase("mydatabase.sqlite");
}
```

### DB Methods = Returned Database Object from Constructor
#### DB.version()
##### Parameters
* Value to set it to, or a Callback for retrieving the value.
If Callback Value will have the version.  On a new Database it will be Zero
If Version number, then the database will be changed to the version you passed to this function
* RETURNS: Promise.

```js
new Sqlite("test.db", function(err, db) {
  db.version(function(err, ver) {
    if (ver === 0) {
      db.execSQL("Create table....");
      db.version(1); // Sets the version to 1
    }
  });
});
```

#### DB.isOpen()
* RETURNS: Boolean, Is the current database open true/false
Please note; it is possible that this value could be wrong initially in multithreading as the db might still be in the process of opening.  For compatibility we set this to true automatically in multithreading after you do an open. 


#### DB.resultType()
##### Parameters
* Pass in Sqlite.RESULTSASOBJECT or Sqlite.RESULTSASARRAY to change the result sets configuration
This will set the database to return the results in which ever choice you make.  (Default is RESULTSASARRAY)


#### DB.valueType()
##### Parameters
* Pass in Sqlite.VALUESARENATIVE or Sqlite.VALUESARESTRING to change the result sets configuration
This will set the database to return the results to which ever choice you make.  (Default is VALUESARENATIVE)


#### DB.close()
* Closes the database
* RETURNS: Promise
NOTE: Any DB calls after this will throw errors.


#### DB.execSQL()
##### Parameters
* SQL statement to run, can use ? for Parameters
* Params (Optional) - an array of Parameters
* Callback will either return null or the last id inserted or the record count of update/delete
This routine you can use for "update", "insert", "delete" and any other sqlite command where you are not expecting a result set back.
If this is a Insert it will return the last row id of the new inserted record.  If it is a update/insert it will return the number of rows affected.
* RETURNS: Promise; resolved results are the same as the callback values.

```js
// new SQLite(....
db.execSQL("insert into Hello (word) values (?)", ["Hi"], function(err, id) {
  console.log("The new record id is:", id);
});
```

```js
// new SQLite(....
var promise = db.execSQL("insert into Hello (word) values (?)", ["Hi"]);
promise.then(function(id) {
        console.log("The new record id is:", id);
});
```


#### DB.get()
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the first row of the result set.
* RETURNS: Promise, will has have first row.

```js
// new SQLite(...
db.get('select * from Hello where id=?', [1], function(err, row) {
  console.log("Row of data was: ", row);  // Prints [["Field1", "Field2",...]]
});
```

```js
// new SQLite(...
var promise = db.get('select * from Hello where id=?', [1]);
promise.then(function(row) {
    console.log("Row of data was: ", row);  // Prints [["Field1", "Field2",...]]
});
```



#### DB.all()
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the all the rows of the result set.
* RETURNS: Promise, will have all the rows of the result set.

```js
// new SQLite(...
db.all('select * from Hello where id > ? and id < ?', [1,100], function(err, resultSet) {
  console.log("Result set is:", resultSet); // Prints [["Row_1 Field_1" "Row_1 Field_2",...], ["Row 2"...], ...]
});
```

```js
// new SQLite(...
var promise = db.all('select * from Hello where id > ? and id < ?', [1,100]);
promise.then(function(resultSet) {
  console.log("Result set is:", resultSet); // Prints [["Row_1 Field_1" "Row_1 Field_2",...], ["Row 2"...], ...]
});
```



#### DB.each()
##### Parameters
* SQL Select statement, can use ? for parameters
* Params (Optional)
* Callback (REQUIRED) will be called for EACH row of the result set with the current row value
* Finished_Callback (Optional) will be called when it is complete with the number of rows handled.
* RETURNS: Promise; please note the per row CALLBACK is still required; otherwise you won't have any results...


```js
// new SQLite(...
db.each('select * from Hello where id >= ? and id <= ?', [1, 100],
function (err, row) {
  console.log("Row results it:", row); // Prints ["Row x Field_1", "Row x Field 2"...] for each row passed to it
},
function (err, count) {
  console.log("Rows displayed:", count); // Prints 100  (Assuming their are a 100 rows found)
});
```

```js
// new SQLite(...
var promise = db.each('select * from Hello where id >= ? and id <= ?', [1, 100],
function (err, row) {
  console.log("Row results it:", row); // Prints ["Row x Field_1", "Row x Field 2"...] for each row passed to it
});
promise.then(function (count) {
  console.log("Rows displayed:", count); // Prints 100  (Assuming their are a 100 rows found)
});
```



## Commercial Only Features

#### To enable the optional features

To enable encryption: `tns plugin add nativescript-sqlite-encrypted-1.2.1.tgz`

To enable commercial: `tns plugin add nativescript-sqlite-commercial-1.2.0.tgz`


### Encryption Support
Pass the encryption key into database open function using the `options.key` and it will be applied.  Please note the database itself MUST be created with encryption to use encryption.  So if you create a plain database, you can not retroactively add encryption to it.  
If you pass a blank (**""**) empty key, then it will treat it as no key.   But, it will still use the encrypted driver in case you need certain features from the more modern sqlite driver; but don't need encryption.  

Note: Enabling/Compiling in the encryption driver adds about 3 megs to the size to the application APK on android and about 2 megs to a iOS application.  
    
### Multitasking / Multithreading
The commercial version supports putting all SQL access into a background thread, so your UI doesn't freeze while doing data access.  To enable; just pass in {multithreading: true} as an option when creating a new Sqlite connection.        
    

### Prepared Queries
#### DB.prepare(SQL) 
##### Parameter:
* SQL Statement
* Returns Prepared Statement

#### PREPAREDSTATEMENT.execute(param1, param2, param3, optional_callback)
#### PREPAREDSTATEMENT.execute([param1, param2, param3], optional_callback)
#### PREPAREDSTATEMENT.execute([ [ p1, p2, p3], [p1, p2, p3], ...], optional_callback)
###### Parameters:
* Pass in values, Array of values, or Array of Arrays
* Pass in an optional callback last for when finished.
* Returns a Promise

#### PREPAREDSATEMENT.finished()
* Cleans up and destroys this prepared statement.  Use when you are all done with the prepared statement. 

```js
var prep = db.prepare('insert into names (first, last) values (?,?)');
for (var i=0;i<10;i++) {
	prep.execute(["Name", i]);
}
prep.finished();
```


### Transactions
#### DB.begin()
##### Parameters
* callback (Optional)
* RETURNS promise
This starts a new transactions, if you start a nested transaction, until you commit the first transaction nothing is written.

#### DB.commit()
##### Parameters
* callback (Optional)
* RETURNS promise
This commits a single transaction, if this is a nested transaction; the changes are not written until the first/final transaction is committed.

#### DB.commitAll()
##### Parameters
* callback (Optional)
* RETURNS promise
This commits the entire transaction group, everything is written and any open transactions are committed.

#### DB.rollback()
##### Parameters
* callback (Optional)
* RETURNS promise
This rolls back a single transaction, if this is a nested transaction; only the outermost nested transaction is rolled back.

#### DB.rollbackAll()
##### Parameters
* callback (Optional)
* RETURNS promise
This rolls back the entire transaction group; everything is cancelled.


## Tutorials

Need a little more to get started?  Check out these tutorials for using SQLite in a NativeScript Android and iOS application.

* [SQLite in a NativeScript Angular Application](https://www.thepolyglotdeveloper.com/2016/10/using-sqlite-in-a-nativescript-angular-2-mobile-app/)
* [SQLite in a NativeScript Vanilla Application](https://www.thepolyglotdeveloper.com/2016/04/use-sqlite-save-data-telerik-nativescript-app/)
* [SQLite in a NativeScript Vue Application](https://www.nativescript.org/blog/data-management-with-sqlite-and-vuex-in-a-nativescript-vue-app)

