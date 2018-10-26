const debug = require('debug')('app')
import express from 'express'
import path from 'path'
import favicon from 'serve-favicon'
import logger from 'morgan'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import users from './routes/user'
import unis from './routes/uni'
import teams from './routes/team'
import chat from './routes/chat'
import {security, db} from './utils'
import cors from 'cors'
require('./socket/init')

let app = express()


// cross origins middlewares
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
app.use(security.checkAccessToken);
app.use('/team', security.checkTeamAdmin);
// async handler
app.use((req, res, next) => {
  if (next.constructor.name === 'AsyncFunction') {
    next().catch((err) => {
      debug(err.message);
      res.sendStatus(500);
    })
  } else {
    next()
  }
})
// routes
app.use('/user',users);
app.use('/chat',chat);
app.use('/uni',unis);
app.use('/team', teams);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  req.status = 404;
  next(err);
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


export default app;
