#!/usr/bin/env node
var fs          = require('fs');
var config      = require('./config.js');
var cli         = require('cli');
var prompt      = require('prompt');
var ntnu        = require('./drivers/ntnu.js');
var itslearning = require('./itslearning.js');
var Table       = require('cli-table');

cli.setApp('its', '0.0.1');

cli.parse({
    setup        : ['s', 'Setup credentials and driver.'],
    notifications: ['l', 'List all your courses.'],
    inbox        : ['i', 'List messages in your inbox.'],
    dashboard    : ['d', 'Spit out a summary of everything']
});

var setup = function () {
    var configuration = new config();
    
    var setupSchema = {
        properties: {
            username: {
                description: 'It\'sLearning username',
                required: true
            },

            password: {
                description: 'It\'sLearning password',
                hidden: true
            },

            driver: {
                description: 'Authentication driver',
                required: true,
                conform: function (file) {
                    return fs.existsSync(__dirname + '/drivers/'+ file +'.js');
                }
            },
        }
    };

    cli.info (
        'This will overwrite any previously stored credentials' +
        'stored in ~/.itsconfig (home-directory).'
    );

    prompt.start();
    prompt.get(setupSchema, function (err, answers) {
        if (!err) {
            configuration.set(answers);
            configuration.save();
            cli.ok('Configuration stored.');
        }
    });
}


cli.main(function (args, options) {

    /**
     * Run setup
     */
     var configuration = new config;
     configuration.load();
     if (options.setup/* || configuration.missing*/) {
         setup();
     }

    /**
     * Initiate the itslearning-client
     */
     var client = new itslearning();
     client.setCredentials(
         configuration.getField('username'),
         configuration.getField('password')
     );

    /**
     * Initiate the authentication driver
     */
     client.setAuthenticationDriver(
         require('./drivers/'+ configuration.getField('driver') +'.js')
     );

    /**
     * Authenticate with the client & fetch data
     */
     client.authenticate(function () {
         client.fetchUnreadMessages();
         client.fetchNotifications();
     });

     /**
      * List messages in inbox
      */
      if (options.inbox) {

          var table = new Table({
              head: ['Date', 'From', 'Subject'],
              style: {
                  compact: true,
                  'padding-left': 1
              }
          });

          setTimeout(function () {
              client.getUnreadMessages().forEach(function (message) {
                  table.push([message.date, message.from, message.subject]);
              });

              console.log(table.toString());
          }, 3500);

      }
});
