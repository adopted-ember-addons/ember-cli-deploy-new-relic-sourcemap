var nrClient    = require('@newrelic/publish-sourcemap');
var CoreObject  = require('core-object');
var RSVP        = require('rsvp');
var urljoin     = require('url-join');
var path        = require('path');
var glob        = require('glob');

function absoluteBaseName(fileName) {
  var ext = path.extname(fileName);

  return path.basename(fileName, ext);
}

module.exports = CoreObject.extend({
  init: function(options) {
    this._super();

    this._client = options._nrClient || nrClient;
    this._plugin = options.plugin;

    this.applicationId = options.applicationId;
    this.nrAdminKey = options.nrAdminKey;
    this.prefix = options.prefix;
    this.ignoreFingerprint = options.ignoreFingerprint;
    this.filterRegex = options.filterRegex;
  },

  publishSourcemaps: function(options) {
    var sourceMapPattern = options.sourceMapPattern;
    var distDir = options.distDir;

    var matchingFilePairs = this.getMatchingAssetsAndMaps(distDir, sourceMapPattern);
    var client = this;

    var allUploads = matchingFilePairs.map(function(pair) {
      var asset = pair.asset;
      var map = pair.map;

      return client.publishSourcemap(distDir, asset, map)
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
    var filterRegex = this.filterRegex ? this.filterRegex : /^-[a-zA-Z0-9]+$/;

    var opt1 = fileName + '.js';
    var opt2 = fileName + '-*.js';

    if (this.ignoreFingerprint) {
      var splitedFileName = fileName.split('-');
      if (splitedFileName.length > 1) {
        splitedFileName.pop();
      }
      var fileNameNoFingerprint = splitedFileName.join('-');

      opt1 = fileNameNoFingerprint + '.js';
      opt2 = fileNameNoFingerprint + '-*.js';
    }

    var possible = glob.sync(mapPath + '/@(' + opt1 + '|' + opt2 + ')', {
      cwd: distDir
    });

    // Filter out files don't match the fingerprinting format
    // which would be the Map file name plus a dash and alphanumeric characters
    possible = possible.filter(function(path) {
      var tempFilePath = absoluteBaseName(path);
      var pathWithoutPrefix = tempFilePath.replace(fileName, '');
      return !pathWithoutPrefix || filterRegex.test(pathWithoutPrefix);
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
    var wasUploaded = details.wasUploaded;

    var message = '✔  Published Map: `' + map + '` for `' + asset + '`';

    if (!wasUploaded) {
      message += ' (Using previously published version)';
    }

    this._plugin.log(message, { verbose: true });

    return details;
  },

  publishSourcemap: function(distDir, asset, map) {
    var applicationId = this.applicationId;
    var nrAdminKey = this.nrAdminKey;
    var client = this._client;
    var plugin = this._plugin;
    var prefix = this.prefix;

    return new RSVP.Promise(function(resolve, reject) {
      var fullAssetURL = urljoin(prefix, asset);
      var fullMapPath = path.join(distDir, map);

      client.publishSourcemap({
        sourcemapPath: fullMapPath,
        javascriptUrl: fullAssetURL,
        applicationId: applicationId,
        nrAdminKey: nrAdminKey
      }, function(err) {
        if (err) {
          if (err.message === 'Conflict') {
            resolve({
              asset: fullAssetURL,
              map: fullMapPath,
              wasUploaded: false
            });
          } else {
            reject(err);
          }
        } else {
          resolve({
            asset: fullAssetURL,
            map: fullMapPath,
            wasUploaded: true
          });
        }
      });
    });
  }
});
