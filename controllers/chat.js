var User = require('../models/User');
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
    title: 'Chat Application - Chat Machine'
  });
};
