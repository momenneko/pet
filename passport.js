var passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy;
var mongo = require('./mongo');

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// twitter認証
passport.use(new TwitterStrategy({
    consumerKey:  'gtrtkkN29QfYuPUiIsgmeJdpR',
    consumerSecret: 'EVXftLchDB2AulWdZcHcMO5KKunlnNDzOLC7PqdErztuWxvGOd',
    callbackURL: 'http://localhost:3000/auth/twitter/callback'
  },
  function(token, tokenSecret, profile, done) {
    passport.session.id = profile.id;
    profile.twitter_token = token;
    profile.twitter_token_secret = tokenSecret;

    // データベースになければ登録
    mongo.users.update({ userid: passport.session.id }, {$set: { userid: passport.session.id }}, {upsert:true});
    
    process.nextTick(function () {
        return done(null, profile);
    });
  }
));

module.exports = {passport: passport};