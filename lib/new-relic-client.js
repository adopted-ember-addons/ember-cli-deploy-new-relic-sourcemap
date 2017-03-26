var nrClient    = require('@newrelic/publish-sourcemap');
var CoreObject  = require('core-object');
var RSVP        = require('rsvp');
var urljoin     = require('url-join');
var path        = require('path');
var glob        = require('glob');

function absoluteBaseName(fileName) {
  var ext;

  while (ext = path.extname(fileName)) {
    fileName = path.basename(fileName, ext);
  }

  return fileName;
}

module.exports = CoreObject.extend({
  init: function(options) {
    this._super();

    this._client = options._nrClient || nrClient;
    this._plugin = options.plugin;

    this.applicationId = options.applicationId;
    this.nrAdminKey = options.nrAdminKey;
    this.prefix = options.prefix;
  },

  publishSourceMaps: function(options) {
    var sourceMapPattern = options.sourceMapPattern;
    var distDir = options.distDir;

    var matchingFilePairs = this.getMatchingAssetsAndMaps(distDir, sourceMapPattern);
    var client = this;

    var allUploads = matchingFilePairs.map(function(pair) {
      var asset = pair.asset;
      var map = pair.map;

      return client.publishSourceMap(distDir, asset, map)
        .then(client.logSuccessfulPublish.bind(client));
    });

    return RSVP.all(allUploads);
  },

  getMatchingAssetsAndMaps: function(distDir, sourceMapPattern) {
    var client = this;

    var files = glob.sync(sourceMapPattern, {
      cwd: distDir
    });

    return files.map(function(map) {
      var asset = client.getMatchingAssetForMap(distDir, map);

      return {
        asset: asset,
        map: map
      }
    });
  },

  getMatchingAssetForMap: function(distDir, map) {
    var mapPath = path.dirname(map);
    var fileName = absoluteBaseName(map);

    var opt1 = fileName + '.js';
    var opt2 = fileName + '-*.js';

    var possible = glob.sync(mapPath + '/@(' + opt1 + '|' + opt2 + ')', {
      cwd: distDir
    });

    if (possible.length > 1) {
      throw new Error(
        'The asset for the map `' + map + '` could not be matched' +
        ' because there were multiple possibilities: ' + possible.join(', ')
      );
    }

    if (possible.length === 0) {
      throw new Error(
        'The asset for the map `' + map + '` could not be found.'
      );
    }

    return possible[0].replace(/^\.\//, '');
  },

  logSuccessfulPublish: function(details) {
    var asset = details.asset;
    var map = details.map;

    var message = '✔  Published Map: `' + map + '` for `' + asset + '`';

    this._plugin.log(message, { verbose: true });

    return details;
  },

  publishSourceMap: function(distDir, asset, map) {
    var applicationId = this.applicationId;
    var nrAdminKey = this.nrAdminKey;
    var client = this._client;
    var plugin = this._plugin;
    var prefix = this.prefix;

    return new RSVP.Promise(function(resolve, reject) {
      var fullAssetURL = urljoin(prefix, asset);
      var fullMapPath = path.join(distDir, map);

      client.publishSourceMap({
        sourcemapPath: fullMapPath,
        javascriptUrl: fullAssetURL,
        applicationId: applicationId,
        nrAdminKey: nrAdminKey
      }, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            asset: fullAssetURL,
            map: fullMapPath
          });
        }
      });
    });
  }
});
