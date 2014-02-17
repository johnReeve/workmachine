/**
 *  PasteBin Module
 *
 *
 *
 */

var Paste = require('../models/Paste');
var _ = require('underscore');

exports.getById = function (req, res) {
    if (req.params.id) {
        Paste.findById(req.params.id, function (err, paste) {
            if (err) {
                console.error('Paste Error: ' + err.msg);
                req.flash('error', { msg: 'Paste error.'});
            }
            if (paste) {
                if (! paste.public && (req.user && ! _.contains(req.user.roles, 'paste-view-private') )) {
                    req.flash('error', { msg: 'Sorry, this paste is private.'});
                    res.redirect('/');
                }
                if (! paste.published && (req.user && ! _.contains(req.user.roles, 'paste-view-unpublished') )) {
                    req.flash('error', { msg: 'Sorry, this paste is unpublished.'});
                    res.redirect('/');
                }
                res.render('pastebin/paste', {
                    title: 'Paste',
                    paste: paste,
                    userCanDelete: req.user && _.contains(req.user.roles, 'paste-delete'),
                    userCanEdit: req.user && _.contains(req.user.roles, 'paste')
                });
            } else {
                req.flash('error', { msg: 'Sorry, this paste is missing.'});
                res.render('pastebin/paste', {
                    title: 'Paste',
                    pasteMissing: true
                });        
            }
        });
    } else {
        res.redirect('/paste/admin');
    }
}

/**
 * GET /paste/public
 * New paste page.
 * TODO - IMPLEMENT
 */

exports.getPublic = function (req, res) {
  res.render('pastebin/admin', {
    title: 'Paste'
  });

}

/**
 * GET /paste/user/:id
 * New paste page.
 * TODO - IMPLEMENT
 */

exports.getByUser = function (req, res) {
  res.render('pastebin/admin', {
    title: 'Paste'
  });
}

/**
 * GET /paste/new
 * New paste page.
 */

exports.getNew = function (req, res) {
    res.render('pastebin/edit', {
        title: 'Paste',
        paste: new Paste,
        isNew: true
    });
}

/**
 * GET /paste/edit/:id
 *
 * Get paste to edit.
 */

exports.getEdit = function (req, res) {
    if (req.params.id) {
        Paste.findById(req.params.id, function(err, paste) {
            if (err) {
                console.error('Paste Error: ' + err.msg);
                req.flash('error', { msg: 'Paste error'});
            }
            if(paste) {
                res.render('pastebin/edit', {
                    title: 'Paste',
                    paste: paste
                });
            } else {
                req.flash('error', { msg: 'Paste not found'});
                res.redirect('/paste/new');
            }
        });
    } else {
        req.flash('error', { msg: 'No ID.' });
    }
}

/**
 * POST /paste/edit/:id
 * POST /paste/edit/new
 *
 * Commit paste edit.
 */
exports.postEdit = function (req, res) {
    console.log('paste - saving')

    if (req.params.id) {
        Paste.findById(req.params.id, function (err, paste) {

            paste.content =     req.body.pasteContent;
            paste.public =      req.body.public === "public";
            paste.published =   req.body.published === "published";

            paste.save(function (){
                console.log('Paste saving:');
                console.dir(paste);
                if (err) {
                    req.flash('error', { msg: 'Paste save error.' });
                    console.error('Paste Error' + err.msg);
                } else {
                    req.flash('success', { msg: 'Paste saved.' });
                }
                res.redirect('paste/edit/' + paste._id);
            });
        });
    } else {
        var paste = new Paste({});        

        paste.content =     req.body.pasteContent;
        paste.public =      req.body.public === "public";
        paste.published =   req.body.published === "published";

        paste.save(function(err) {
            console.log('Paste saving:');
            console.dir(paste);
            if (err) {
                req.flash('error', { msg: 'Paste save error.' });
                console.error('Paste Error' + err.msg);
            } else {
                req.flash('success', { msg: 'Paste saved.' });
            }
            res.redirect('paste/edit/' + paste._id);
        });
    }


}

/**
 * GET /paste/delete/:id
 *
 * Delete the paste.
 */

exports.getDeleteById = function (req, res) {
    console.log('Paste::postDeleteById()');

    if (req.params.id) {
        if (canDelete(req.user)) {
            Paste.remove({ _id: req.params.id }, function(err) {
                if (err) return next(err);
                req.flash('success', { msg: 'Paste deleted.' });
                res.redirect('/paste/admin');
            });
        } else {
            console.error("Paste Error: user tried to delete paste without permission.");
            req.flash('error', { msg: 'Paste delete error: unauthorized.' });
            res.redirect('/paste/admin');
        }
    } else {
        console.error("Paste Error: no ID given");
        req.flash('error', { msg: 'Paste delete error: no ID given' });
        res.redirect('/paste/admin');
    }
}

/**
 * POST /paste/admin
 * POST 
 *
 * Commit paste edit.
 */

exports.getAdmin = function (req, res) {
    Paste.find({})
        .exec(function (err, pastes){
            if (err) {
                console.error("Paste Error" + err.msg);
                req.flash('error', { msg: 'Paste find error.' });
            }
            res.render('pastebin/admin', {
                title: 'Paste',
                pastes: pastes
            });
    });
}

/**
 * Helpers
 */

/**
 * Determine if the user can delete a post
 */
function canDelete (user) {
    if (user && _.contains(user.roles, 'paste-delete')) {
      return true
    } else { 
     return false;
    }
}

/**
 * Determine if the user can access a paste
 */
exports.canAccess = function (req, res, next) {
    next();
}
