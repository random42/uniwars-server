const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const index = require('./routes/index');
const users = require('./routes/users');
const game = require('./routes/game');
const unis = require('./routes/unis');
const teams = require('./routes/teams');
const chat = require('./routes/chat');
const db = require('./db');
const bcrypt = require('bcrypt')
const security = require('./utils/security');

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.raw({type: 'application/octet-stream'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(security.checkLoginToken);

app.use('/',index);
app.use('/users',users);
app.use('/game',game);
app.use('/chat',chat);
app.use('/unis',unis);
app.use('/teams',security.checkTeamAdmin,teams);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;
