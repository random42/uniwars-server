const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const users = require('./routes/user');
const unis = require('./routes/uni');
const teams = require('./routes/team');
const chat = require('./routes/chat');
const db = require('./db');
const bcrypt = require('bcrypt')
const security = require('./utils/security');
const cors = require('cors');

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(cors({ origin: '*' }));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Origin");
  res.header("Access-Control-Allow-Methods","PUT, POST, GET, DELETE, OPTIONS")
  next();
});

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.raw({type: 'application/octet-stream'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// checks user token given at login time for every request
app.use(security.checkLoginToken);

//app.use('/',index);
app.use('/user',users);
//app.use('/game',game);
app.use('/chat',chat);
app.use('/uni',unis);
app.use('/team',security.checkTeamAdmin,teams);

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
