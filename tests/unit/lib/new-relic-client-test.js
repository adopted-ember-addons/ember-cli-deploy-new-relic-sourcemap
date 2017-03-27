var assert = require('./../../helpers/assert');
var path = require('path');

describe('NewRelicClient', function() {
  var NewRelic, publishParams, mockUI, plugin, subject;

  var DIST_DIR = 'tests/fixtures/';
  var DEFAULT_PREFIX = 'https://www.cloud-place.com/';
  var DEFAULT_APP_ID = '1234';
  var DEFAULT_NR_KEY = '5678';
  var DEFAULT_MAP_PATTERN = '**/*.js.map';
  var FIXTURES_PATH = path.join(process.cwd(), 'tests/fixtures');

  before(function() {
    NewRelic = require('../../../lib/new-relic-client'); // eslint-disable-line global-require
  });

  beforeEach(function() {
    nrClient = {
      publishSourcemap: function(params, cb) {
        publishParams = params;
        cb();
      }
    };

    mockUi = {
      messages: [],
      write: function() {},
      writeLine: function(message) {
        this.messages.push(message);
      }
    };

    plugin = {
      ui: mockUi,
      log: function(message) {
        this.ui.write('|    ');
        this.ui.writeLine('- ' + message);
      }
    };

    subject = new NewRelic({
      plugin: plugin,
      _nrClient: nrClient,
      applicationId: DEFAULT_APP_ID,
      nrAdminKey: DEFAULT_NR_KEY,
      prefix: DEFAULT_PREFIX
    });
  });

  describe('#logSuccessfulPublish', function() {
    it('logs the map and asset paths', function() {
      subject.logSuccessfulPublish({
        asset: 'http://www.hello.com/index.js',
        map: 'index.map',
        wasUploaded: true
      });

      assert.equal(mockUi.messages.length, 1, 'Logs one line');
      assert.equal(
        mockUi.messages[0],
        '- ✔  Published Map: `index.map` for `http://www.hello.com/index.js`'
      );
    });

    it('alternative logs for non-uploaded assets', function() {
      subject.logSuccessfulPublish({
        asset: 'http://www.hello.com/index.js',
        map: 'index.map',
        wasUploaded: false
      });

      assert.equal(mockUi.messages.length, 1, 'Logs one line');
      assert.equal(
        mockUi.messages[0],
        '- ✔  Published Map: `index.map` for `http://www.hello.com/index.js` (Using previously published version)'
      );
    });
  });

  describe('#getMatchingAssetForMap', function() {
    var distDir;

    beforeEach(function() {
      distDir = path.join(FIXTURES_PATH, 'test-1-dist');
    });

    it('finds a similarly named non-fingerprinted asset', function() {
      var result = subject.getMatchingAssetForMap(distDir, 'file-a.map');

      assert.equal(result, 'file-a.js');
    });

    it('finds a similarly named fingerprinted asset', function() {
      var result = subject.getMatchingAssetForMap(distDir, 'file-b.map');

      assert.equal(result, 'file-b-s8d7asfdb983.js');
    });

    it('finds a similarly named asset in a nested folder', function() {
      var result = subject.getMatchingAssetForMap(distDir, 'assets/file-c.map');

      assert.equal(result, 'assets/file-c.js');
    });

    it('finds similarly named files if map contains asset extension', function() {
      var result = subject.getMatchingAssetForMap(distDir, 'file-d.js.map');

      assert.equal(result, 'file-d.js');
    });

    it('throws an error on an ambiguous asset name', function() {
      assert.throws(function() {
        subject.getMatchingAssetForMap(distDir, 'ambiguous.map');
      }, /The asset for the map `ambiguous.map` could not be matched because there were multiple/);
    });

    it('throws an error on no matching assets', function() {
      assert.throws(function() {
        subject.getMatchingAssetForMap(distDir, 'all-alone.map');
      }, /The asset for the map `all-alone.map` could not be found/);
    });

    it('supports files that have the same prefix', function() {
      var resultA = subject.getMatchingAssetForMap(distDir, 'test-a.map');
      var resultB = subject.getMatchingAssetForMap(distDir, 'test-a-b.map');

      assert.equal(resultA, 'test-a-asd89b987a.js');
      assert.equal(resultB, 'test-a-b-lkj5443oi.js');
    });
  });

  describe('#getMatchingAssetsAndMaps', function() {
    var distDir;

    beforeEach(function() {
      distDir = path.join(FIXTURES_PATH, 'test-2-dist');
    });

    it('finds all the maps and assets in a directory given a map glob pattern', function() {
      var result = subject.getMatchingAssetsAndMaps(distDir, '**/*.map');

      assert.deepEqual(result, [
        { asset: 'assets/file-c.js', map: 'assets/file-c.map' },
        { asset: 'file-a.js', map: 'file-a.map' },
        { asset: 'file-b-s8d7asfdb983.js', map: 'file-b.map' },
      ]);
    });
  });

  describe('#publishSourcemap', function() {
    it('will publish sourcemap with provided config', function() {
      var promise = subject.publishSourcemap('test-dir', 'test-a.js', 'test-a.map');

      return assert.isFulfilled(promise)
        .then(function(result) {
          assert.deepEqual(publishParams, {
            sourcemapPath: 'test-dir/test-a.map',
            javascriptUrl: DEFAULT_PREFIX + 'test-a.js',
            applicationId: DEFAULT_APP_ID,
            nrAdminKey: DEFAULT_NR_KEY
          });

          assert.deepEqual(result, {
            asset: DEFAULT_PREFIX + 'test-a.js',
            map: 'test-dir/test-a.map',
            wasUploaded: true
          });
        });
    });

    it('will handle an already published source map (Conflict exception)', function() {
      nrClient.publishSourcemap = function(params, cb) {
        cb(new Error('Conflict'));
      };

      var promise = subject.publishSourcemap('test-dir', 'test-a.js', 'test-a.map');

      return assert.isFulfilled(promise)
        .then(function(result) {
          assert.deepEqual(result, {
            asset: DEFAULT_PREFIX + 'test-a.js',
            map: 'test-dir/test-a.map',
            wasUploaded: false
          });
        });
    });

    it('will reject on other unknown errors', function() {
      nrClient.publishSourcemap = function(params, cb) {
        cb(new Error('Some other error'));
      };

      var promise = subject.publishSourcemap('test-dir', 'test-a.js', 'test-a.map');

      return assert.isRejected(promise);
    });
  });

  describe('#publishSourcemaps', function() {
    var distDir;

    beforeEach(function() {
      distDir = path.join(FIXTURES_PATH, 'test-2-dist');
    });

    it('will publish all matching sourcemaps', function() {
      var promise = subject.publishSourcemaps({
        sourceMapPattern: '**/*.map',
        distDir: distDir
      });

      return assert.isFulfilled(promise)
        .then(function(result) {
          assert.equal(mockUi.messages.length, 3, 'message logged for each file');

          assert.deepEqual(result, [
            {
              asset: DEFAULT_PREFIX + 'assets/file-c.js',
              map: path.join(distDir, 'assets/file-c.map'),
              wasUploaded: true
            },
            {
              asset: DEFAULT_PREFIX + 'file-a.js',
              map: path.join(distDir, 'file-a.map'),
              wasUploaded: true
            },
            {
              asset: DEFAULT_PREFIX + 'file-b-s8d7asfdb983.js',
              map: path.join(distDir, 'file-b.map'),
              wasUploaded: true
            }
          ]);
        });
    });
  });
});
