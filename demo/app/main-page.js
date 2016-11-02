var sqlite = require('nativescript-sqlite');
var ObservableArray = require("data/observable-array").ObservableArray;


// var Tracing = require('./tracing.js');
// Tracing(sqlite, {ignore: ["close", "resultType", "valueType", "_toStringArray", "_getResultEngine"], disableAddedFunction: true});


var dbname = 'name_db.sqlite';
var db = null;
var page = null;

var data = new ObservableArray();
data.push({name: 'Loading...'});

exports.pageLoaded = function(args) {
    page = args.object;
    page.bindingContext = {names: data};

    if (!sqlite.exists(dbname)) {
        sqlite.copyDatabase(dbname);
    }
    new sqlite(dbname, function(err, dbConnection) {
	if (err) {
	    console.log(err);
	}
        db = dbConnection;
        db.resultType(sqlite.RESULTSASOBJECT);
        reloadData();
    });
};

exports.addNewName = function() {
    var entry = page.getViewById('entry');
    var name = entry.text;
    if (name.length > 0) {
        if (name.toLowerCase() === "test" || name.toLowerCase() === "runtest" || name.toLowerCase() === "tests" || name.toLowerCase() === "runtests") {
            runTests();
            return;
        }
        db.execSQL("insert into names (name) values (?)", name);
        reloadData();
    }
	entry.text = '';
};

