var express = require('express');
var router = express.Router();
var Post = require('../models/Post');
var User = require('../models/User');
var util = require('../util');

  // Index
  router.get('/', async function(req, res){ // 1
    var page = Math.max(1, parseInt(req.query.page));   // 2
    var limit = Math.max(1, parseInt(req.query.limit)); // 2
    page = !isNaN(page)?page:1;                         // 3
    limit = !isNaN(limit)?limit:10;

    var skip = (page-1)*limit;
    var maxPage = 0;
    var searchQuery = await createSearchQuery(req.query);
    var posts = [];

    if(searchQuery) {
      var count = await Post.countDocuments(searchQuery);
      maxPage = Math.ceil(count/limit);
      posts = await Post.find(searchQuery)
        .populate('author')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .exec();
    }

    res.render('posts/index', {
      posts:posts,
      currentPage:page, // 9
      maxPage:maxPage,  // 9
      limit:limit,       // 9
      searchType:req.query.searchType, 
      searchText:req.query.searchText  
    });
  });
  
  // New
  router.get('/new',util.isLoggedin, function(req, res){
    var post = req.flash('post')[0] || {};
    var errors = req.flash('errors')[0] || {};
    res.render('posts/new', { post:post, errors:errors });
  });

  // create
  router.post('/',util.isLoggedin, function(req, res){
    req.body.author = req.user._id;
    Post.create(req.body, function(err, post){
      if(err){
        req.flash('post', req.body);
        req.flash('errors', util.parseError(err));
        return res.redirect('/posts/new'+res.locals.getPostQueryString());
      }
      res.redirect('/posts'+res.locals.getPostQueryString(false, { page:1, searchText:'' }));
    });
  });
  
  // show
  router.get('/:id', function(req, res){
    Post.findOne({_id:req.params.id}) // 3
    .populate('author')             // 3
    .exec(function(err, post){      // 3
      if(err) return res.json(err);
      res.render('posts/show', {post:post});
    });
  });
  
  // edit
  router.get('/:id/edit',util.isLoggedin, checkPermission, function(req, res){
    var post = req.flash('post')[0];
    var errors = req.flash('errors')[0] || {};
    if(!post){
      Post.findOne({_id:req.params.id}, function(err, post){
          if(err) return res.json(err);
          res.render('posts/edit', { post:post, errors:errors });
        });
    }
    else {
      post._id = req.params.id;
      res.render('posts/edit', { post:post, errors:errors });
    }
  });
  
  // update
  router.put('/:id',util.isLoggedin, checkPermission, function(req, res){
    req.body.updatedAt = Date.now();
    Post.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post){
      if(err){
        req.flash('post', req.body);
        req.flash('errors', util.parseError(err));
        return res.redirect('/posts/'+req.params.id+'/edit'+res.locals.getPostQueryString());
      }
      res.redirect('/posts/'+req.params.id+res.locals.getPostQueryString());
    });
  });
  
  
  // destroy
  router.delete('/:id',util.isLoggedin, checkPermission, function(req, res){
    Post.deleteOne({_id:req.params.id}, function(err){
      if(err) return res.json(err);
      res.redirect('/posts'+res.locals.getPostQueryString());
    });
  });
  
  module.exports = router;

  // private functions // 1
function checkPermission(req, res, next){
  Post.findOne({_id:req.params.id}, function(err, post){
    if(err) return res.json(err);
    if(post.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

async function createSearchQuery(queries){ // 4
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var postQueries = [];
    if(searchTypes.indexOf('title')>=0){
      postQueries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      postQueries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(postQueries.length > 0) searchQuery = {$or:postQueries};

    if(searchTypes.indexOf('author!')>=0){ // 2-1
      var user = await User.findOne({ username: queries.searchText }).exec();
      if(user) postQueries.push({author:user._id});
    }
    else if(searchTypes.indexOf('author')>=0){ // 2-2
      var users = await User.find({ username: { $regex: new RegExp(queries.searchText, 'i') } }).exec();
      var userIds = [];
      for(var user of users){
        userIds.push(user._id);
      }
      if(userIds.length>0) postQueries.push({author:{$in:userIds}});
    }
    if(postQueries.length>0) searchQuery = {$or:postQueries}; // 2-3
    else searchQuery = null; 
  }
  
  return searchQuery;
}