/**
 * Created by nathanaeland on 2/16/2016.
 */

var sqlite = require('@proplugins/nativescript-sqlite');
var dbName = 'name_db.sqlite';

describe('Database', function () {

if (!sqlite.exists(dbName)) {
    sqlite.copyDatabase(dbName);
}

    new sqlite(dbName, function(err, db) {
        describe('Connection', function() {
            it('Error should be null', function() { 
                assert.isNull(err);
            });
            it('dbConnection should not me null', function() {
                assert.isNotNull(db);
            });
        }); 

        describe('Get Values', function() {
            it('Should contain values', function(done) {
                    db.all('select name from names', function (err, data) {
                            assert.isNull(err);
                            assert.isNotNull(data);
                            assert.isAbove(data.length, 0, 'No Data Returned');
                            db.close();
                        done();
                    });
            });
        });

    });

    new sqlite(":memory:", function(err, db) {
        describe('In-Memory Connection', function() {
            it('Error should be null', function() { 
                assert.isNull(err);
            });
            it('dbConnection should not be null', function() {
                assert.isNotNull(db);
            });

            done();
        });
    });
});