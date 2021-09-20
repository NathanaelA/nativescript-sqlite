/**************************************************************************************
 * (c) 2015-2021, Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 *************************************************************************************/

const sqlite = require('nativescript-sqlite');
const ObservableArray = require("@nativescript/core/data/observable-array").ObservableArray;
const FileSystemAccess = require("@nativescript/core/file-system/file-system-access").FileSystemAccess;


//var Tracing = require('./tracing.js');
//Tracing(sqlite, {ignore: ["close", "resultType", "valueType", "_toStringArray", "_getResultEngine"], disableAddedFunction: true});

let dbname = 'name_db.sqlite';
let db = null;
let page = null;

const data = new ObservableArray();

console.log("NativeScript Runtime Version", global.__runtimeVersion);

if (sqlite.HAS_COMMERCIAL) {
  console.log("Using Commercial");
  data.push({name:'Commercial Support', css:'one'});
} else {
  console.log("No Commercial Support");
}

if (sqlite.HAS_ENCRYPTION) {
  console.log("Using Encryption");
  dbname = 'encrypted.sqlite';
  data.push({name:'Encryption Support', css:'one'});
} else {
  console.log("No Encryption");
}
data.push({name: 'Loading...', css: 'one'});


if (sqlite.HAS_SYNC) {
  console.log("Using Sync");
  data.push({name: 'Sync Support',css: 'one'});
} else {
  console.log("No Sync");
}


exports.pageLoaded = async function (args) {
  page = args.object;
  page.bindingContext = {names: data};
  console.log("Using Database:", dbname);

  if (!sqlite.exists(dbname)) {
    sqlite.copyDatabase(dbname);
  }
  try {
    let myDb = await sqlite(dbname, {key: 'testing', multithreading: false, /*!!sqlite.HAS_COMMERCIAL ,*/ migrate: true},
    );

    let b = function (err, dbConnection) {
      if (err) {
        console.log(err, err.stack);
      }
      db = dbConnection;
      db.resultType(sqlite.RESULTSASOBJECT);

      db.version().then(function (results) {
        console.log("User Version: ", results, typeof results, Number.isNumber(results)); //, String.isString(results));
      });

      if (sqlite.HAS_ENCRYPTION) {
        db.get("PRAGMA cipher_version;").then(function (results) {
          console.log("Cipher version", results['cipher_version']);
        });
      }

      reloadData();
    };
    b(null, myDb);
  } catch(err) {
    console.log("sqlite error", err, err.stack);
  }
};

exports.addNewName = function() {
  const entry = page.getViewById('entry');
  const name = entry.text;
  if (name.length > 0) {
    if (name.toLowerCase() === "test" || name.toLowerCase() === "runtest" || name.toLowerCase() === "tests" || name.toLowerCase() === "runtests" || name.indexOf("Test") === 0) {
      runTests();
      return;
    }

    if (name.toLowerCase() === "sync") {
      db.enableTracking("names", {'syncTime': 10}).then((res) => {
        console.log("Result", res);
      }).catch((err) => {
        console.log("Error",err, err.stack);
      });
      return;
    }

    if (name.toLowerCase() === "fsync") {
      db.enableTracking("names", {force: true, syncTime: 10}).then((res) => {
        console.log("Result", res);
      }).catch((err) => {
        console.log("Error",err, err.stack);
      });
      return;
    }

    if (name.toLowerCase() === "csync") {
      db.execSQL("update __mt_sync_tracking set completed=1");
      return;
    }


    if (name.toLowerCase() === "dsync") {
      db.execSQL("delete from __mt_sync_tracking");
      return;
    }

    if (name.toLowerCase() === 'tsync') {
      db.all("select * from __mt_sync_tracking").then((res) => {
        console.log("Results:", res);
      });
      return;
    }


    db.execSQL("insert into names (name) values (?)", name);
    reloadData();
  }
  entry.text = '';
};

exports.openMT = function() {
  const utils = require('@nativescript/core/utils/utils');
  utils.openUrl("https://www.master-technology.com");
};

function reloadData() {
  db.resultType(sqlite.RESULTSASOBJECT);
  db.valueType(sqlite.VALUESARENATIVE);

  db.all('select name from names', function (err, loadedData) {
    data.length = 0;
    if (err) {
      console.log(err);
    } else {
      for (let i=0;i<loadedData.length;i++) {
        if (i % 2 === 0) {
          loadedData[i].css = "one";
        } else {
          loadedData[i].css = "two";
        }
        data.push(loadedData[i]);
      }
    }
  });
}

