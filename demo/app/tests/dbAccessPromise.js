/**
 * Created by nathanaeland on 2/16/2016.
 */

var sqlite = require('@proplugins/nativescript-sqlite');
var dbName = 'name_db.sqlite';

describe('Database', function () {
    //this.timeout(8000);
    if (!sqlite.exists(dbName)) {
        sqlite.copyDatabase(dbName);
    }

    describe('Connection', function () {
        var promise = new sqlite(dbName);
        it('Promise should not be null', function () {
            assert.isNotNull(promise);
        });
        it('promise should work', function (done) {
            promise.then(function (db) {
                assert.isNotNull(db);
                var allPromise = db.all('select name from names');

                assert.isNotNull(allPromise);

                allPromise.then(function (data) {
                    assert.isNotNull(data);
                    assert.isAbove(data.length, 0, 'No Data Returned');
                    db.close();
                    done();
                }).catch(function (err) {
                    console.error("ERR", err);

                    assert.isNotNull(err, "Error" + err);
                });
            }).catch(function (err) {
                console.error("ERR", err);
                assert.isNotNull(err, "Error" + Err);
            });
        });
    });
});