const flash = require('connect-flash')
const session = require('express-session')
const express = require('express')
const handlebars = require('express-handlebars')
const methodOverride = require('method-override')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt-nodejs')

const helpers = require('./_helpers');
const passport = require('./config/passport')
const db = require('./models')

const Tweet = db.Tweet
const User = db.User
const Reply = db.Reply
const Followship = db.Followship
const Like = db.Like

const app = express()
const port = 3000

app.engine('handlebars', handlebars({
  defaultLayout: 'main', 
  helpers: require('./config/handlebars-helpers')
}))
app.set('view engine', 'handlebars')
app.use('/upload', express.static(__dirname + '/upload'))
app.use(bodyParser.urlencoded({extended: true}))
app.use(methodOverride('_method'))
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use((req, res, next) => {
  res.locals.success_messages = req.flash('success_messages')
  res.locals.error_messages = req.flash('error_messages')
  res.locals.user = helpers.getUser(req)
  next()
})

app.get('/', (req, res) => res.send('Hello World!'))

const authenticated = (req, res, next) => {
  if (helpers.ensureAuthenticated(req)) {
    return next()
  }
  res.redirect('/signin')
}

app.get('/tweets', authenticated, function (req, res) {
  // console.log('\n\n* 看見站內所有的推播，以及跟隨者最多的使用者（設為前台首頁）')
  const UserId = helpers.getUser(req).id
  return Tweet.findAll({include: [User, Reply, Like]}).then(tweets => {
    User.findAll({include: {model: User, as: 'Followers'}}).then(users => {
    
      tweets = tweets.map(tweet => ({
        ...tweet.dataValues,
        isLiked: tweet.Likes.map(l => l.UserId).includes(UserId),
      }))

      users = users.map(user => ({
        ...user.dataValues, FollowerCount: user.Followers.length,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id),
      }))

      users = users.sort((a,b) => b.FollowerCount - a.FollowerCount).slice(0, 3)

      return res.render('tweets', {user: helpers.getUser(req), tweets: tweets, users: users})
    })
  })
})
app.post('/tweets', authenticated, function (req, res) {
  // console.log('\n\n* 將新增的推播寫入資料庫')
  if(req.body.description.length > 140)
    return res.redirect('/tweets')
  Tweet.create({
    description: req.body.description,
    UserId: helpers.getUser(req).id,
  }).then(() => {
    return res.redirect('/tweets')
  })
})
app.get('/tweets/:tweet_id/replies', authenticated, function (req, res) {
  // console.log('\n\n* 可以在這頁回覆特定的 tweet，並看見 tweet 主人的簡介')
  const UserId = helpers.getUser(req).id
  return Tweet.findByPk(req.params.tweet_id, {include: [
    {model: User, include: [
      Tweet, Reply, Like,
      { model: User, as: 'Followers' },
      { model: User, as: 'Followings' } 
    ]},
    {model: Reply, include: [User]},
    Like,
  ]}).then(tweet => {
    
    tweet = {
      ...tweet.dataValues,
      isLiked: tweet.Likes.map(l => l.UserId).includes(UserId),
      User: {
        ...tweet.User.dataValues,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(tweet.UserId),
      }
    }

    return res.render('replies', {tweet: tweet, user: helpers.getUser(req), selfUser: UserId === tweet.UserId})
  })
})
app.post('/tweets/:tweet_id/replies', authenticated, function (req, res) {
  // console.log('\n\n* 將回覆的內容寫入資料庫')
  Reply.create({
    comment: req.body.comment,
    TweetId: req.params.tweet_id,
    UserId: helpers.getUser(req).id,
  }).then(() => {
    return res.redirect(`/tweets/${req.params.tweet_id}/replies`)
  })
})
app.get('/users/:id/tweets', authenticated, function (req, res) {
  // console.log('\n\n* 看見某一使用者的推播牆，以及該使用者簡介')
  const UserId = helpers.getUser(req).id
  return User.findByPk(req.params.id, {include: [
    { model: Tweet, include: [User, Reply, Like]},
    { model: User, as: 'Followers' },
    { model: User, as: 'Followings' }, 
    Like
  ]}).then(user => {
    
    user = {
      ...user.dataValues,
      isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id),
    }

    user.Tweets = user.Tweets.map(tweet => ({
      ...tweet.dataValues,
      isLiked: tweet.Likes.map(l => l.UserId).includes(UserId),
    }))

    return res.render('users', {profile: user, user: helpers.getUser(req), selfUser: req.params.id == helpers.getUser(req).id})
  })
})
app.get('/users/:id/followings', authenticated, function (req, res) {
  // console.log('\n\n* 看見某一使用者正在關注的使用者')
  return User.findByPk(req.params.id, {include: [
    { model: Tweet },
    { model: User, as: 'Followers', order: 'createdAt asc' },
    { model: User, as: 'Followings', order: 'createdAt asc' }, 
    Like
  ]}).then(user => {
    user = {
      ...user.dataValues,
      isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id),
      Following: user.Followings.map(d => {
        return({
        ...d.dataValues,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(d.id),
      })}).reverse()
    }

    return res.render('following', {profile: user, user: helpers.getUser(req), selfUser: req.params.id == helpers.getUser(req).id})
  })
})
app.get('/users/:id/followers', authenticated, function (req, res) {
  // console.log('\n\n* 看見某一使用者的跟隨者')
  let UserId = helpers.getUser(req).id
  return User.findByPk(req.params.id, {include: [
    { model: Tweet },
    { model: User, as: 'Followers', include: {model: User, as: 'Followers'} },
    { model: User, as: 'Followings' }, 
    Like
  ]}).then(user => {
    user = {
      ...user.dataValues,
      isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id),
      Followers: user.Followers.map(d => ({
        ...d.dataValues,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(d.UserId),
      })).reverse()
    }
    return res.render('follower', {profile: user, user: helpers.getUser(req), selfUser: req.params.id == helpers.getUser(req).id})
  })
})

