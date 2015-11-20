import Ember from 'ember';

/**
 * An implementation detail of testing the prefetch initializer.
 *
 * @mixin RouteMixin
 */
export default Ember.Mixin.create({
  /**
    Returns a promise that resolves the prefetched data of a parent
    (or any ancestor) route in a route hierarchy.  During a transition,
    all routes have the opportunity to prefetch data, and if a route needs
    access to a parent route's prefetched data, it can call
    `this.prefetched(theNameOfParentRoute)` to retrieve a promise that
    resolves with it.

    Example

    ```javascript
    App.Router.map(function() {
      this.route('post', { path: '/post/:post_id' }, function() {
        this.route('comments', { resetNamespace: true });
      });
    });

    App.CommentsRoute = Ember.Route.extend({
      async prefetch(params) {
        return this.store.findRecord('user', (await this.prefetched('post')).author.id);
      },

      model(params) {
        return Ember.RSVP.hash({
          postAuthor: this.prefetched(),
          comments: this.store.findAll('comment')
        });
      }
    });
    ```

    @method prefetched
    @param {String} [name] - The name of the route. Defaults to the current route if no name is given.
    @return {Promise} A promise that resolves with the prefetched data.
    @public
  */
  initPrefetched: Ember.on('init', function() {
    const self = this;

    Object.defineProperty(self, 'prefetched', {
      get() {
        function prefetched(name) {
          if (arguments.length < 1) {
            name = self.routeName;
          }
          const route = self.container.lookup(`route:${name}`);
          return Ember.RSVP.Promise.resolve(route && route._prefetched);
        }

        // For prefetched-as-property backward compatibility
        const _prefetched = this._prefetched;
        for (let key in _prefetched) {
          if (key !== 'constructor') {
            Object.defineProperty(prefetched, key, {
              get() {
                let value = _prefetched[key];

                if (typeof value === 'function') {
                  return function() {
                    return value.apply(_prefetched, arguments);
                  };
                } else {
                  return value;
                }
              },
              set(value) {
                _prefetched[key] = value;
              },
            });
          }
        }

        return prefetched;
      }
    });
  }),

  model(params, transition) {
    const prefetched = this._prefetched;

    if (prefetched && !prefetched._prefetchReturnedUndefined) {
      return prefetched;
    }

    return this._super(params, transition);
  },
});
