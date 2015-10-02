var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dateutils = require('date-utils');
var fs = require('fs');
var crypto = require('crypto');

var app = express();
var passport = require('./passport').passport;
var mongo = require('./mongo');

// パスワードの正規表現
var re_pass = /^[a-z\d]{8,32}$/i;
var re_id = /^[a-z\d]{1,32}$/i;

// local認証のパスワード暗号化キー
var secretkey = 'tesspassword';
var cipher = crypto.createCipher('aes192', secretkey);

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
	res.render('signup', {err_message: ''});
});
// loginページ
app.get('/login', function(req, res) {
	res.render('login');
});
// login失敗
app.get('/login_failed', function(req, res) {
	res.render('login_failed');
});
// logoutするとindexに戻る
app.get('/logout', function(req, res){
  	req.logout();
  	res.redirect('/');
});

// ペットを登録する(userpageから飛ぶ)
app.post('/pet_register', function(req, res) {
	if(req.body.username != '' && req.body.petname != '' && req.body.modelNo != '') {
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
				  wakeupTime: '600' ,
				  remark: ['よろしくね', 'おはよう', 'おやすみ']
				}
			}, {upsert:true}, function() {
			res.render('pet_register', { username: req.body.username, petname: req.body.petname, modelNo: req.body.modelNo });
		});
	} else {
		// 未入力の項目があるとき
		res.render('pet_create', {userid: req.user});
	}
});

// ユーザーのメインページ
app.get('/userpage', function(req, res) {
	// ログインしているとき
	console.log('user page now')
	if(req.user){
		mongo.users.findOne({userid: req.user}, function(err, item) {
			if(item.petFlag === undefined) {
				// ペットがまだ作られていないとき、登録ページへ飛ぶ
				res.render('pet_create', {userid : req.user });
			} else {
				var i = 0;
				setInterval(function() {
					//pettalk.update(item.remark[i]);
					i++;
					if(i > 4) i %= 5;
				}, 1000);
				
				res.render(
					'userpage',
					{
						username: item.username,
						petname: item.petname,
						mood: item.mood,
						hungry: item.hungry,
						remark: item.remark[0]
					}
				);

				//res.sendfile(__dirname + '/userpage.html')
			}
		});
	} else { // ログインしていないとき
		res.redirect('/login');
    }
});

// アカウント設定
app.get('/setting', function(req, res) {
	if(req.user){
		mongo.users.findOne({userid: req.user}, function(err, item) {	
			res.render(
				'setting',
				{
					username: item.username,
					petname: item.petname
				}
			);
		});
	} else { // ログインしていないとき
		res.redirect('/login');
    }
});

app.post('/setting_edit', function(req, res) {
	if(req.body.username != '' && req.body.petname != '') {
		mongo.users.update(
			{ userid: req.user },
			{$set: 
				{ username: req.body.username,
				  petname: req.body.petname
				}
			},
			{upsert: true},
			function() {
				res.render('setting_edit', { username: req.body.username, petname: req.body.petname});
			}
		);
	} else {
		// 未入力の項目があるとき
		res.render('/setting', { username: item.username, petname: item.petname});
	}
});
// local認証
app.post('/locallogin',
  passport.authenticate('local', { successRedirect: '/userpage',
                                   failureRedirect: '/login_failed',
                                   failureFlash: false })
);
// local新規登録
app.post('/localsignup',function(req, res) {
	console.log(req.body.userid);
	console.log(req.body);
	// idが空白
	if(req.body.userid === '') {
		console.log('idが空白');
		res.render('signup', {err_message: 'IDがありません'});
	} else {
		mongo.users.count({userid: req.body.userid}, function(err, length) {
			if(length === 0) { //IDがかぶらない
				// IDが有効か
				if(re_id.exec(req.body.userid)) {
					if(re_pass.exec(req.body.password)) {
						// パスワードOK
						// パスワード暗号化
						cipher.update(req.body.password, 'utf8', 'hex');
						var cipheredPass = cipher.final('hex');
						mongo.users.insert({userid: req.body.userid, password: cipheredPass});
						res.render('local_idpass_register');
					} else {
						// パスワードNG
						console.log('パスワードNG');
						res.render('signup', {err_message: 'パスワードは8文字以上32文字以下の半角英数字にしてください'});
					}
				} else {
					// IDが正規表現を満たしていない
					res.render('signup', {err_message: 'IDは1文字以上32文字以下の半角英数字にしてください'});
				}
				
			} else {
				// 同じIDが登録されている時
				console.log('同じIDなので登録できませんでした');
				console.log(length);
				res.render('signup', {err_message: 'IDを違うものにしてください'});
			}
		});
	}
});
// twitter認証
app.get('/auth/twitter', passport.authenticate('twitter'));

// twitter認証のcallback
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { successRedirect: '/userpage',
                                     failureRedirect: '/login_failed' }));

var server = app.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;
	
	console.log('Example app listening at http://%s:%s', host, port);
});