app.post('/followships', authenticated, function (req, res) {
  // console.log('\n\n* 新增一筆 followship 記錄')
  // console.log('userId => ', helpers.getUser(req).id, ', followingId => ', req.body.id)
  
  if(helpers.getUser(req).id == req.body.id)
    return res.send('error')

  Followship.create({
    followerId: helpers.getUser(req).id,
    followingId: req.body.id,
  }).then(() => {
    return res.redirect('back')
  })
})

app.delete('/followships/:id', authenticated, function (req, res) {
  // console.log('\n\n* 刪除一筆 followship 記錄')
  // console.log('userId => ', helpers.getUser(req).id, ', followingId => ', req.params.id)
  Followship.destroy({where: {
    followerId: helpers.getUser(req).id, 
    followingId: req.params.id
  }}).then((followship) => {
    return res.redirect(`back`)
  })
})

app.get('/users/:id/likes', authenticated, function (req, res) {
  // console.log('\n\n* 看見某一使用者按過 like 的推播')
  let UserId = helpers.getUser(req).id
  return User.findByPk(req.params.id, {include: [
    { model: Tweet },
    { model: User, as: 'Followers' },
    { model: User, as: 'Followings' }, 
    { model: Like, include: {model: Tweet, include: [User, Like, Reply]}}
  ]}).then(user => {

    

    user = {
      ...user.dataValues,
      isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id),
    }

    user.Likes = user.Likes.map(d => ({
      ...d.dataValues,
      Tweet: {
        ...d.Tweet.dataValues,
        isLiked: d.Tweet.Likes.map(l => l.UserId).includes(UserId),
      }
    }))
    return res.render('likes', {user: user, isAuthenticated: req.isAuthenticated, selfUser: req.params.id == helpers.getUser(req).id})
  })
})

app.post('/tweets/:id/like', authenticated, function (req, res) {
  // console.log('\n\n* 新增一筆 like 記錄')
  Like.create({
    UserId: helpers.getUser(req).id,
    TweetId: req.params.id,
  }).then(() => {
    return res.redirect('back')
  })
})
app.post('/tweets/:id/unlike', authenticated, function (req, res) {
  // console.log('\n\n* 刪除一筆 like 記錄')
  Like.destroy({where: {
    UserId: helpers.getUser(req).id, 
    TweetId: req.params.id
  }}).then(() => {
    return res.redirect(`back`)
  })
})
app.get('/users/:id/edit', authenticated, function (req, res) {
  // console.log(`\n\n* ${helpers.getUser(req).id} 編輯 ${req.params.id} 的介紹`)
  if(req.params.id != helpers.getUser(req).id)
    return res.redirect('/tweets')
  return User.findByPk(req.params.id, {include: [
  ]}).then(user => {
    return res.render('profile', {user: user, isAuthenticated: req.isAuthenticated,})
  })
})
app.post('/users/:id/edit', authenticated, function (req, res) {
  // console.log('\n\n* 更新自己的介紹')

  return User.findByPk(req.params.id)
    .then((user) => {
      user.update({
        name: req.body.name,
        introduction: req.body.introduction,
      })
      .then(() => {
        res.redirect(`/users/${req.params.id}/edit`)
      })
    })
})

app.get('/admin/tweets', authenticated, function (req, res) {
  // console.log('\n\n* 看見站內所有的推播（設為後台首頁）')

  if(helpers.getUser(req).role !== 'admin')
    return res.redirect('/tweets')

  return Tweet.findAll({include: [User, Reply, Like]}).then(tweets => {
    tweets = tweets.map(tweet => ({
      ...tweet.dataValues,
    }))
    return res.render('admin/tweets', {user: helpers.getUser(req), tweets: tweets})
  })
})
app.delete('/admin/tweets/:id', authenticated, function (req, res) {
  // console.log('\n\n* 刪除其他使用者的推文')

  if(helpers.getUser(req).role !== 'admin')
    return res.redirect('/tweets')

  return Tweet.findByPk(req.params.id)
    .then((tweet) => {
      tweet.destroy()
        .then((tweet) => {
          return res.redirect('back')
        })
    })
})

app.get('/admin/users', authenticated, function (req, res) {
  // console.log('\n\n* 看見站內所有的使用者')

  if(helpers.getUser(req).role !== 'admin')
    return res.redirect('/tweets')

  return User.findAll({include: [
    { model: Tweet },
    { model: User, as: 'Followers' },
    { model: User, as: 'Followings' }, 
    { model: Like, include: {model: Tweet, include: [User, Like, Reply]}}
  ]}).then(users => {
    return res.render('admin/users', {user: helpers.getUser(req), users: users})
  })
})

app.get('/signin', (req, res) => res.render('signin'))
app.post('/signin',
  passport.authenticate('local', { failureRedirect: '/signin', failureFlash: true }),
  (req, res) => {
    res.redirect('/tweets')
  }
)

app.get('/signup', (req, res) => {
  return res.render('signup')
})
app.post('/signup', (req, res) => {
  User.create({
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10), null),
    name: req.body.name,
  }).then(user => {
    return res.redirect('/signin')
  })
})
app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/signin')
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

module.exports = app
