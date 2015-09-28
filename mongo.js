var mongodb = require('mongodb');
var users;

mongodb.MongoClient.connect("mongodb://localhost:27017/petdb", function(err, db) {
	if (err) { return console.dir(err);}
	console.log("connected to db");
	users = db.collection('users');
	exports.users = users;
});