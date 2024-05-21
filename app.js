require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose")
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//This is the order of code must be followed
app.use(session({
  secret:"Our little secret.",
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb://127.0.0.1:27017/dailyJonalDB")

const postSchema ={
  name: String,
  body: String
}
const Post = mongoose.model('post', postSchema)

const userSchema = new mongoose.Schema({
  user: String,
  password: String,
  posts: [postSchema]
})

//This should be the same while using passportjs

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

const User = mongoose.model('user', userSchema)

//User setup using passport
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
})
//End of user set up

app.get('/', (req,res)=>{
  res.render('home')
})
app.get("/journal", function(req, res){
  if (req.isAuthenticated()) {
    const getPost = async() =>{
      const fudUser = await User.findById(req.user.id)
      if (fudUser.posts.length === 0) { 
        res.render("journal", {
          startingContent: homeStartingContent,
          posts: [],
          noPost: 'No journal Published yet',
          userName: fudUser.username
          });
      } else {
          res.render("journal", {
            startingContent: homeStartingContent,
            posts: fudUser.posts,
            noPost: null,
            userName: fudUser.username
            });
      }
    }
    getPost() 
  }else{
    res.redirect('/login')
  }
});


app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.get("/compose", function(req, res){
  res.render("compose");
});
app.get("/errPage", function(req, res){
  res.render("errPage")
});
app.get('/login', (req,res)=>{
  res.render('login')
})
app.get('/signup', (req,res)=>{
  res.render('signup')
})
app.post("/compose", function(req, res){
    const wrtTitle = req.body.postTitle
    async function authPost() {
      const foundUser = await User.findById(req.user.id)
      const newPost ={
        name: _.capitalize(req.body.postTitle),
        body: req.body.postBody
      }
      foundUser.posts.push(newPost)
      foundUser.save().then(()=> {console.log("new post done ")})
      res.redirect('/journal')
    }
    authPost()
});
app.post("/delete", function(req,res){
  const delPostId = req.body.postId
  const userId = req.user.id
  async function deletePost() {
    const foundPost = await User.findOneAndUpdate({_id: userId}, {$pull: {posts: {_id: delPostId}}})
    console.log(req)
    res.redirect('/journal')
  }
  deletePost()
})
app.get("/posts/:postName", function(req, res){
  const reqPost = _.capitalize(req.params.postName)
  async function getPost(){
    const fudUser = await User.findById(req.user.id)
    if (fudUser) {
      for (let i = 0; i < fudUser.posts.length; i++) {
       if (fudUser.posts[i].name == reqPost ) {
        const fudPost = fudUser.posts[i]
        res.render('post', {title: fudPost.name, content: fudPost.body, id: fudPost._id})
       }
      }
    }
  }
  getPost()
});
app.post('/login', (req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, (err)=>{
    if(err){
      console.log(err)
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect('/journal')
      })
    }
  })
})

app.post('/signup', (req,res)=>{
  User.register({username: req.body.username}, req.body.password, (err,user)=>{
    if (err) {
      console.log(err)
      res.redirect('/')
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect('/journal')
      })
    }
  })
})

app.get('/logout', (req, res)=>{
  req.logout((err)=>{
    if(err){
      console.log(err)
    }else{
      res.redirect('/')
    }
  })
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});