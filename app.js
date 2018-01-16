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

var re_id = /^[a-z\d]{1,32}$/i;

// 満腹度の単位量当たりの時間
var delta_hungry = 30;

// userpageに表示する検索ワード
var search_word;

// モデルのjson
var model_json = ['bear/bear.json', 'cat/cat.json', 'rabbit/rabbit.json'];
var skins = [
	['bear/skins/bear_blue.png', 'bear/skins/bear_brown.png', 'bear/skins/bear_magenta.png'],
	['cat/skins/cat_gray.png', 'cat/skins/cat_green.png', 'cat/skins/cat_orange.png'],
	['rabbit/skins/rabbit_grass.png', 'rabbit/skins/rabbit_pink.png', 'rabbit/skins/rabbit_pirple.png']
];

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
				  petFlag: 1,
				  modelNo: req.body.modelNo,
				  modelSkin: req.body.modelSkin,
				  mood: 100,
				  hungry: 30,
				  lastLoginUserpage: dt.toFormat('YYYYMMDDHH24MISS'),
				  sleepTime: 2000,
				  wakeupTime: 600 ,
				  remark_freetalk: ['進捗どうですか？', 'おはよう', 'おやすみ'],
				  remark_hungry: ['はらへだよ','満腹だよ', 'ご飯ありがとう!'],
				  history: [],
				  count : []
				}
			}, {upsert:true}, function() {
			res.render('pet_register');
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
			if(err) {return;}
			if(item.petFlag === undefined) {
				// ペットがまだ作られていないとき、登録ページへ飛ぶ
				res.render('pet_create', {userid : req.user });
			} else {
				var dt = new Date().toFormat('YYYYMMDDHH24MISS');
				var i = item.history.length;

				// 満腹度と前回ログインした時間を更新
				if(dt - item.lastLoginUserpage > delta_hungry) {
					mongo.users.update(
						{ userid: item.userid },
						{ $inc: { hungry: -1} }
					);
				}
				mongo.users.update(
					{ userid: item.userid },
					{ $set: { lastLoginUserpage: dt} }
				);

				if(item.history.length > 2) {
					search_word = item.history[i-1].word + ', ' + item.history[i-2].word + ', ' + item.history[i-3].word + '...';
				} else if(item.history.length === 2) {
					search_word = item.history[i-1].word + ', ' + item.history[i-2].word;
				} else if(item.history.length === 1) {
					search_word = item.history[i-1].word;
				}else {
					search_word = 'まだ検索履歴がありません'
				}
				res.render(
					'userpage',
					{
						username: item.username,
						userid: item.userid,
						petname: item.petname,
						mood: item.mood,
						hungry: item.hungry,
						modelNo: model_json[item.modelNo],
						modelSkin: skins[item.modelNo][item.modelSkin],
						history: search_word
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
			if(err) {return;}	
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
	// idが空白
	if(req.body.userid === '') {
		res.render('signup', {err_message: 'IDがありません'});
	} else {
		mongo.users.count({userid: req.body.userid}, function(err, length) {
			if(err) {return;}
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
						res.render('localsignup_failed', {err_message: 'パスワードは8文字以上32文字以下の半角英数字にしてください'});
					}
				} else {
					// IDが正規表現を満たしていない
					res.render('localsignup_failed', {err_message: 'IDは1文字以上32文字以下の半角英数字にしてください'});
				}
				
			} else {
				// 同じIDが登録されている時
				res.render('localsignup_failed', {err_message: 'IDを違うものにしてください'});
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
});

var io = socketio.listen(server);

// 接続されたら、connected!とコンソールにメッセージを表示します。
var chat = io.sockets.on("connection", function (socket) {
  console.log("connected");
  //メッセージ受信
  socket.on("send_word",function (data,id) {
    console.log("on send_word "+id+" data"+ data);
    //console.log(history[0]);
		if(data != "") {
			mongo.users.count({userid: id, "history.word": data},function (err,length) {
	            if(err) {return;}
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
	        // userpageに表示されている検索ワードを更新
	        mongo.users.findOne({userid: id}, function(err, item) {
				if(err) {return;}	
				var i = item.history.length;
				var search_words;
	            if(item.history.length > 2) {
					search_word = item.history[i-1].word + ', ' + item.history[i-2].word + ', ' + item.history[i-3].word + '...';
				} else if(item.history.length === 2) {
					search_word = item.history[i-1].word + ', ' + item.history[i-2].word;
				} else if(item.history.length === 1) {
					search_word = item.history[i-1].word;
				}else {
					search_word = 'まだ検索履歴がありません'
				}
	        	socket.emit('update_search_word', search_words);
			});
		}
    });
    socket.on("pull_word",function (id) {
    	//console.log("onPull  "+id);
    	mongo.users.findOne({userid: id},function (err,item) {
    		//console.log(item.history[0].word);
    		if(err) {return;}
    		if(item.history.length != 0) {
	    		var index = Math.floor(item.history.length *Math.random());
	    		//console.log(item.history[index].word);
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
		chat.to(req.room).emit("model_emit",req.room);
		chat.to(req.room).emit("req_model");
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
    /*
    socket.on("send_model",function(req) {
    	console.log("on_send_model");
    	chat.to(req.room).json.emit("room_model",
    		{"room" : req.joinedRoom, "name": req.name,"modelNo":req.modelNo, "modelSkin":req.modelSkin});
    });
	*/
	socket.on("send_model",function(req) {
    	console.log("on_send_model");
    	chat.json.emit("room_model",
    		{"room" : req.joinedRoom, "name": req.name,"modelNo":req.modelNo, "modelSkin":req.modelSkin});
    });


    socket.on("send_model_pos",function(req) {
    	//console.log("smp "+req.position.x);
    	chat.to(req.room).json.emit("room_model_pos",
    		{"connect_num":req.connect_num, "position_x":req.position.x,"position_z":req.position.z,"rotation":req.rotation});
    });
	
    socket.on("send_message",function (req) {
    	chat.to(req.room).emit("room_message",req.name+" : "+req.comment);
    });

    // えさ
    socket.on("food",function (id) {
    	mongo.users.findOne({userid: id}, function (err, item) {
    		if(err) {return;}
    		if(item.hungry >= 100) {
    			// 満腹の時
    			socket.emit("update_hungry_by_button", item.hungry, item.remark_hungry[1]);

    		} else {
		    	mongo.users.update(
					{ userid: id },
					{ $inc: { hungry: 10}}
				);
				socket.emit("update_hungry_by_button", item.hungry, item.remark_hungry[2]);
		    }
		});
    });
    socket.on("remark", function(id) {
    	mongo.users.findOne({userid: id}, function (err, item) {
    		if(err) {return;}
    		var rnd = Math.floor(Math.random() * (item.remark_freetalk.length - 1));
			socket.emit("update_remark", item.remark_freetalk[rnd]);
		});
    });
    /*
    socket.on("remark_reg", function(id) {
    	console.log("rere");
    	mongo.users.update(
					{ userid: id },
					{ $inc: { hungry: 10}}
		);
    	mongo.users.findOne({userid: id}, function (err, item) {
    		if(err) {return;}
    		console.log(item.remark_freetalk[0])
			socket.emit("update_remark", item.remark_freetalk[0]);
		});
    });
    */
});

