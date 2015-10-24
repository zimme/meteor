Package.describe({
  summary: "Password support for accounts",
  version: "1.1.3"
});

Package.onUse(function(api) {
  api.use('npm-bcrypt@=0.7.8_2');

  api.use([
    'accounts-email',
    'srp',
    'sha',
    'ejson',
    'ddp'
  ]);

  // Export Accounts (etc) to packages using this one.
  api.imply('accounts-email');

  api.use('email', ['server']);
  api.use('random', ['server']);
  api.use('check');
  api.use('underscore');
  api.use('ecmascript');

  api.addFiles('email_templates.js', 'server');
  api.addFiles('password_server.js', 'server');
  api.addFiles('password_client.js', 'client');
});

Package.onTest(function(api) {
  api.use(['accounts-password', 'tinytest', 'test-helpers', 'tracker',
           'accounts-email', 'random', 'email', 'underscore', 'check',
           'ddp']);
  api.addFiles('password_tests_setup.js', 'server');
  api.addFiles('password_tests.js');
  api.addFiles('email_tests_setup.js', 'server');
  api.addFiles('email_tests.js', 'client');
});
