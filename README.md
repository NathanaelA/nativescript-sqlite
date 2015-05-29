# NativeScript sqlite

A NativeScript module providing sqlite actions for Android and iOS.

## License

This is released under the MIT License, meaning you are free to include this in any type of program -- However for entities that need a support and/or a commercial license please contact me (nathan@master-technology.com).

## Installation

Run `npm install nativescript-sqlite --save` from inside your project's `app` directory:

```
.
├── app <------------------------------ run npm install from inside here
│   ├── app.css
│   ├── app.js
│   ├── main-page.js
│   ├── main-page.xml
│   ├── node_modules
│   │   └── nativescript-sqlite <-- The install will place the module's code here
│   │       └── ...
│   ├── package.json <----------------- The install will register “nativescript-sqlite” as a dependency here
│   ├── App_Resources  
│   └── tns_modules
│       └── ...
├── lib
└── platforms
    ├── android
    └── ios
```

As is, using npm within NativeScript is still experimental, so it's possible that you'll run into some issues. A more complete solution is in the works, and you can check out [this issue](https://github.com/NativeScript/nativescript-cli/issues/362) for an update on its progress and to offer feedback.

If npm doesn't end up working for you, you can just copy and paste this repo's sqlite.android.js, and sqlite.ios.js files into your app and reference them directly.

## Extra Installation on IOS
* You will need to COPY or MOVE the module.modulemap from the /app/node_modules/nativescript-sqlite to the /platforms/ios/ folder
* You will need to Double-Click on the \<projname>.xcodeproj file in the /platforms/ios/ folder.
* Scroll to the bottom of the Targets \<ProjName > -> General window until you find the "Linked Frameworks and Libraries" section
* Click the **+** button, then type "sql" in the filter and double click on the "libsqlite3.dylib" to add it to your project.
* Save your project and exit XCode.

This should be only a one time thing.  Hopefully NativeScript in the future will have the plugins support added which will make this simpler.

## Usage

To use the sqlite module you must first `require()` it from your project's `node_modules` directory:

```js
var Sqlite = require( "./node_modules/nativescript-sqlite/sqlite" );
```

After you have a reference to the module you can then call the available methods.
The database defaults to returning result sets in arrays; i.e. [[field1, field2, ...], [field1, field2], [field1, field2] ...] you can change this to returning them in objects if you desire.


### Callbacks
* All callbacks have the standard (Error, result) prototype

### Constants
* Sqlite.RESULTSASARRAY - Returns results as Arrays (ex: select name, phone --- results  [[name,phone]]) 
* Sqlite.RESULTSASOBJECT - Returns results as Objects (ex: select name, phone --- results [{name: name, phone: phone}]
 
### Methods
#### new Sqlite(dbname, callback)
##### Parameters
* dbname: your database name.   This can be ":memory:" for a memory Database. This can be "" for a Temporary Database.
* (optional) callback (error, db): db is the fully OPEN database object that allows interacting with the db.
* RETURNS: promise of the DB object
 
 You do not have to use BOTH the promise and callback; you can use whichever you are most comfortable with -- however, as with this example, you CAN use both if you want.

```js
// my-page.js
var Sqlite = require( "/path/to/node_modules/nativescript-sqlite" );
var db_promise = new Sqlite("MyTable", function(err, db) {
    if (err) { 
      console.error("We failed to open database", err);
    } else 
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

#### Sqlite.isSqlite
##### Parameters
* obj
* Returns True or False if the obj passed to this function is a sqlite database

```js
// my-page.js
new Sqlite("test.db", function(err, db) {
  console.log("Is a Sqlite Database:", Sqlite.isSqlite(db) ? "Yes" : "No);  // Should print "Yes"
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
      db.version(1); // Sets the version to 1
    }
  });
};
```

#### DB.isOpen
* Is the current database open true/false


#### DB.resultType
##### Parameters
* Pass in Sqlite.RESULTASOBJECT or Sqlite.RESULTSASARRAY to change the result sets configuration
This will set the database to return the results in which ever choice you make.  (Default is RESULTSASARRAY)

#### DB.close
* Closes the database
NOTE: Any DB calls after this will throw errors. 

#### DB.execSQL
##### Parameters
* SQL statement to run, can use ? for Parameters
* Params (Optional) - an array of Parameters
* Callback will either return null or the last id inserted or the record count of update/delete
This routine you can use for "update", "insert", "delete" and any other sqlite command where you are not expecting a result set back.
If this is a Insert it will return the last row id of the new inserted record.  If it is a update/insert it will return the number of rows affected. 

```js
// new SQLite(....
db.execSQL("insert into Hello (word) values (?)", ["Hi"], function(err, id) {
  console.log("The new record id is:", id);
});
```


#### DB.get
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the first row of the result set.

```js
// new SQLite(...
db.get('select * from Hello where id=?', [1], function(err, row) {
  console.log("Row of data was: ", row);  // Prints [["Field1", "Field2",...]]
});
```


#### DB.all
##### Parameters
* SQL SELECT statement, can use ? for parameters
* Params (Optional)
* Callback will have the all the rows of the result set.

```js
// new SQLite(...
db.all('select * from Hello where id > ? and id < ?', [1,100], function(err, resultSet) {
  console.log("Result set is:", resultSet); // Prints [["Row_1 Field_1" "Row_1 Field_2",...], ["Row 2"...], ...]
});
```


#### DB.each
##### Parameters
* SQL Select statement, can use ? for parameters
* Params (Optional)
* Callback will be called for EACH row of the result set with the current row value
* Finished_Callback (Optional) will be called when it is complete with the number of rows handled.


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