function reloadData() {
    db.resultType(sqlite.RESULTSASOBJECT);
    db.valueType(sqlite.VALUESARENATIVE);

    db.all('select name from names', function (err, loadedData) {
        data.length = 0;
        if (err) {
            console.log(err);
        } else {
            for (var i=0;i<loadedData.length;i++) {
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

function setupTests(callback) {
    data.push({name: 'Creating tables and data...'});
    db.execSQL('drop table if exists tests;', function(err) {
        if (err) { console.log("!---- Drop Err", err); }
        db.execSQL('create table tests (`int_field` integer, `num_field` numeric, `real_field` real, `text_field` text)', function(err) {
            if (err) {
                data.push({name: 'Failed to create tables and data...'});
                console.log("!---- Create Table err", err);
                return;
            }
            db.execSQL('insert into tests (int_field, num_field, real_field, text_field) values (1,1.2,2.4,"Text1")', function (err) {
                if (err) {
                    data.push({name: 'Failed to create tables and data...'});
                    console.log("!---- Insert err", err);
                    return;
                }
                db.execSQL('insert into tests (int_field, num_field, real_field, text_field) values (2,4.8,5.6,"Text2")', callback);
            });
        });
    });
}

function checkRowOfData(inData, validData) {
    if (Array.isArray(inData)) {
        for (var i = 0; i < inData.length; i++) {
            if (typeof inData[i] === "number") {
                if (inData[i] !== validData[i]) {
                    if (inData[i]-0.1 > validData[i] || inData[i]+0.1 < validData[i]) {
                        return ({status: false, field: i});
                    }
                }
            } else {
                if (inData[i] !== validData[i]) {
                    return ({status: false, field: i});
                }
            }
        }
    } else {
        for (var key in inData) {
            if (inData.hasOwnProperty(key)) {
                if (typeof inData[key] === "number") {
                    if (inData[key] !== validData[key]) {
                        if (inData[key]-0.1 > validData[key] || inData[key]+0.1 < validData[key]) {
                            return ({status: false, field: key});
                        }
                    }
                } else {
                    if (inData[key] !== validData[key]) {
                        return ({status: false, field: key});
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
    var checkResults = function(err, inData) {
        //console.log("!--------------  Checking Results", options.name, "Error: ", err, "Data:", inData);
        var passed = true;
        if (err) {
           console.log("!------------ Error");
           data.push({name: options.name + " test failed with "+err.toString()});
           return callback(false);
        }
        if (!inData || inData.length !== options.results.length) {
            console.log("!----------- No Data");
            data.push({name: options.name + " test failed with different results length"});
            return callback(false);
        }
        if (inData.length === 0) {
            console.log("!-------- No Data Returned");
            return callback(passed);
        }
        //console.log("!------------ Data Returned", inData.length, inData);
        for (var i=0;i<inData.length;i++) {
            var result = checkRowOfData(inData[i], options.results[i]);
            if (!result.status) {
                passed = false;
                data.push({name: options.name + " test failed on row: "+i+", field: "+result.field});
                console.log("$$$$$ Failure: ", inData[i], options.results[i], typeof inData[i][result.field], typeof options.results[i][result.field]);
                break;
            }
        }
        callback(passed);
    };

    var checkRow = 0;
    var checksPassed = true;
    var checkEachResults = function(err, inData) {
        if (!checksPassed) return;
        if (err) {
            data.push({name: options.name + " test failed with "+err.toString()});
            checksPassed = false;
            return;
        }
        var result = checkRowOfData(inData, options.results[checkRow]);
        if (!result.status) {
            checksPassed = false;
            data.push({name: options.name + " test failed on row: "+checkRow+", field: "+result.field});
            console.log("$$$$$ Failure: ", inData, options.results[checkRow], typeof inData[result.field], typeof options.results[checkRow][result.field]);
        }
        checkRow++;
    };

    var checkFinalResults = function() {
        callback(checksPassed);
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
            default:
                callback(false);
        }
    }
}

function runTestGroup(tests, callback) {
    var runningTest = -1;
    var runTest = function(status) {
        if (!status) {
            return callback(false);
        } else if (runningTest > -1) {
            data.push({name: "Passed: " + tests[runningTest].name});
        }
        runningTest++;
        if (runningTest >= tests.length) {
            return callback(status);
        }
        runATest(tests[runningTest], runTest);
    };

    data.push({name: "-----------------------------"});
    runTest(true);
}

function runNativeArrayTest(callback) {
    console.log("!--------------  Starting RNA Test");
    db.resultType(sqlite.RESULTSASARRAY);
    db.valueType(sqlite.VALUESARENATIVE);

    var tests = [
        {name: 'NativeArray Check', sql: 'select count(*) from tests', results: [2], use: 0},
        {name: 'NativeArray Get', sql: 'select * from tests where int_field=?', values: [2], results: [2,4.8,5.6,'Text2'], use: 0},
        {name: 'NativeArray All',    sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1"],[2,4.8,5.6,'Text2']], use: 1},
        {name: 'NativeArray Each', sql: 'select * from tests order by int_field', results: [[1,1.2,2.4,"Text1"],[2,4.8,5.6,'Text2']], use: 2}
    ];
    runTestGroup(tests, callback);
}

function runStringArrayTest(callback) {
    console.log("!--------------  Starting RSA Test");
    db.resultType(sqlite.RESULTSASARRAY);
    db.valueType(sqlite.VALUESARESTRINGS);
    var tests = [
        {name: 'StringArray Get', sql: 'select * from tests where int_field=?', values: [2], results: ["2","4.8","5.6",'Text2'], use: 0},
        {name: 'StringArray All', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1"],["2","4.8","5.6",'Text2']], use: 1},
        {name: 'StringArray Each', sql: 'select * from tests order by int_field', results: [["1","1.2","2.4","Text1"],["2","4.8","5.6",'Text2']], use: 2}
    ];
    runTestGroup(tests, callback);
}

function runNativeObjectTest(callback) {
    console.log("!--------------  Starting RNO Test");
    db.resultType(sqlite.RESULTSASOBJECT);
    db.valueType(sqlite.VALUESARENATIVE);

    var tests = [
        {name: 'NativeObject Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2'}, use: 0},
        {name: 'NativeObject All', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1'},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2'}], use: 1},
        {name: 'NativeObject Each', sql: 'select * from tests order by int_field', results: [{int_field: 1, num_field: 1.2, real_field: 2.4, text_field: 'Text1'},{int_field: 2, num_field: 4.8, real_field: 5.6, text_field: 'Text2'}], use: 2}
    ];
    runTestGroup(tests, callback);
}

function runStringObjectTest(callback) {
    console.log("!--------------  Starting RSO Test");
    db.resultType(sqlite.RESULTSASOBJECT);
    db.valueType(sqlite.VALUESARENATIVE);

    var tests = [
        {name: 'StringObject Get', sql: 'select * from tests where int_field=?', values: [2], results: {int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2'}, use: 0},
        {name: 'StringObject All', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1'},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2'}], use: 1},
        {name: 'StringObject Each', sql: 'select * from tests order by int_field', results: [{int_field: "1", num_field: "1.2", real_field: "2.4", text_field: 'Text1'},{int_field: "2", num_field: "4.8", real_field: "5.6", text_field: 'Text2'}], use: 2}
    ];
    runTestGroup(tests, callback);
}


function runTests() {
    data.length = 0;
    data.push({name: 'Running SQLite tests...'});
    setupTests(function() {
        setTimeout( function() {
            data.push({name: 'Created tables & data...'});
            runNativeArrayTest(function () {
                runNativeObjectTest(function () {
                    runStringArrayTest(function () {
                        runStringObjectTest(function () {
                            data.push({name: "-----------------------------"});
                            data.push({name: 'Tests completed...'});
                        });
                    }); 
                });
            }); 
        },10);
    });
}

