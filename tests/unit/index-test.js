'use strict';

var CoreObject = require('core-object');
var RSVP       = require('rsvp');
var assert     = require('../helpers/assert');

var stubProject = {
  name: function(){
    return 'my-project';
  }
};



describe('new-relic-sourcemap plugin', function() {
  var subject, mockUi, MockNR, NROptions, initOptions, plugin, context;

  var DIST_DIR = 'tmp/dist';
  var DEFAULT_PREFIX = 'https://www.cloud-place.com/';
  var DEFAULT_APP_ID = '1234';
  var DEFAULT_NR_KEY = '5678';
  var DEFAULT_MAP_PATTERN = '**/*.js.map';

  before(function() {
    subject = require('../../index'); // eslint-disable-line global-require
  });

  beforeEach(function() {
    function nrStub(returnValue) {
      return function(options) {
        NROptions = options;
        return RSVP.resolve(returnValue);
      };
    }

    mockUi = {
      verbose: true,
      messages: [],
      write: function() { },
      writeLine: function(message) {
        this.messages.push(message);
      }
    };

    MockNR = CoreObject.extend({
      init: function(options) {
        this._super();
        initOptions = options;
      },
      publishSourcemaps: nrStub()
    });

    plugin = subject.createDeployPlugin({
      name: 'new-relic-sourcemap',
      NewRelic: MockNR
    });

    context = {
      ui: mockUi,
      project: stubProject,
      commandOptions: {},
      distDir: DIST_DIR,

      config: {
        'new-relic-sourcemap': {
          prefix: DEFAULT_PREFIX,
          applicationId: DEFAULT_APP_ID,
          nrAdminKey: DEFAULT_NR_KEY
        }
      }
    };
  });

  it('has a name', function() {
    assert.equal(plugin.name, 'new-relic-sourcemap');
  });

  describe('hooks', function() {
    beforeEach(function() {
      plugin.beforeHook(context);
      plugin.configure(context);
    });

    it('implements the correct hooks', function() {
      assert.ok(plugin.upload);
    });

    describe('#upload', function() {
      it('passes the correct options to the New Relic abstraction', function() {
        var promise = plugin.upload(context);

        return assert.isFulfilled(promise)
          .then(function() {
            assert.deepEqual(initOptions, {
              plugin: plugin,
              applicationId: DEFAULT_APP_ID,
              prefix: DEFAULT_PREFIX,
              nrAdminKey: DEFAULT_NR_KEY
            });

            assert.deepEqual(NROptions, {
              sourceMapPattern: DEFAULT_MAP_PATTERN,
              distDir: DIST_DIR
            });
          });
      });

      it('supports alternative source map patterns if provided', function() {
        context.config['new-relic-sourcemap'].sourceMapPattern = '**/*.map';

        var promise = plugin.upload(context);

        return assert.isFulfilled(promise)
          .then(function() {
            assert.equal(NROptions.sourceMapPattern, '**/*.map');
          });
      });
    });
  });
});
