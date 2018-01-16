var dotenv = require('dotenv').config();
var mongodb = require('mongodb');
var users;

mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
	if (err) { return console.dir(err);}
	console.log("connected to db");
	users = db.collection('users');
	exports.users = users;
});