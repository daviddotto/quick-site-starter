// Core dependencies
const crypto = require('crypto')
const path = require('path')

// NPM dependencies
const bodyParser = require('body-parser')
const browserSync = require('browser-sync')
const dotenv = require('dotenv')
const express = require('express')
const nunjucks = require('nunjucks')
const session = require('express-session')
const cookieParser = require('cookie-parser')

// Run before other code to make sure variables from .env are available
dotenv.config()

// Local dependencies
const config = require('./app/config.js')
const packageJson = require('./package.json')
const routes = require('./app/routes.js')
const utils = require('./lib/utils.js')

const app = express()

// Set up configuration variables
var env = process.env.NODE_ENV || 'development'
var useAutoStoreData = process.env.USE_AUTO_STORE_DATA || config.useAutoStoreData
var useHttps = process.env.USE_HTTPS || config.useHttps
var useBrowserSync = config.useBrowserSync

env = env.toLowerCase()
useHttps = useHttps.toLowerCase()
useBrowserSync = useBrowserSync.toLowerCase()

var useDocumentation = (config.useDocumentation === 'true')

// Force HTTPS on production. Do this before using basicAuth to avoid
// asking for username/password twice (for `http`, then `https`).
var isSecure = (env === 'production' && useHttps === 'true')
if (isSecure) {
  app.use(utils.forceHttps)
  app.set('trust proxy', 1) // needed for secure cookies on heroku
}

// Set up App
var appViews = [
  path.join(__dirname, '/app/views/'),
  path.join(__dirname, '/lib/')
]

var nunjucksAppEnv = nunjucks.configure(appViews, {
  autoescape: true,
  express: app,
  noCache: true,
  watch: true
})

// Add Nunjucks filters
utils.addNunjucksFilters(nunjucksAppEnv)

// Set views engine
app.set('view engine', 'html')

// Middleware to serve static assets
app.use('/public', express.static(path.join(__dirname, '/public')))
app.use('/assets', express.static(path.join(__dirname, 'node_modules', 'govuk-frontend', 'assets')))

// Support for parsing data in POSTs
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))

// Add global variable to determine if DoNotTrack is enabled.
// This indicates a user has explicitly opted-out of tracking.
// Therefore we can avoid injecting third-party scripts that do not respect this decision.
app.use(function (req, res, next) {
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/DNT
  res.locals.doNotTrackEnabled = (req.header('DNT') === '1')
  next()
})

// Add variables that are available in all views
app.locals.asset_path = '/public/'
app.locals.useAutoStoreData = (useAutoStoreData === 'true')
app.locals.siteName = config.siteName

// Support session data
app.use(session({
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 hours
    secure: isSecure
  },
  // use random name to avoid clashes with other prototypes
  name: crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  secret: crypto.randomBytes(64).toString('hex')
}))

// Automatically store all data users enter
if (useAutoStoreData === 'true') {
  app.use(utils.autoStoreData)
  utils.addCheckedFunction(nunjucksAppEnv)
}

// Clear all data in session if you open /prototype-admin/clear-data
app.get('/admin/clear-data', function (req, res) {
  req.session.destroy()
  res.render('admin/clear-data')
})

// Load routes (found in app/routes.js)
if (typeof (routes) !== 'function') {
  console.log(routes.bind)
  routes.bind(app)
} else {
  app.use('/', routes)
}

// Strip .html and .htm if provided
app.get(/\.html?$/i, function (req, res) {
  var path = req.path
  var parts = path.split('.')
  parts.pop()
  path = parts.join('.')
  res.redirect(path)
})

// Auto render any view that exists

// App folder routes get priority
app.get(/^([^.]+)$/, function (req, res, next) {
  utils.matchRoutes(req, res, next)
})

// Redirect all POSTs to GETs - this allows users to use POST for autoStoreData
app.post(/^\/([^.]+)$/, function (req, res) {
  res.redirect('/' + req.params[0])
})

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error(`Page not found: ${req.path}`)
  err.status = 404
  next(err)
})

// Display error
app.use(function (err, req, res, next) {
  console.error(err.message)
  res.status(err.status || 500)
  res.send(err.message)
})

// Find a free port and start the server
utils.findAvailablePort(app, function (port) {
  console.log('Listening on port ' + port + '   url: http://localhost:' + port)
  if (env === 'production' || useBrowserSync === 'false') {
    app.listen(port)
  } else {
    app.listen(port - 50, function () {
      browserSync({
        proxy: 'localhost:' + (port - 50),
        port: port,
        ui: false,
        files: ['public/**/*.*', 'app/views/**/*.*'],
        ghostmode: false,
        open: false,
        notify: false,
        logLevel: 'error'
      })
    })
  }
})

module.exports = app
