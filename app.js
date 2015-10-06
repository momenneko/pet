var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var dateutils = require('date-utils');
var fs = require('fs');
var crypto = require('crypto');
var socketio = require("socket.io");


var app = express();
var passport = require('./passport').passport;
var mongo = require('./mongo');
var pettalk = require('./pet_talk');

// パスワードの正規表現
var re_pass = /^[a-z\d]{8,32}$/i;

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
				  remark: ['よろしくね', 'おはよう', 'おやすみ'],
				  history: [],
				  count : []
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
	if(req.user){
		mongo.users.findOne({userid: req.user}, function(err, item) {
			if(item.petFlag === undefined) {
				// ペットがまだ作られていないとき、登録ページへ飛ぶ
				res.render('pet_create', {userid : req.user });
			} else {
				var i = 0;
				setInterval(function() {
					pettalk.update(item.remark[i]);
					i++;
					if(i > 4) i %= 5;
				}, 1000);
				
				res.render(
					'userpage',
					{
						username: item.username,
						userid: item.userid,
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
                                   failureRedirect: '/login',
                                   failureFlash: false })
);
// local新規登録
app.post('/localsignup',function(req, res) {
	console.log(req.body.userid);
	console.log(req.body);
	// idが空白
	if(req.body.userid === '') {
		console.log('idが空白');
		res.render('signup');
	} else {
		mongo.users.count({userid: req.body.userid}, function(err, length) {
			if(length === 0) { //IDがかぶらない
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
					res.render('signup');
				}
				
			} else {
				// 同じIDが登録されている時
				console.log('同じIDなので登録できませんでした');
				console.log(length)
				res.render('signup');
			}
		});
	}
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

var io = socketio.listen(server);

// 接続されたら、connected!とコンソールにメッセージを表示します。
var chat = io.sockets.on("connection", function (socket) {
  console.log("connected");
  //メッセージ受信
  socket.on("send_word",function (data,id) {
    console.log("on send_word "+id+" data"+ data);
    //console.log(history[0]);
		
		mongo.users.count({userid: id, "history.word": data},function (err,length) {
            //console.log(item.history[0]);
            if(length === 0) {
                // 新しく検索したワード
                mongo.users.update(
                    { userid: id },
                    {$push: 
                        { history : {word : data , num : 1}                  
                    }}
                );
            } else {
                // すでに検索したことのあるワード
                mongo.users.update(
                    { userid: id, "history.word": data},
                    {$inc: 
                        {"history.$.num" : 1}              
                    }
                );
            }
        });
    });
    socket.on("pull_word",function (id) {
    	mongo.users.findOne({userid: id},function (err,item) {
    		if(item.history.length != 0) {
	    		var index = Math.floor(item.history.length *Math.random());    		
	    		socket.emit("post_word",item.history[index].word);
    		}
    	});   	
    });
    socket.on('init', function(req) {
        // ※4 クライアントを部屋に入室させる
        socket.join(req.room);
        chat.to(req.room).emit('room_message', req.name + " さんが入室");
    });
    var connect_count = 0;
    socket.on("join",function(req) {
    	socket.join(req.room);
    	console.log("join!!");
		chat.to(req.room).emit('room_message', req.name + " さんが入室");
		/*
		mongo.users.count({userid: req.user, "count.id": req.user},function (err,length) {
            //console.log(item.history[0]);
            if(length === 0) {
                // 新しく検索したワ
                connect_count ++;
                mongo.users.update(
                    { userid: req.user },
                    {$push: 
                        { count : {id : req.user , num : connect_count}                  
                    }}
                );
            } 
        });*/
    });
    /*
    socket.on("get_connect_count" function(id){
    	var count;
    	mongo.users.findOne({userid: id},function (err,item) {
    		count = item.
    		if(item.history.length != 0) {
	    		var index = Math.floor(item.history.length *Math.random());    		
	    		socket.emit("post_word",item.history[index].word);
    		}
    	});   	
    	socket.emit("ret_connect_count",connect_count);
    });
    */
    socket.on("send_model",function(req) {
    	console.log("on_send_model"+req.model_id);
    	chat.to(req.room).emit("room_model",req.model_id);
    });
	
    socket.on("send_model_pos",function(req) {
    	//console.log("smp "+req.position.x);
    	chat.to(req.room).json.emit("room_model_pos",
    		{"connect_num":req.connect_num, "position":req.position,"rotation":req.rotation});
    });
	
    socket.on("send_message",function (req) {
    	chat.to(req.room).emit("room_message",req.name+" : "+req.comment);
    });
});

