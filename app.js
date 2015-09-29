var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dateutils = require('date-utils');
var fs = require('fs');

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


// index
app.get('/', function(req, res) {
	res.render('index');
});

// sign up
app.get('/signup', function(req, res) {
	res.render('signup');
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
	var dt = new Date();
	mongo.users.update(
		{ userid: req.user },
		{$set: 
			{ username: req.body.username,
			  petname: req.body.petname,
			  petFlag: '1',
			  modelNo: req.body.modelNo,
			  mood: '100',
			  hungry: '100',
			  lastLoginUserpage: dt.toFormat('YYYYMMDDHH24MISS'),
			  sleepTime: '2000',
			  wakeupTime: '600' 
			}
		}, {upsert:true}, function() {
		res.render('register', { username: req.body.username, petname: req.body.petname, modelNo: req.body.modelNo });
	});
});

// ユーザーのメインページ
app.get('/userpage', function(req, res) {
	// ログインしているとき
	if(req.user){
		mongo.users.findOne({userid: req.user}, function(err, item) {
			if(item.petFlag === undefined) {
				// ペットがまだ作られていないとき、登録ページへ飛ぶ
				res.render('create', {userid : req.user });
			} else {
				res.render(
					'userpage',
					{
						username: item.username,
						petname: item.petname,
						mood: item.mood,
						hungry: item.hungry
					}
				);
			}
		});
	} else { // ログインしていないとき
		res.redirect('/login');
    }
});

// local認証
app.post('/locallogin',
  passport.authenticate('local', { successRedirect: '/userpage',
                                   failureRedirect: '/login',
                                   failureFlash: false })
);
// local新規登録
app.post('/localsignup',function(req, res) {
	console.log(req.body.userid);
	console.log('mongo')
	mongo.users.count({userid: req.body.userid}, function(err, length) {
		if(length === 0) {
			mongo.users.insert({userid: req.body.userid, password: req.body.userid});
			res.render('localregister');
		} else {
			// 同じIDが登録されている時
			console.log("同じIDなので登録できませんでした");
			res.render('login');
		}
	});
});
// twitter認証
app.get('/auth/twitter', passport.authenticate('twitter'));

// twitter認証のcallback
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { successRedirect: '/userpage',
                                     failureRedirect: '/login' }));

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log('Example app listening at http://%s:%s', host, port);
});