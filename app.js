var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');

var app = express();
var passport = require('./passport').passport;
var mongo = require('./mongo');


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret: 'keyboard cat'}));
app.use(passport.initialize()); 
app.use(passport.session());
app.use(express.static(__dirname + '/public')); 	


app.get('/auth/twitter', passport.authenticate('twitter'));

// index
app.get('/', function(req, res) {
	res.render('index');
});

// loginページ
app.get('/login', function(req, res) {
	res.render('login');
});

// logoutするとindexに戻る
app.get('/logout', function(req, res){
  	req.logout();
  	res.redirect('/');
});

// ペットを登録する(userpageから飛ぶ)
app.post('/register', function(req, res) {
	mongo.users.update({ userid: req.user }, {$set: { username: req.body.username, petname: req.body.petname, petFlag: '1' }}, {upsert:true}, function() {
		res.render('register', { username: req.body.username, petname: req.body.petname });
	});
});

// ユーザーのメインページ
app.get('/userpage', function(req, res) {
	// ログインしているとき
	if(req.user){
		mongo.users.findOne({userid: req.user}, function(err, item) {
			if(item.petFlag === undefined) {
				// ペットがまだ作られていないとき、登録ページへ飛ぶ
				res.render('create', {id : req.user });
			} else {
				res.render('userpage', {username: item.username, petname: item.petname });
			}
		});
	} else { // ログインしていないとき
		res.redirect('/login');
    }   
})

// twitter認証のcallback
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { successRedirect: '/userpage',
                                     failureRedirect: '/login' }));

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log('Example app listening at http://%s:%s', host, port);
});