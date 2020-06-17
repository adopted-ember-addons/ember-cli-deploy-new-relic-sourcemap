# ember-cli-deploy-new-relic-sourcemap
Ember CLI Deploy plugin to upload source maps to [New Relic](https://newrelic.com).

## What is an ember-cli-deploy plugin?
A plugin is an addon that can be executed as a part of the ember-cli-deploy pipeline. A plugin will implement one or more of the ember-cli-deploy's pipeline hooks.

For more information on what plugins are and how they work, please refer to the [Plugin Documentation](http://ember-cli.github.io/ember-cli-deploy/plugins).

## Quick Start
To get up and running quickly, do the following:

- Ensure [ember-cli-deploy-build](https://github.com/zapnito/ember-cli-deploy-build) is installed and configured.

- Install this plugin

```bash
$ ember install ember-cli-deploy-new-relic-sourcemap
```

- Place the following configuration into `config/deploy.js`

```js
ENV['new-relic-sourcemap'] = {
  // The URL or CDN your assets are served from.
  // Likely the same as the `prepend` in your fingerprint config
  prefix: 'https://your.awesome.site',

  // Application ID Provided by New Relic
  applicationId: '12345678',

  // Admin Key (not application-specific)
  nrAdminKey: 'a98b7a98notd7reallyasda9s8fkey7am',

  // flag to ignore fingerprint on files, false by default
  ignoreFingerprint: true,

  // flag to ignore fingerprint on files, default /^-[a-zA-Z0-9]+$/
  filterRegex: /^[-a-zA-Z0-9]+$/
};
```

- Enable sourcemaps in your `ember-cli-build.js` file

```js
const app = new EmberApp(defaults, {
  sourcemaps: {
    enabled: true
  }
});
```

- Enable fingerprinting. (While New Relic supports non-fingerprinted assets, this is not supported by this plugin yet).

```js
const app = new EmberApp(defaults, {
  fingerprint: {
    enabled: true
  }
});
```

- _Important:_ Ensure that your Source Maps are not Gzipped if you are using [`ember-cli-deploy-gzip`](https://github.com/ember-cli-deploy/ember-cli-deploy-gzip)


## Installation
Run the following command in your terminal:

```bash
ember install ember-cli-deploy-new-relic-sourcemap
```

For general information on how to setup New Relic Sourcemaps, please refer to their [API documentation](https://docs.newrelic.com/docs/browser/new-relic-browser/browser-pro-features/push-source-maps-api).

## ember-cli-deploy Hooks Implemented

For detailed information on what plugin hooks are and how they work, please refer to the [Plugin Documentation](http://ember-cli.github.io/ember-cli-deploy/plugins).

- `configure`
- `upload`

## Configuration Options

For detailed information on what plugin hooks are and how they work, please refer to the [Plugin Documentation](http://ember-cli.github.io/ember-cli-deploy/plugins).

### prefix

This is the base URL where your normal javascript assets are served from. (This is likely the same value as what you configure in your `fingerprint.prepend` setting, if applicable). The fully qualified URL is the only way New Relic knows to map an stack frame to a source map.

*Required*

### applicationId

The New Reclic provided ID for the application for which the source maps are being uploaded.

*Required*

### nrAdminKey

The New Relic provided Admin Key (this is different than the key used to report errors to New Relic).

*Required*

### sourceMapPattern

The `minimatch` expression to determine which source map files should be uploaded.

*Default:* `'**/*.map'`

### distDir

The root directory that all files matching the `filePattern` will be uploaded from. By default, this option will use the `distDir` property of the deployment context.

*Default:* `context.distDir`


## Prerequisites

The following properties are expected to be present on the deployment `context` object:

- `distDir` (provided by [ember-cli-deploy-build](https://github.com/zapnito/ember-cli-deploy-build))
