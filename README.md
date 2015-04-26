# NativeScript sqlite

A NativeScript module providing sqlite actions for Android and (soon) iOS.

## Installation

Run `npm install nativescript-sqlite --save` from your project's inner `app` directory:

```
.
├── app
│   ├── app <------------------------------ run npm install from here
│   │   ├── app.css
│   │   ├── app.js
│   │   ├── bootstrap.js
│   │   ├── main-page.js
│   │   ├── main-page.xml
│   │   ├── node_modules
│   │   │   └── nativescript-sqlite <-- The install will place the module's code here
│   │   │       └── ...
│   │   └── package.json <----------------- The install will register “nativescript-sqlite” as a dependency here
│   └── tns_modules
│       └── ...
└── platforms
    ├── android
    └── ios
```

As is, using npm within NativeScript is still experimental, so it's possible that you'll run into some issues. A more complete solution is in the works, and you can check out [this issue](https://github.com/NativeScript/nativescript-cli/issues/362) for an update on its progress and to offer feedback.

If npm doesn't end up working for you, you can just copy and paste this repo's sqlite.android.js, and sqlite.ios.js files into your app and reference them directly.

## Usage

To use the sqlite module you must first `require()` it from your project's `node_modules` directory:

```js
var Sqlite = require( "./node_modules/nativescript-sqlite/sqlite" );
```

After you have a reference to the module you can then call the available methods.

### Callbacks
* All callbacks have the standard (Error, result) prototype

### CONSTANTS
* Sqlite.RESULTSASARRAY - Returns results as Arrays (ex: select name, phone --- results  [[name,phone]]) 
* Sqlite.RESULTSASOBJECT - Returns results as Objecs (ex: select name, phone --- results [{name: name, phone: phone}]
 
### Methods
#### new Sqlite(dbname, callback)
##### Parameters
* dbname: your database name.  
* (optional) callback (error, db): db is the fully OPEN database object that allows interacting with the db.
* RETURNS: promise of the DB object
 

```js
// my-page.js
var Sqlite = require( "/path/to/node_modules/nativescript-sqlite" );
var db_promise = new Sqlite("MyTable", function(err, open_db) {
    // This should ALWAYS be true, open_db object returned is open
    console.log("Are we open yet (Inside Callback)? ", db.isOpen() ? "Yes" : "No");
});

db_promise.then(function(db) {
      console.log("Are we open yet (outside)? ", db.isOpen() ? "Yes" : "No");
      db.close();
   }, function(err) {
     console.error("We failed to open database", err);
   });
```

#### Sqlite.isSqlite
##### Parameters
* obj
* Returns True or false if the obj passed to this function is a 


```js
// my-page.js
new Sqlite("test.db", function(err, db) {
  console.log("Is a Sqlite Database:", Sqlite.isSqlite(db) ? "Yes" : "No);
});
```

### DB Methods = Returned Database Object from Constructor
#### DB.version
##### Parameters
* Callback_OR_Version to set it to
If Callback Value will have the version.  On a new Database it will be Zero
If Version number, then the database will be changed to the version you passed to this function

```js
new Sqlite("test.db", function(err, db) {
  db.version(function(err, ver) {
    if (ver === 0) {
      db.execSQL("Create table....");
    }
  });
};
```

#### DB.isOpen
##### Parameters
* Is the current database open true/false


#### DB.resultType
##### Parameters
* Pass in Sqlite.RESULTASOBJECT or Sqlite.RESULTSASARRAY to change the result sets configuration

#### DB.close
Closes the database

#### DB.execSQL
##### Parameters
* SQL statment to run, can use ? for Parameters
* Params (Optional) - an array of Parameters
* Callback will either return null or the last id inserted or the record count of update/delete
This routine you can use for "update", "insert", "delete" and any other sqlite command where you are not expecting a value back.
If this is a Insert it will return the last row id of the new inserted record.  If it is a update/insert it will return the number of rows affected. 

#### DB.get
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the first row of the result set.


#### DB.all
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the all the rows of the result set.

#### DB.each
##### Parameters
* SQL Select statement, can use ? for parameters
* Params (Optional)
* Callback will be called for EACH row of the result set with the current row value
* Finished_Callback (Optional) will be called when it is complete with the number of rows handled.


