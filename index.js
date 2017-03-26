/* jshint node: true */
'use strict';

var DeployPluginBase = require('ember-cli-deploy-plugin');
var NewRelic = require('./lib/new-relic-client');


module.exports = {
  name: 'ember-cli-deploy-new-relic-sourcemap',

  createDeployPlugin: function(options) {
    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,
      NewRelic: options.NewRelic || NewRelic,

      defaultConfig: {
        sourceMapPattern: '**/*.js.map',
        distDir: function(context) {
          return context.distDir;
        }
      },

      requiredConfig: ['prefix', 'applicationId', 'nrAdminKey'],

      upload: function(/* context */) {
        var sourceMapPattern  = this.readConfig('sourceMapPattern');
        var applicationId     = this.readConfig('applicationId');
        var nrAdminKey        = this.readConfig('nrAdminKey');
        var distDir           = this.readConfig('distDir');
        var prefix            = this.readConfig('prefix');

        this.log('Preparing to upload source maps to New Relic', { verbose: true });

        var nrClient = new this.NewRelic({
          plugin: this,
          applicationId: applicationId,
          nrAdminKey: nrAdminKey,
          prefix: prefix
        });

        return nrClient.publishSourcemaps({
          sourceMapPattern: sourceMapPattern,
          distDir: distDir
        });
      }
    });

    return new DeployPlugin();
  }
}
