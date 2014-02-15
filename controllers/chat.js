var User = require('../models/User');
var cookie = require('cookie');
var secrets = require('../config/secrets');
var connect = require('connect');
var _ = require('underscore');

/**
 * handshake config
 * Sets up the connection between the handshake and the session
 */

exports.handshake = function (sessionStore) {

    return function (handshakeData, accept_callback) {

        handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);    
        handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['connect.sid'], secrets.sessionSecret);

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
    }
};

exports.socketOnConnection = function (sio) {
    return function (socket) {

      socket.join('main_chat');

      sio.sockets.emit('chat_message', {message: socket.handshake.user.nick + " has entered chat!", user:"system"});

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
    }
};


/**
 * GET /chat
 * Chat page.
 */

exports.getChatPage = function(req, res) {
  
  // users need a nick to use chat:
  if (!req.user.profile.nick) {
    req.flash('errors', {msg: 'Sorry, you need a nickname if you want to use chat.'});
    return res.redirect('/account');
  }
  
  res.render('chat', {
    title: 'Chat Application'
  });
};

/**
 *  Helper functions
 *
 *
 */

function getListOfUserNicks (client){
  //get nicks
  var listOfUserNicks = [];
  _.each(client.manager.handshaken, function (client){
    listOfUserNicks.push(client.user.nick);
  });
  return listOfUserNicks;
}


