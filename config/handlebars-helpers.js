const handlebars = require('express-handlebars')
const moment = require('moment')

module.exports = {
  equals: function(a, b, options){
    if(a == b) {
      return options.fn(this);
    }
    return options.inverse(this);
  },
  fromNow: function(a){
    return moment(a).fromNow();
  }
}