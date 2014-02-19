
/**
 * Module dependencies.
 */

var express = require('express');
var MongoStore = require('connect-mongo')(express);
var flash = require('express-flash');
var less = require('less-middleware');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var cookie = require('cookie');
var connect = require('connect');
var expressValidator = require('express-validator');
var http = require('http');


/**
 * Load controllers.
 */

var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var apiController = require('./controllers/api');
var contactController = require('./controllers/contact');
var chatController = require('./controllers/chat');
var pastebinController = require('./controllers/pastebin');
var forgotController = require('./controllers/forgot');
var resetController = require('./controllers/reset');

/**
 * API keys + Passport configuration.
 */

var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Mongoose configuration.
 */

mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.log('✗ MongoDB Connection Error. Please make sure MongoDB is running.'.red);
});
var sessionStore = new MongoStore({
    db: 'session'
});

var app = express();
var server = http.createServer(app);

/**
 * Express configuration.
 */
app.locals.cacheBuster = Date.now();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.compress());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(expressValidator());
app.use(express.methodOverride());
app.use(express.session({
  secret: secrets.sessionSecret,
  store: sessionStore
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  // page locals
  res.locals.user = req.user;
  res.locals.chat_url = "/";
  next();
});
app.use(flash());
app.use(less({ src: __dirname + '/public', compress: true }));
app.use(app.router);
app.use(express.static( path.join(__dirname, 'public'), { maxAge: 864000000 } ));
app.use(function(req, res) {
  res.render('404', { status: 404 });
});
app.use(express.errorHandler());

/**
 * Application routes.
 */

app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);

// todo: move this canChat thing to the chatController
app.get('/chat', passportConf.canChat, chatController.getChatPage);

app.get('/paste/new', pastebinController.canAccess, pastebinController.getNew);
app.post('/paste/edit/new', pastebinController.canAccess, pastebinController.postEdit);
app.get('/paste/edit/:id', pastebinController.canAccess, pastebinController.getEdit);
app.post('/paste/edit/:id', pastebinController.canAccess, pastebinController.postEdit);
app.get('/paste/edit', pastebinController.canAccess, pastebinController.getNew);
app.get('/paste/delete', pastebinController.canAccess, pastebinController.getDeleteById);
app.get('/paste/delete/:id', pastebinController.canAccess, pastebinController.getDeleteById);
//app.get('/paste/user/:id', pastebinController.canAccess, pastebinController.getByUser);
app.get('/paste/admin', pastebinController.canAccess, pastebinController.getAdmin);
app.get('/paste/:id', pastebinController.getById);
app.get('/paste', pastebinController.canAccess, pastebinController.getPublic);

app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/forgot', forgotController.getForgot);
app.post('/account/forgot', forgotController.postForgot);
app.get('/account/reset/:token', resetController.getReset);
app.post('/account/reset/:token', resetController.postReset);

app.get('/admin', passportConf.isAdmin, homeController.admin_main);
app.get('/admin/users', passportConf.isAdmin, userController.getUserAdmin);
app.get('/admin/users/create', passportConf.isAdmin, userController.getCreateUserAccount);
app.post('/admin/users/create', passportConf.isAdmin, userController.postCreateUserAccount);
app.post('/admin/users/delete', passportConf.isAdmin, userController.postDeleteUserAccount);
app.get('/admin/users/:id', passportConf.isAdmin, userController.getUserProfile);
app.post('/admin/users/:id', passportConf.isAdmin, userController.postUserProfile);

app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);
app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'email' }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/login' }));
app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), function(req, res) { res.redirect('/api/foursquare'); });
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), function(req, res) { res.redirect('/api/tumblr'); });

server.addListener('error', function(err) {
  console.log(err);
});

// Socket setup
var sio = require('socket.io').listen(server);
sio.configure(function (){
  sio.set('log level', 1);
  sio.set('authorization', chatController.handshake(sessionStore));
});
sio.sockets.on('connection', chatController.socketOnConnection(sio) );

server.listen(app.get('port'), function(){
  console.log('✔ : Express server listening on port ' + app.get('port'));
});

