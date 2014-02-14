var mongoose = require('mongoose');
var passport = require('passport');
var passportConf = require('../config/passport');
var _ = require('underscore');
var User = require('../models/User');

/**
 * GET /login
 * Login page.
 */

exports.getLogin = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 * @param {string} email
 * @param {string} password
 */

exports.postLogin = function(req, res, next) {
  req.assert('email', 'Email cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);

    if (!user) {
      req.flash('errors', { msg: info.message });
      return res.redirect('/login');
    }

    req.logIn(user, function(err) {      
      if (err) return next(err);
      req.flash('success', { msg: 'You\'re logged in.' });
      return res.redirect('/');
    });
  })(req, res, next);
};

/**
 * GET /signup
 * Signup page.
 */

exports.getSignup = function(req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/signup', {
    title: 'Create Account'
  });
};

/**
 * POST /signup
 * Create a new local account.
 * @param {string} email
 * @param {string} password
 */

exports.postSignup = function(req, res, next) {
  req.assert('email', 'Email cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  var user = new User({
    email: req.body.email,
    password: req.body.password
  });

  user.save(function(err) {
    if (err) {
      if (err.code === 11000) {
        req.flash('errors', { msg: 'User already exists.' });
      }
      return res.redirect('/signup');
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      res.redirect('/');
    });
  });
};

/**
 * GET /account
 * Profile page.
 */

exports.getAccount = function(req, res) {
  res.render('account/profile', {
    title: 'Account Management'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */

exports.postUpdateProfile = function(req, res, next) {
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);
    req.assert('email', 'Email cannot be blank').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();

    req.assert('nick', 'C\'mon.., you _need_ a nickname, Sparky!').notEmpty();
    req.assert('nick', 'Your nick needs to be alphanumeric.').isAlphanumeric();
    // TODO: assert unique    
    req.assert('nick', 'Your nick needs to be between 3 and 20 characters.').len(3,20);

    var errors = req.validationErrors();

    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/account');
    }
    user.profile.name = req.body.name || '';
    user.profile.nick = req.body.nick || '';
    user.profile.email = req.body.email || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 * @param {string} password
 */

exports.postUpdatePassword = function(req, res, next) {
  if (!req.body.password) {
    req.flash('errors', { msg: 'Password cannot be blank.' });
    return res.redirect('/account');
  }

  if (req.body.password !== req.body.confirmPassword) {
    req.flash('errors', { msg: 'Passwords do not match.' });
    return res.redirect('/account');
  }

  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user.password = req.body.password;

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Password has been changed.' });
      res.redirect('/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 * @param {string} id
 */

exports.postDeleteAccount = function(req, res, next) {
  User.remove({ _id: req.user.id }, function(err) {
    if (err) return next(err);
    req.logout();
    res.redirect('/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth2 provider from the current user.
 * @param {string} provider
 * @param {string} id
 */

exports.getOauthUnlink = function(req, res, next) {
  var provider = req.params.provider;
  User.findById(req.user.id, function(err, user) {
    if (err) return next(err);

    user[provider] = undefined;
    user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

    user.save(function(err) {
      if (err) return next(err);
      res.redirect('/account');
    });
  });
};

/**
 * GET /logout
 * Log out.
 */

exports.logout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * User Admin Stuff
 * TODO: Break this out to a separate controller
 */

/**
 * GET /admin/users
 * List users
 */

exports.getUserAdmin = function(req, res) {
  User.find({})
    .exec(function(err, users) {
      if (err) return next(err);
        res.render('admin/users', {
          title: 'Admin - User Admin',
          users: users
      });
    });
};

/**
 * GET /admin/users/:userID
 * List users
 */

exports.getUserProfile = function(req, res, next) {

  User.findById(req.params.id, function(err, user) {

    if (err) {
      req.flash('errors', { msg: "User not found... or: " + err.message });
      return res.redirect('/admin/users');
    }

    res.render('admin/user_profile', {
      title: 'Admin - Edit User Profile',
      userRoles: passportConf.userRoles,
      user_to_edit: user
      });
  });
};

/**
 * POST /admin/users/:userID
 * List users
 */

exports.postUserProfile = function(req, res, next) {

  User.findById(req.params.id, function(err, user) {
    if (err) {
      req.flash('errors', { msg: "User not found... or: " + err.message });
      return res.redirect('/admin/users');
    }

    req.assert('email', 'Email cannot be blank').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('nick', 'C\'mon.., this person _needs_ a nickname, Sparky!').notEmpty();
    req.assert('nick', 'The nick needs to be alphanumeric.').isAlphanumeric();
    req.assert('nick', 'The nick needs to be between 3 and 20 characters.').len(3,20);

    var errors = req.validationErrors();

    if (errors) {
      req.flash('errors', errors);
      return res.redirect('/admin/users/' + user._id);
    }

    user.profile.name = req.body.name || '';
    user.profile.nick = req.body.nick || '';
    user.profile.email = req.body.email || '';
    user.profile.gender = req.body.gender || '';
    user.profile.location = req.body.location || '';
    user.profile.website = req.body.website || '';

    user.roles = [];
    _.each(req.body.roles, function (role){
      user.roles.push(role);
    });

    user.save(function(err) {
      console.log(err);
      if (err) return next(err);
      req.flash('success', { msg: 'Profile information updated.' });
      res.redirect('/admin/users/' + user._id);
    });
  });
};

/**
 * GET /admin/users/create
 * Delete user account.
 * @param {string} id
 */

exports.getCreateUserAccount = function(req, res, next) {
  var new_user = {}
  new_user.email = "";

  res.render('admin/user_create', {
    title: 'Create Account',
    new_user: new_user
  });

};

/**
 * POST /admin/users/create
 * Create user account.
 */

exports.postCreateUserAccount = function(req, res, next) {

  req.assert('email', 'Email cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    res.redirect('/admin/users/create');
  }

  var user = new User({
    email: req.body.email,
    password: req.body.password,
  });

  user.save(function(err) {
    if (err) {
      if (err.code === 11000) {
        req.flash('errors', { msg: 'User already exists.' });
      }      
      res.redirect('/admin/users/');
    } else {
      req.flash('success', { msg: 'Account created.' });
      res.redirect('/admin/users/' + user._id);
    }
  });
};

/**
 * POST /admin/users/delete
 * Delete user account.
 * @param {string} id
 */

exports.postDeleteUserAccount = function(req, res, next) {
  
  console.log("userID: " + req.user._id );
  if (req.user._id != req.body.id) {

    User.remove({ _id: req.body.id }, function(err) {
      if (err) return next(err);
      req.flash('success', { msg: 'User deleted.' });
      res.redirect('/admin/users');
    });
  } else {
      req.flash('errors', { msg: 'You can\'t delete yourself!' });
      res.redirect('/admin/users');
  }
};
