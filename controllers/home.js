/**
 * GET /
 * Home page.
 */

exports.index = function(req, res) {
  res.render('home', {
    title: 'Welcome to the Work Machine'
  });
};

/**
 * GET /admin
 * Admin root page.
 */

exports.admin_main = function(req, res) {
  res.render('admin/home', {
    title: 'Admin Home'
  });
};
