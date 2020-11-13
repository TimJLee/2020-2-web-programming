var mongoose = require('mongoose');

// 스키마 선언
var postSchema = mongoose.Schema({
    title : {type:String, required:true},
    body : {type:String, required:true},
    createdAt: {type:Date, default:Date.now},
    updatedAt: {type:Date}
});

//model & export
var Post = mongoose.model('post', postSchema);
module.exports = Post;