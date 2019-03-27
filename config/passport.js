const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt-nodejs')
const db = require('../models')
const User = db.User

passport.use(new LocalStrategy({
  passReqToCallback: true,
  usernameField: 'email',
  passwordField: 'password'
},
  (req, username, password, cb) => {
    User.findOne({where: {email: username}}).then(user => {
      if (!user) return cb(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！'))
      if (!bcrypt.compareSync(password, user.password)) return cb(null, false, req.flash('error_messages', '帳號或密碼輸入錯誤！'))

      return cb(null, user)
    })
  }
))

passport.serializeUser((user, cb) => {
  return cb(null, user.id)
})

passport.deserializeUser((id, cb) => {
  User.findByPk(id, {
      include: [
        { model: db.Reply },
        { model: db.Tweet },
        { model: db.Like },
        { model: User, as: 'Follower' },
        { model: User, as: 'Following' }
      ]
    }).then(user => {
    return cb(null, user)
  })
})

module.exports = passport