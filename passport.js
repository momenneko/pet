// 書き換える
var consumerKey_twitter = 'gtrtkkN29QfYuPUiIsgmeJdpR';
var consumerSecret_twitter = 'EVXftLchDB2AulWdZcHcMO5KKunlnNDzOLC7PqdErztuWxvGOd';

var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    LocalStrategy = require('passport-local').Strategy;
var crypto = require('crypto');

var mongo = require('./mongo');

var secretkey = 'tesspassword';

passport.serializeUser(function(userid, done) {
    done(null, userid);
});
passport.deserializeUser(function(userid, done) {
    done(null, userid);
});

// local認証
passport.use(new LocalStrategy(
    {
        usernameField: 'userid',
        passwordField: 'password'
    },

  function(userid, password, done) {
    process.nextTick(function() {
        mongo.users.findOne({ userid: userid }, function(err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect userid.' });
            }
            console.log(password);　
            // 受け取ったパスワードを暗号化
            var cipher = crypto.createCipher('aes192', secretkey);
            var encryptedPass = cipher.update(password, 'utf8', 'hex');
            encryptedPass += cipher.final('hex');
            if (encryptedPass != user.password) {
                return done(null, false, { message: 'Incorrect password.' });
            }
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
    passport.session.id = profile.id;
    profile.twitter_token = token;
    profile.twitter_token_secret = tokenSecret;

    // データベースになければ登録
    mongo.users.update({ userid: passport.session.id }, {$set: { userid: passport.session.id }}, {upsert:true});
    
    process.nextTick(function () {
        return done(null, profile.id);
    });
  }
));

module.exports = {passport: passport};