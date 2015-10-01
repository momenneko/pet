// 書き換える
var consumerKey_twitter = 'gtrtkkN29QfYuPUiIsgmeJdpR';
var consumerSecret_twitter = 'EVXftLchDB2AulWdZcHcMO5KKunlnNDzOLC7PqdErztuWxvGOd';

var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');

var mongo = require('./mongo');

var secretkey = 'tesspassword';
var cipher = crypto.createCipher('aes192', secretkey);

passport.serializeUser(function(userid, done) {
    console.log('serialize');
    console.log(userid)
    done(null, userid);
});
passport.deserializeUser(function(userid, done) {
    console.log('deserialize');
    console.log(userid);
    done(null, userid);
});

// local認証
passport.use(new LocalStrategy(
    {
        usernameField: 'userid',
        passwordField: 'password'
    },

  function(userid, password, done) {
    console.log("local ninsyo")
    process.nextTick(function() {
        mongo.users.findOne({ userid: userid }, function(err, user) {
            if (err) { return done(err); }
            console.log('err は null')
            if (!user) {
                console.log('user not found');
                return done(null, false, { message: 'Incorrect userid.' });
            }
            console.log('userはいる');
            cipher.update(password, 'utf8', 'hex');
            var cipheredPass = cipher.final('hex');
            if (cipheredPass != user.password) {
                console.log('password が違う');
                return done(null, false, { message: 'Incorrect password.' });
            }
            console.log('login')
            return done(null, user.userid);
        });
    });
  }));

// twitter認証
passport.use(new TwitterStrategy({
    consumerKey:  consumerKey_twitter,
    consumerSecret: consumerSecret_twitter,
    callbackURL: 'http://localhost:3000/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    //console.log(profile)
    passport.session.id = profile.id;
    profile.twitter_token = token;
    profile.twitter_token_secret = tokenSecret;
    //console.log(mongo.users);
    // データベースになければ登録
    mongo.users.update({ userid: passport.session.id }, {$set: { userid: passport.session.id }}, {upsert:true});
    
    process.nextTick(function () {
        return done(null, profile.id);
    });
  }
));

module.exports = {passport: passport};