// So we only keep one copy in memory; we cache this...
let blob;
function loadBlob() {
  if (blob != null) { return; }
  let fsa = new FileSystemAccess();
  blob = fsa.readSync(fsa.getCurrentAppPath()+"/icon.sqlite", (err) => {
    console.error("Error", err);
  });
}


async function setupTests() {
  loadBlob();
  data.push({name: 'Creating tables and data...', css: 'one'});
  try {
    await db.execSQL('drop table if exists tests;');
    await db.execSQL('create table tests (`int_field` integer, `num_field` numeric, `real_field` real, `text_field` text, `blob_field` blob)');
    await db.execSQL('insert into tests (int_field, num_field, real_field, text_field, blob_field) values (1,1.2,2.4,"Text1",?)',[blob]);
    await db.execSQL('insert into tests (int_field, num_field, real_field, text_field, blob_field) values (2,4.8,5.6,"Text2",?)',[blob]);
    await db.execSQL('insert into tests (int_field, num_field, real_field, text_field, blob_field) values (3,null,null,null,null)');
  } catch (err) {
    console.log("Error", err);
    data.push({name: 'Error setting up tests...'+err.toString(), css: 'two'});
    throw err;
  }
}

function checkRowOfData(inData, validData) {
  if (Array.isArray(inData)) {
    for (let i = 0; i < inData.length; i++) {
      if (typeof inData[i] === "number") {
        if (inData[i] !== validData[i]) {
          if ((inData[i] - 0.1) > validData[i] || (inData[i] + 0.1) < validData[i]) {
            console.log("Failed", inData[i], validData[i])
            return ({status: false, field: i});
          }
        }
      } else {
        if (inData[i] !== validData[i]) {
          // console.log("Check:", inData[i], validData[i], typeof inData[i], typeof validData[i]);
          if (inData[i] === null || validData[i] === null) {
             return ({status: false, field: i});
          }
          // Do we have a ".count" property, if so check it
          if (inData[i].count > 0 && inData[i].count === validData[i].count) {
            for (let j = 0; j < inData[i].count; j++) {
              if (inData[i][j] !== validData[i][j]) {
                return ({status: false, field: i});
              }
            }
            return ({status: true});
          }
          // Do we have a ".length" property, if so check it
          else if (inData[i].length > 0 && inData[i].length === validData[i].length) {
            for (let j = 0; j < inData[i].length; j++) {
              if (inData[i][j] !== validData[i][j]) {
                return ({status: false, field: i});
              }
            }
            return ({status: true});
          } else {
            console.log("Failed:", inData[i].length, validData[i].length, typeof inData[i], typeof validData[i]);
            return ({status: false, field: i});
          }
        }
      }
    }
  } else if (typeof inData === 'number') {
    if (inData !== validData) {
      if ((inData - 0.1) > validData || (inData + 0.1) < validData) {
        return ({status: false, field: 0});
      }
    }
  } else {
    for (let key in inData) {
      if (inData.hasOwnProperty(key)) {
        if (typeof inData[key] === "number") {
          if (inData[key] !== validData[key]) {
            if ((inData[key]-0.1) > validData[key] || (inData[key]+0.1) < validData[key]) {
              return ({status: false, field: key});
            }
          }
        } else {
          if (inData[key] !== validData[key]) {
            if (inData[key] === null || validData[key] === null) {
              return ({status: false, field: key});
            }
            // Do we have a ".count" property, if so check it
            if (inData[key].count > 0 && inData[key].count === validData[key].count) {
              for (let j = 0; j < inData[key].count; j++) {
                if (inData[key][j] !== validData[key][j]) {
                  return ({status: false, field: key});
                }
              }
              return ({status: true});
            }
            // Do we have a ".length" property, if so check it
            else if (inData[key].length > 0 && inData[key].length === validData[key].length) {
              for (let j = 0; j < inData[key].length; j++) {
                if (inData[key][j] !== validData[key][j]) {
                  return ({status: false, field: key});
                }
              }
              return ({status: true});
            } else {
              return ({status: false, field: key});
            }
          }
        }
      }
    }
  }
  return {status: true};
}

