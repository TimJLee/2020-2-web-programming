var mongoose = require('mongoose');

// 스키마 선언
var postSchema = mongoose.Schema({
    title:{type:String, required:[true,'Title is required!']},
    body:{type:String, required:[true,'Body is required!']},   
    createdAt: {type:Date, default:Date.now},
    updatedAt: {type:Date}
});

//model & export
var Post = mongoose.model('post', postSchema);
module.exports = Post;