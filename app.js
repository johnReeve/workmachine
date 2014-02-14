
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
  secret: 'keCRuchetujUChuPu6uqesTunupRap7a',
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

app.get('/chat', passportConf.canChat, chatController.getChatPage);

app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);


// TODO: Roles or better authentication
app.get('/admin', passportConf.isAdmin, homeController.admin_main);
app.get('/admin/users', passportConf.isAdmin, userController.getUserAdmin);
app.get('/admin/users/create', passportConf.isAdmin, userController.getCreateUserAccount);
app.post('/admin/users/create', passportConf.isAdmin, userController.postCreateUserAccount);
app.post('/admin/users/delete', passportConf.isAdmin, userController.postDeleteUserAccount);
app.get('/admin/users/:id', passportConf.isAdmin, userController.getUserProfile);
app.post('/admin/users/:id', passportConf.isAdmin, userController.postUserProfile);


app.get('/api', apiController.getApi);
app.get('/api/foursquare', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConf.isAuthenticated, apiController.getFacebook);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/github', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getGithub);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/twitter', passportConf.isAuthenticated, apiController.getTwitter);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);

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

// Chat setup

var sio = require('socket.io').listen(server);
sio.set('log level', 1);
sio.configure(function (){
  sio.set('authorization', function (handshakeData, accept_callback) {

    var User = require('./models/User');

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);    
    handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['connect.sid'], 'keCRuchetujUChuPu6uqesTunupRap7a');

    sessionStore.get(handshakeData.sessionID, function (err, session) {
      if (err || !session) {
        accept_callback('No session found in db.', false);
      } else {
        // console.log("Gimme User:" + session.passport.user);
        User.findById(session.passport.user, function(err, user) {
          if (err || !user) {
            accept_callback('User not found in db.', false);
          } else {
            handshakeData.user = {};
            handshakeData.user.id = user._id;
            handshakeData.user.nick = user.profile.nick;
            handshakeData.user.name = user.profile.name;      
            handshakeData.user.location = user.profile.location;
            handshakeData.user.picture = user.profile.picture;
            handshakeData.user.startTime = handshakeData.time;
            accept_callback(null, true);
          }
        });
      }
    });

  });
});

server.listen(app.get('port'), function(){
  console.log('✔ : Express server listening on port ' + app.get('port'));
});

sio.sockets.on('connection', function (socket) {

  socket.join('main_chat');

  //console.dir(sio.sockets);
  // console.log("sockets.clients");
  // console.dir(sio.sockets.clients());
  // console.log("sockets.clients");
  // console.dir(sio.sockets.clients('main_chat'));
  // console.log("sockets.clients.manager.handshaken");
  // console.dir(clients[0].manager.handshaken);
  // console.log("List of nicks");
  // console.dir(roomUsers);
  // console.log("THIS socket");
  // console.dir(socket);
  sio.sockets.emit('chat_message', {message: socket.handshake.user.nick + " has entered chat.", user:"system"});

  socket.emit('chat_message', {
    message: 'Welcome to the chat machine, ' + socket.handshake.user.nick + '.',
    user: "system" 
  });
  
  socket.on('send', function (data) {
    sio.sockets.emit('chat_message', { message: data.message, user: socket.handshake.user.nick });
  });

  socket.on('get_status', function (data) {
    var clients = sio.sockets.clients('main_chat');
    var roomUsers = getListOfUserNicks(clients[0]);
    sio.sockets.emit('status_update', { userlist: roomUsers });
  });

  socket.on('disconnect', function () {
    var clients = sio.sockets.clients('main_chat');
    var roomUsers = getListOfUserNicks(clients[0]);
    sio.sockets.emit('status_update', { userlist: roomUsers });
    sio.sockets.emit('chat_message', {message: socket.handshake.user.nick + " has left chat.", user:"system"});
  })


});

function getListOfUserNicks (client){
  //get nicks
  var _ = require('underscore');
  var listOfUserNicks = [];
  _.each(client.manager.handshaken, function (client){
    listOfUserNicks.push(client.user.nick);
  });
  return listOfUserNicks;
}