function runATest(options, callback) {

  //console.log("!--------------  Starting Test", options.name);

  //data.push({name: "Starting test"+options.name});
  const checkResults = function(err, inData) {
    //console.log("!--------------  Checking Results", options.name, "Error: ", err, "Data:", inData);
    let passed = true;
    if (err) {
      console.log("!------------ Error", err.toString());
      data.push({name: options.name + " test failed with: ", css: 'one'});
      data.push({name: "  " + err.toString(), css:'one'});
      return callback(false);
    }
    if (!inData || inData.length !== options.results.length) {
      console.dir(inData);
      console.log("!----------- No Data");
      data.push({name: options.name + " test failed with different results length", css: 'one'});
      return callback(false);
    }
    if (inData.length === 0) {
      console.log("!-------- No Data Returned");
      return callback(passed);
    }
//    console.log("!------------ Data Returned", inData.length, inData);
    for (let i=0;i<inData.length;i++) {
      let result;
      try {
         result = checkRowOfData(inData[i], options.results[i]);
      } catch (err) {
        console.log(err);
        result = { status: false, field: err};
      }
      if (!result.status) {
        passed = false;
        data.push({name: options.name + " test failed on row: "+i+", field: "+result.field, css: 'one'});
        console.log("$$$$$ Failure:", inData[i], options.results[i], typeof inData[i][result.field], typeof options.results[i][result.field]);
        console.log(options.name,"test failed on row: ",i,", field: ",result.field);
        break;
      }
    }
    callback(passed);
  };

  let checkRow = 0;
  let checksPassed = true;
  const checkEachResults = function(err, inData) {
    if (!checksPassed) return;
    if (err) {
      data.push({name: options.name + " test failed with "+err.toString(), css: 'one'});
      console.log(options.name + " test failed with ",err.toString());
      checksPassed = false;
      return;
    }
    const result = checkRowOfData(inData, options.results[checkRow]);
    if (!result.status) {
      checksPassed = false;
      data.push({name: options.name + " test failed on row: "+checkRow+", field: "+result.field, css: 'one'});
      console.log("$$$$ Failure: ", inData, options.results[checkRow], typeof inData[result.field], typeof options.results[checkRow][result.field]);
    }
    checkRow++;
  };

  const checkFinalResults = function() {
    callback(checksPassed);
  };

  const promiseResults = function(res) {
    checkResults(null, res);
  };
  const promiseFailed = function(err) {
    checkResults(err);
  };

  if (options.values) {
    switch (options.use) {
      case 0:
        db.get(options.sql, options.values, checkResults);
        break;
      case 1:
        db.all(options.sql, options.values, checkResults);
        break;
      case 2:
        db.each(options.sql, options.values, checkEachResults, checkFinalResults);
        break;

      case 3:
        db.get(options.sql, options.values).then(promiseResults).catch(promiseFailed);
        break;
      case 4:
        db.all(options.sql, options.values).then(promiseResults).catch(promiseFailed);
        break;
      case 5:
        db.each(options.sql, options.values, checkEachResults).then(checkFinalResults).catch(promiseFailed);
        break;

      case 6:
        db.execSQL(options.sql, options.params, checkResults);
        break;

      case 7:
        db.execSQL(options.sql, options.params).then(promiseResults).catch(promiseFailed);
        break;

      default:
        callback(false);
    }
  } else {
    switch (options.use) {
      case 0:
        db.get(options.sql, checkResults);
        break;
      case 1:
        db.all(options.sql, checkResults);
        break;
      case 2:
        db.each(options.sql, checkEachResults, checkFinalResults);
        break;

      case 3:
        db.get(options.sql).then(promiseResults).catch(promiseFailed);
        break;
      case 4:
        db.all(options.sql).then(promiseResults).catch(promiseFailed);
        break;
      case 5:
        db.each(options.sql, checkEachResults).then(checkFinalResults).catch(promiseFailed);
        break;

      case 6:
        db.execSQL(options.sql, checkResults);
        break;

      case 7:
        db.execSQL(options.sql).then(promiseResults).catch(promiseFailed);
        break;


      default:
        callback(false);
    }
  }
}

async function runTestGroup(tests) {
  return new Promise((resolve, reject)  => {
    let runningTest = -1;
    const runTest = function (status) {
      if (!status) {
        return reject("Failed: " + tests[runningTest].name);
      } else if (runningTest > -1) {
        data.push({name: "Passed: " + tests[runningTest].name, 'css': 'two'});
      }
      runningTest++;
      if (runningTest >= tests.length) {
        return resolve(status);
      }
      try {
        runATest(tests[runningTest], runTest);
      } catch(err) {
        console.error("Failed Test", tests[runningTest].name)
        return reject(err);
      }
    };

    data.push({name: "-----------------------------", css: 'two'});
    runTest(true);
  });
}

