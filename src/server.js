#!/usr/bin/env node

/**
 * Module dependencies.
 */

import "@babel/polyfill"

import app from './app'
import {db} from './utils'
const debug = require('debug')('uniwars:server')
import http from 'http'


/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Create server socket
 */

import {server as socket} from './socket'

/**
 * Listen on provided port, on all network interfaces and connect to database
 */

//db.db.then(() => {
  console.log('Database connected');
  server.listen(port);
  console.log('Server listening on port',port)
  server.on('error', onError);
  server.on('listening', onListening);
  socket.attach(server, {
   pingInterval: 10000,
   pingTimeout: 5000,
   cookie: false
  });
  console.log('Socket server running');
// }).catch((err) => {
//   console.log(err);
//   console.log('Error connecting to database.')
//   process.exit(1);
// })

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
