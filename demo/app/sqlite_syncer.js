/************************************************************************************
 * (c) 2019 Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to email me or put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 * Version 1.0.0 - Sync
 ***********************************************************************************/

module.exports = {
   db: null,
   setup: function(db) {
       console.log("Syncer Setup");
        this.db = db;
   },
   handleSync: function(res, callback) {
       console.log("Handle Sync", res);
       // TODO: Send records to remote server, upon getting notified that records are good; run the "Callback()"

       // currently during testing, lets just Sending a False back will say the records are NOT done...
       callback(false);
   }
};
