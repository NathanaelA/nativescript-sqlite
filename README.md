# NativeScript sqlite

A NativeScript module providing sqlite actions for Android and iOS.

## License

This is released under the MIT License, meaning you are free to include this in any type of program -- However for entities that need a support contract, changes, enhancements and/or a commercial license please contact me (nathan@master-technology.com).


## Installation 
  
First run `tns --version`

### v1.1.3 or later

Run `tns plugin add nativescript-sqlite` in your ROOT directory of your project.

### v1.1.2 and earlier

Please upgrade to v1.1.3 or later  -- This makes life a lot easier as you can now use the plugin interface properly.
v1.1.2 has plugin interface but in all my tests it is broken.   You can use NPM to upgrade to the latest version by doing a `npm install nativescript -g`.
 
## Extra Installation on IOS

* You will need to COPY or MOVE the module.modulemap from the /node_modules/nativescript-sqlite to the /platforms/ios/ folder
* You will need to Double-Click on the \<projname>.xcodeproj file in the /platforms/ios/ folder.
* Scroll to the bottom of the Targets \<ProjName > -> General window until you find the "Linked Frameworks and Libraries" section
* Click the **+** button, then type "sql" in the filter and double click on the "libsqlite3.dylib" to add it to your project.
* Save your project and exit XCode.

This should only be needed this first time and anytime you install new runtimes as the project file gets replaced.  Hopefully NativeScript in the future will have the plugins support added which will make this automatic.

## Known Issues

* On IOS the Sqlite.copyDatabase(dbName) crashes the application after copying the file.  This is a bug in the NativeScript-IOS runtimes: 0.9.0 - 1.1.2 -- This has been fixed in version 1.2.0.

## Usage

To use the sqlite module you must first `require()` it:

```js
var Sqlite = require( "nativescript-sqlite" );
```

After you have a reference to the module you can then call the available methods.
The database defaults to returning result sets in arrays; i.e. [[field1, field2, ...], [field1, field2], [field1, field2] ...] you can change this to returning them in objects if you desire.

## Shipping Database

If you are planning on shipping a database with the application; drop the file in your /Root/App folder.  The Sqlite.copyDatabase("database_name") will copy the database from that folder to the proper database folder on your platform. 


### Callbacks
* All callbacks have the standard (Error, result) prototype
* USE CALLBACKS or PROMISES; it is not recommended to use both

### Promises
* Will either call your *reject* with the error or the *resolve* with the answer 
* USE CALLBACKS or PROMISES; it is not recommended to use both

### Constants
* Sqlite.RESULTSASARRAY - Returns results as Arrays (ex: select name, phone --- results  [[name,phone]]) 
* Sqlite.RESULTSASOBJECT - Returns results as Objects (ex: select name, phone --- results [{name: name, phone: phone}]
 
### Methods
#### new Sqlite(dbname, options, callback)
##### Parameters
* dbname: your database name.   This can be ":memory:" for a memory Database. This can be "" for a Temporary Database.
* options - currently the only option is "readOnly", which if set to true will make the db read only when it opens it
* (optional) callback (error, db): db is the fully OPEN database object that allows interacting with the db.
* RETURNS: promise of the DB object
 
 You should choose either to use a promise or a callback; you can use whichever you are most comfortable with -- however, as with this example, you CAN use both if you want; but side effects might occur.

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
* object to check
* RETURNS: Boolean, True or False if the object passed to this function is a sqlite database

```js
// my-page.js
new Sqlite("test.db", function(err, db) {
  console.log("Is a Sqlite Database:", Sqlite.isSqlite(db) ? "Yes" : "No);  // Should print "Yes"
});
```

#### Sqlite.exists   
##### Parameters
* database name
* RETURNS: Boolean, True if the database exists in the App/OS Database folder


#### Sqlite.deleteDatabase
* database name to delete in the App/OS Database folder
* RETURNS: Nothing


#### Sqlite.copyDatabase 
* database name to copy from your app folder to the proper database folder on the OS
* RETURNS: True if copy was successful
* NOTES: This will only copy the file if it does not already exist at the destination.

```js
// If we are in Debug Code, we always delete the database first so that the latest copy of the database is used... 
if (DEBUGMODE && Sqlite.exists("mydatabase.sqlite")) {
  Sqlite.deleteDatabase("mydatabase.sqlite"));
}
if (!Sqlite.exists("mydatabase.sqlite")) {
  Sqlite.copyDatabase("mydatabase.sqlite");
}
```

### DB Methods = Returned Database Object from Constructor
#### DB.version
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
};
```

#### DB.isOpen
* RETURNS: Boolean, Is the current database open true/false


#### DB.resultType
##### Parameters
* Pass in Sqlite.RESULTASOBJECT or Sqlite.RESULTSASARRAY to change the result sets configuration
This will set the database to return the results in which ever choice you make.  (Default is RESULTSASARRAY)


#### DB.close
* Closes the database
* RETURNS: Promise
NOTE: Any DB calls after this will throw errors. 


#### DB.execSQL
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


#### DB.get
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



#### DB.all
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



#### DB.each
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