async function runNativeArrayTest() {
  console.log("!--------------  Starting RNA Test");
  db.resultType(sqlite.RESULTSASARRAY);
  db.valueType(sqlite.VALUESARENATIVE);

  const tests = [
    // Callback
    {name: 'NativeArray Check', sql: 'select count(*) from tests', results: [3], use: 0},
    {name: 'NativeArray Get', sql: 'select * from tests where int_field=?', values: [2], results: [2,4.8,5.6,'Text2', blob], use: 0},
    {name: 'NativeArray All',    sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1",blob],[2,4.8,5.6,'Text2',blob],[3,null,null,null,null]], use: 1},
    {name: 'NativeArray Each', sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1",blob],[2,4.8,5.6,'Text2',blob],[3,null,null,null,null]], use: 2},

    // Promise
    {name: 'NativeArray Promise Check', sql: 'select count(*) from tests', results: [3], use: 3},
    {name: 'NativeArray Promise Get', sql: 'select * from tests where int_field=?', values: [2], results: [2,4.8,5.6,'Text2',blob], use: 3},
    {name: 'NativeArray Promise All',    sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1",blob],[2,4.8,5.6,'Text2',blob],[3,null,null,null,null]], use: 4},
    {name: 'NativeArray Promise Each', sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1",blob],[2,4.8,5.6,'Text2',blob],[3,null,null,null,null]], use: 5}

  ];
  await runTestGroup(tests);
}

async function runStringArrayTest() {
  console.log("!--------------  Starting RSA Test");
  db.resultType(sqlite.RESULTSASARRAY);
  db.valueType(sqlite.VALUESARESTRINGS);
  const tests = [
    // Callback Version
    {name: 'StringArray Get', sql: 'select * from tests where int_field=?', values: [2], results: ["2","4.8","5.6",'Text2',blob], use: 0},
    {name: 'StringArray All', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1",blob],["2","4.8","5.6",'Text2',blob], ["3",null,null,null,null]], use: 1},
    {name: 'StringArray Each', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1",blob],["2","4.8","5.6",'Text2',blob], ["3",null,null,null,null]], use: 2},

    // Promise Version
    {name: 'StringArray Promise Get', sql: 'select * from tests where int_field=?', values: [2], results: ["2","4.8","5.6",'Text2',blob], use: 3},
    {name: 'StringArray Promise All', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1",blob],["2","4.8","5.6",'Text2',blob],["3",null,null,null,null]], use: 4},
    {name: 'StringArray Promise Each', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1",blob],["2","4.8","5.6",'Text2',blob],["3",null,null,null,null]], use: 5}
  ];
  await runTestGroup(tests);
}

async function runNativeObjectTest() {
  console.log("!--------------  Starting RNO Test");
  db.resultType(sqlite.RESULTSASOBJECT);
  db.valueType(sqlite.VALUESARENATIVE);

  const tests = [
    // Callback
    {name: 'NativeObject Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob}, use: 0},
    {name: 'NativeObject All', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1', blob_field: blob},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 1},
    {name: 'NativeObject Each', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1', blob_field: blob},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 2},

    // Promise
    {name: 'NativeObject Promise Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob}, use: 3},
    {name: 'NativeObject Promise All', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1', blob_field: blob},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 4},
    {name: 'NativeObject Promise Each', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1', blob_field: blob},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 5}

  ];
  await runTestGroup(tests);
}

async function runStringObjectTest() {
  console.log("!--------------  Starting RSO Test");
  db.resultType(sqlite.RESULTSASOBJECT);
  db.valueType(sqlite.VALUESARENATIVE);

  const tests = [
    // Callback
    {name: 'StringObject Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob}, use: 0},
    {name: 'StringObject All', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1', blob_field: blob},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 1},
    {name: 'StringObject Each', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1', blob_field: blob},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 2},

    // Promise
    {name: 'StringObject Promise Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob}, use: 3},
    {name: 'StringObject Promise All', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1', blob_field: blob},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 4},
    {name: 'StringObject Promise Each', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1', blob_field: blob},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2', blob_field: blob},{int_field: 3, num_field: null, real_field: null, text_field: null, blob_field: null}], use: 5}

  ];
  await runTestGroup(tests);
}

async function setupPreparedTests() {
  if (!sqlite.HAS_COMMERCIAL) {
    return;
  }

  console.log("!--------------  Creating Prepared Tests Data");
  try {
    await db.execSQL('drop table if exists preparetests;');
    await db.execSQL('create table preparetests (`int_field` integer, `num_field` numeric, `real_field` real, `text_field` text, `blob_field` blob)');
  } catch (err) {
    data.push({name: 'Failed to create tables and data...', css: 'one'});
    console.log("!---- Create Table err", err);
    throw err;
  }
}

async function runExtraTests() {
  console.log("!--------------  Extra Tests");
  data.push({name: "-----------------------------", css: 'two'});
  db.resultType(sqlite.RESULTSASOBJECT);
  db.valueType(sqlite.VALUESARENATIVE);

  try {
    await db.execSQL('drop table if exists extratests;');
    await db.execSQL('create table extratests (`int_field` integer, `num_field` numeric, `real_field` real, `text_field` text, `blob_field` blob, `int2field` integer)');
    await db.execSQL('insert into extratests values (1, 2, 3, "4", "5", 6)');
    let val = await db.get('select * from extratests');
    if (!(val.int_field === 1 && val.num_field === 2 && val.int2field === 6)) {
      throw new Error("ExtraTest data does not match");
    }

    await db.execSQL("update extratests set num_field=null where int_field=1");
    val = await db.get('select * from extratests');
    if (val.int_field !== 1 || val.num_field !== null) {
      throw new Error("Failed ExtraTest direct null");
    }

    await db.execSQL("update extratests set int2field=null where int_field=1");
    val = await db.get('select * from extratests');
    if (val.int_field !== 1 || val.int2field !== null) {
      throw new Error("Failed ExtraTest int is null");
    }

    await db.execSQL("update extratests set real_field=? where int_field=1", [null]);
    val = await db.get('select * from extratests');
    if (val.int_field !== 1 || val.real_field !== null) {
      throw new Error("Failed ExtraTest param as null")
    }
  } catch (err) {
    console.log("Failed: Extra Tests", err)
    data.push({name: 'Failed: Extra Tests...'+err, 'css': 'one'});
    throw err;
  }
  data.push({name: 'Passed: Extra Tests...', 'css': 'two'});
}

async function runPreparedTests(callback) {
  if (!sqlite.HAS_COMMERCIAL) {
    return;
  }
  db.resultType(sqlite.RESULTSASARRAY);
  db.valueType(sqlite.VALUESARENATIVE);

  try {
    // Test to make sure Rollbacks work
    await setupPreparedTests();
    await createPreparedData(true);
    let tests = [{
      name: 'Verify Rollback Check',
      sql: 'select count(*) from preparetests',
      results: [0],
      use: 0
    }];
    await runTestGroup(tests);


    // Test to make sure Commits work
    await createPreparedData(false);
    tests = [{
      name: 'Verify Commit Check',
      sql: 'select count(*) from preparetests',
      results: [3],
      use: 0
    },
      {
        name: 'Commit/Prepare All', sql: 'select * from preparetests order by int_field', results: [
          [1, 1.2, 2.4, 'Text1', blob],
          [2, 2.4, 3.6, 'Text2', blob],
          [3, 3.6, 4.8, 'Text3', blob]
        ], use: 1
      }];
    await runTestGroup(tests);
  } catch (err) {
    data.push({name: 'Failed: Prepared Tests...', 'css': 'one'});
    throw err;
  }
  data.push({name: 'Passed: Prepared Tests...', 'css': 'two'});

}

async function createPreparedData(rollback) {
  if (!sqlite.HAS_COMMERCIAL) {
    return;
  }

  let prepared;
  try {
    console.log("!------------------ Create Prepared Tests");
    prepared = db.prepare("insert into preparetests (int_field, num_field, real_field, text_field, blob_field) values (?,?,?,?,?);");
  } catch(err) {
    console.log("Error creating prepare data", err);
    throw err;
  }

  try {
    await db.begin();
    await prepared.execute([1, 1.2, 2.4, "Text1", blob]);
    await prepared.execute([[2, 2.4, 3.6, "Text2", blob], [3, 3.6, 4.8, "Text3", blob]]);
    if (rollback) {
      await db.rollback();
    } else {
      await db.commit();
    }
    prepared.finished();
  } catch (err) {
    data.push({name: 'Failed Prepared Tests...', css: 'one'});
    console.log(err);
    throw err;
  }
}

async function delay(time) {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(); }, time);
  });
}

async function runTests() {
  data.length = 0;
  data.push({name: 'Running SQLite tests...', css: 'one'});

  try {
    await setupTests();
    await delay(10);
    data.push({name: 'Created tables & data...', css: 'one'});
//    for (let i=0;i<20;i++) {
//      data.length = 0;
    await runNativeArrayTest();
    await delay(10);
    await runNativeObjectTest();
    await delay(10);
    await runStringArrayTest();
    await delay(10);
    await runStringObjectTest();
    await delay(10);
//    }
    await runPreparedTests();
    await delay(10);
    await runExtraTests();
    data.push({name: "-----------------------------", css: 'two'});
    data.push({name: 'Tests completed...', css: 'two'});
  } catch (err) {
    data.push({name: "-----------------------------", css: 'two'});
    data.push({name: 'Tests failed...', css: 'one'});
    data.push({name: err, css: 'one'});
  }
  console.log("-----------------------------");
  console.log("Tests completed!");
}

