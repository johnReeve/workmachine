var mongoose = require('mongoose');
//var User = require('../models/User');

var pasteSchema = new mongoose.Schema({
    published: Boolean,
    public: Boolean,
    createdAt: { type: Date, default: Date.now },
    publishedAt: { type: Date, default: Date.now },
    content : { type: String, default: '' }
});

module.exports = mongoose.model('Paste', pasteSchema);