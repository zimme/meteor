Package.describe({
  summary: "Email helpers for the accounts system",
  version: "1.0.0"
});

Package.onUse(function(api) {
  api.use([
    'accounts-base',
    'ejson',
    'ddp'
  ], ['client', 'server']);

  // Export Accounts (etc) to packages using this one.
  api.imply('accounts-base', ['client', 'server']);

  api.use('email', ['server']);
  api.use('random', ['server']);
  api.use('check');
  api.use('underscore');
  api.use('ecmascript');

  api.addFiles('email_templates.js', 'server');
  api.addFiles('email_server.js', 'server');
  api.addFiles('email_client.js', 'client');
});

Package.onTest(function(api) {
  api.use(['accounts-email', 'tinytest', 'test-helpers', 'tracker',
           'accounts-password', 'random', 'email', 'underscore', 'check',
           'ddp']);
  api.addFiles('email_tests_setup.js', 'server');
  api.addFiles('email_tests.js');
});
