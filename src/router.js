var _ = window._;
var Aviator = window.Aviator;

var createRouter = function() {

  // Helper functions to translate an array of routes
  // ex: ['/items', '/items/:id']
  // to an Aviator routing table
  // ex: {'/items': {target: app.actions, '/': '_updateRoute', '/:id': '_updateRoute'}}
  function slugsFromRoute(route) {
    if (route === '/') {
      return [route];
    }

    var slugs = route.split('/');
    slugs = _.filter(slugs);
    slugs = _.map(slugs, function(slug) { return '/' + slug; });
    return slugs;
  }

  function addSlugsToRoutingTable(table, slugs, options) {
    var target = options.target;
    var handler = options.handler;

    var child = table;
    _.forEach(slugs, function(slug, index) {
      var existingChild = child[slug];

      if (index === 0 && !existingChild) {
        child = child[slug] = {
           target: target,
           '/': handler
        };
        return;
      }

      if (index === slugs.length - 1) {
        child[slug] = handler;
        return;
      }

      if (typeof existingChild === 'object') {
        child = child[slug];
        return;
      }

      child = child[slug] = {
        target: target,
        '/': handler
      };
      return;
    });

    return table;
  }

  function routingTableFromRoutes(routes, options) {
    return _.reduce(routes, function(acc, route) {
      var slugs = slugsFromRoute(route);
        return addSlugsToRoutingTable(acc, slugs, options);
      }, {});
  }

  // Helper functions to translate Aviator Request objects
  // to simpler "Express-like" route objects

  /* FROM:
  {
    "namedParams": {"id": "123"},
    "queryParams": {"sort": "descending"},
    "params": {"id": "123", "sort": "descending"},
    "uri": "/data/123",
    "queryString": "?sort=descending",
    "matchedRoute": "/data/:id"
  }*/

  /*TO:
  {
    "path": "/data/:id",
    "params": {"id": "123"},
    "query": {"sort": "descending"}
  }
  */
  function routeFromAviatorRequest(req) {
    return {
      path: req.matchedRoute,
      params: req.namedParams,
      query: req.queryParams
    };
  }

  // Actual router object
  var router = {
    setRoutes: function(routes) {
      var self = this;

      Aviator.pushStateEnabled = false;

      var routingTable = routingTableFromRoutes(routes, {
        target: self,
        handler: 'onUriChange'
      });
      Aviator.setRoutes(routingTable);
    },

    setHandler: function(handler) {
      if (typeof handler !== 'function') {
        throw new Error('onRouteChange handler must be a function');
      }
      this.onRouteChange = handler;
    },

    onRouteChange: _.noop,

    onUriChange: function(req) {
      var route = routeFromAviatorRequest(req);
      this.onRouteChange(route);
    },

    start: function() {
      Aviator.dispatch();
    },

    // Usage:
    // buildUri('/data/:id', {params: {id: '123'}, query: {sort: 'descending'}})
    // or
    // buildUri('/data/123?sort=descending')
    buildUri: function(pattern, options) {
      var _navigator = Aviator._navigator;
      options = options || {};
      var uri = pattern;

      var params = options.params;
      var query = options.query;

      if (params) {
        for (var p in params) {
          if (params.hasOwnProperty(p)) {
            uri = uri.replace(':' + p, encodeURIComponent(params[p]));
          }
        }
      }

      if (query) {
        uri += _navigator.serializeQueryParams(query);
      }

      return uri;
    },

    getRouteForUri: function(uri) {
      var _navigator = Aviator._navigator;

      var queryString = uri.split('?')[1];
      if (queryString) {
        queryString = '?' + queryString;
        uri = uri.replace(queryString, '');
      }
      else {
        queryString = null;
      }

      var route = _navigator.createRouteForURI(uri);
      route = _navigator.createRequest(uri, queryString, route.matchedRoute);

      route = routeFromAviatorRequest(route);

      return route;
    },

    updateBrowserUri: function(uri) {
      Aviator.navigate(uri, {silent: true});
    },

    getUriForRoute: function(route) {
      var uri = router.buildUri(route.path, {
        params: route.params,
        query: route.query
      });
      return uri;
    },

    updateRouteQuery: function(route, query) {
      route = _.cloneDeep(route);
      route.query = _.assign(route.query, query);
      return route;
    }
  };

  return router;
};

module.exports = createRouter;
