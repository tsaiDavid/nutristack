var express = require('express');
var db = require('./db');
var path = require('path');
var bodyParser = require('body-parser');
var Sequelize = require('sequelize');
var _ = require('lodash');

var app = express();

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '/../public')));

// ** GET Methods **
// ____

// ** /api/users ** [GET]
app.get('/api/users/', function(req, res) {
  // If a ** username ** query string is provided, return user data as JSON
  if (req.query.username) {
    return db.User
      .findOne({
        where: {username: req.query.username},
      })
      .then(function(user) {
        res.json(user);
      });

  // If a ** user_id ** query string is provided, return user data as JSON
  } else if (req.query.user_id) {
    return db.User
      .findOne({
        where: {id: req.query.user_id},
      })
      .then(function(user) {
        res.json(user);
      });

  // Basic GET requests will return all users as an array
  } else {
    return db.User
      .findAll({})
      .then(function(users) {
        return Sequelize.Promise.map(users, function(user) {
          return user.dataValues;
        });
      })
      .then(function(usersArray) {
        res.json(usersArray);
      })
      .catch(function(err) {
        console.err(err);
      });
  }
});

// ____

// ** /api/users/:user_id/stacks ** [GET]
//
// Get all stacks associated with a specific user
app.get('/api/users/:user_id/stacks', function(req, res) {
  // Use Sequelize to retrieve a user matching the **user_id** URL param
  return db.User
    .findOne({
      where: {id: req.params.user_id},
    })
    .then(function(user) {
      // Error handling for user that isn't found
      if (!user) {
        return res.sendStatus(404).end();
      } else {
        return db.Stack.findAll({
          where: {UserId: req.params.user_id},
        });
      }
    })
    .then(function(stacks) {
      // Use Sequelize's built in promise library (bluebird)
      return Sequelize.Promise.map(stacks, function(stack) {
        return stack.get('title');
      });
    })

    // Return an array of all the stacks' titles
    .then(function(titleArray) {
      res.json(titleArray);
    })
    .catch(function(err) {
      console.err(err);
    });

});

// ____

// ** /api/users/:user_id/stacks/:title ** [GET]
//
// Get a single user's specific stack
app.get('/api/users/:user_id/stacks/:title', function(req, res) {
  // Retrieve stack that contains **user_id** and **title** URL param
  return db.Stack
    .findOne({
      where: {
        UserId: req.params.user_id,
        title: req.params.title,
      },
    })
    .then(function(stack) {
      // Error handling for stack not being found
      if (!stack) {
        res.sendStatus(404).end();
      } else {
        // after receiving the stack, you'll want to send to client
        res.json(stack.dataValues);
      }
    });

});

// ____

// ** /api/users/:user_id/stacks/:title/supplements ** [GET]
//
// Get all supplements in a specific user stack
app.get('/api/users/:user_id/stacks/:title/supplements', function(req, res) {

  return db.Stack
    .findOne({
      where: {title: req.params.title},
    })
    .then(function(stack) {
      return stack.getSupplements();
    })
    .then(function(supps) {
      res.send(supps);
    })
    .then(function(array) {
      res.json(array);
    });

});

// ** POST Methods **
// ____

// ** /api/users ** [POST]
//
// Create a new user
app.post('/api/users', function(req, res) {
  return db.User
    .findOrCreate({
      where: {username: req.body.username},
    })
    .spread(function(user) {
      res.sendStatus(201).end();
    });
});

// ____

// ** /api/users/:user_id/stacks ** [POST]
//
// Create a new unique stack for a specific user
app.post('/api/users/:user_id/stacks', function(req, res) {
  return db.User

    // Prevent duplicate user creation, return user
    .findOrCreate({
      where: {username: req.body.username},
    })

    // Use of 'spread' in place of 'then' for findOrCreate compatability
    .spread(function(user) {
      return db.Stack.create({
        title: req.body.stacktitle,
        UserId: user.get('id'),
      });
    })
    .then(function() {
      // Send 201 - successful creation
      res.sendStatus(201).end();
    })
    .catch(function(err) {
      console.err(err);
    });

});

// ____

// ** /api/users/:user_id/stacks/:title ** [POST]
//
// Add supplements to a user's stack
app.post('/api/users/:user_id/stacks/:title', function(req, res) {
  // Find stack matching the **title** URL param
  return db.Stack
    .findOrCreate({
      where: {title: req.params.title},
    })

    // Using 'spread' method for compatability with Sequelize findOrCreate
    .spread(function(stack) {
      // Create the supplement
      return db.Supplement
        .create({
          name: req.body.name,
          qty: req.body.qty,
          dosage: req.body.dosage,
        })

        // Then, associate the supplement to the stacks table
        .then(function(supplement) {
          supplement.addStacks([stack.get('id')]);

          // Send 201 - successful creation
          res.status(201).json();
        });
    })
    .catch(function(err) {
      console.err(err);
    });

  res.end();
});

// ** DELETE Methods **
// ____

// ** /api/users/:user_id/stacks/:title/supplements ** [DELETE]
//
// Delete supplements in a user specific stack
app.delete('/api/users/:user_id/stacks/:title/supplements', function(req, res) {
  // Delete all supplements in stack if no specific one was specified
  console.log('No specific supplement was specified - deleting all.');
  return db.Stack

    // Find the user stack based on **user_id** and **title** URL params
    .findOne({
      where: {
        UserId: req.params.user_id,
        title: req.params.title,
      },
    })
    .then(function(stack) {
      // If query object is 0, then return all supplements for deletion
      if (_.size(req.query) === 0) {
        return stack.getSupplements();

      // Otherwise, get the supplement with the matching identifier
      } else if (_.size(req.query) === 1) {
        return stack.getSupplements({
          where: {id: req.query.id},
        });
      }
    })
    .then(function(supplements) {
      console.log('Here are the supplements: ', supplements);

      // After getting the supplements, we iterate and delete each
      Sequelize.Promise.each(supplements, function(supplement) {
        supplement.destroy();
      });
    })
    .then(function() {
      // Send a "No Content" message
      res.sendStatus(204).end();
    });
});

// ** /api/stack/:title ** [DELETE]
//
// Delete supplements in a user specific stack
app.delete('/api/stack/:title', function(req, res) {
  return db.Stack
    .findOne({
      where: {title: req.params.title},
    })
    .then(function(stack) {
      stack.destroy();
      res.end;
    })
    .catch(function(err) {
      console.err(err);
    });

});

module.exports = app;
