/************************************************************************************
 * (c) 2019-21 Master Technology
 * Licensed under the MIT license or contact me for a support, changes, enhancements,
 * and/or if you require a commercial licensing
 *
 * Any questions please feel free to email me or put a issue up on github
 * Nathan@master-technology.com                           http://nativescript.tools
 ***********************************************************************************
 * Version 1.1.0 - Sync
 ***********************************************************************************
 * NOTE: This code will run inside the worker if you are using multithreading!
 *
 * You can use to send a message back to the main thread (or from the main thread)
 *    sqlite.notify("customName", message)
 *
 * from this code (or the main thread) to receive message:
 *    sqlite.addMessageHandler("customName", callback);
 *
 ***********************************************************************************/

module.exports = {
   setup: function(db) {
       console.log("Syncer Setup");
   },
   handleSync: function(res, callback, db) {
       console.log("Handle Sync", res);
       // TODO: Send records to remote server, upon getting notified that records are good; run the "Callback()"

       // currently during testing, lets just Sending a False back will say the records are NOT done...
       callback(false);
   },
  startSync: function(options, db) {
    console.log("Starting sync with these options", options);
  },
  stopSync: function(db) {
     console.log("Stopping Syncing");
  },
};
