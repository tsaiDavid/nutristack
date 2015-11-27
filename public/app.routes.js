(function() {
  'use strict';

  angular.module('app')
  .config(config);

  // upon document load, enable mobile sidenav; setting to close on click
  $('.button-collapse').sideNav({closeOnClick: true});

  config.$inject = ['$stateProvider', '$urlRouterProvider'];

  function config($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/home');

    $stateProvider
      .state('home', {
        url: '/home',
        templateUrl: 'home/home.html',
        controller: 'HomeCtrl',
      })
      .state('add', {
        url: '/stacks/add',
        templateUrl: 'add/add.html',
        controller: 'AddCtrl',
      })
      .state('stacks', {
        url: '/stacks',
        templateUrl: 'stacks/stacks.html',
        controller: 'StackCtrl',
      })
      .state('stacks.list', {
        url: '/:username',
        templateUrl: 'stacks/stacks.stackslist.html',
        controller: 'StackCtrl',
      })
      .state('uniqueStack', {
        url: '/stacks/:username/:title',
        templateUrl: 'uniqueStack/uniqueStack.html',
        controller: 'UniqueStackCtrl',
      });
  }
})();
