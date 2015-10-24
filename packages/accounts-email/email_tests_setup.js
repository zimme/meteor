// Because this is global state that affects every client, we can't turn
// it on and off during the tests. Doing so would mean two simultaneous
// test runs could collide with each other.
//
// We should probably have some sort of server-isolation between
// multiple test runs. Perhaps a separate server instance per run. This
// problem isn't unique to this test, there are other places in the code
// where we do various hacky things to work around the lack of
// server-side isolation.
//
// For now, we just test the one configuration state. You can comment
// out each configuration option and see that the tests fail.
Accounts.config({
  sendVerificationEmail: true
});

//
// a mechanism to intercept emails sent to addressing including
// the string "intercept", storing them in an array that can then
// be retrieved using the getInterceptedEmails method
//
var interceptedEmails = {}; // (email address) -> (array of options)

// add html email templates that just contain the url
Accounts.emailTemplates.verifyEmail.html = function (user, url) {
  return url;
};

// override the from address
Accounts.emailTemplates.verifyEmail.from = function (user) {
  return 'test@meteor.com';
};

// add a custom header to check against
Accounts.emailTemplates.headers = {
  'My-Custom-Header' : 'Cool'
};

EmailTest.hookSend(function (options) {
  var to = options.to;
  if (!to || to.indexOf('intercept') === -1) {
    return true; // go ahead and send
  } else {
    if (!interceptedEmails[to])
      interceptedEmails[to] = [];

    interceptedEmails[to].push(options);
    return false; // skip sending
  }
});

Meteor.methods({
  getInterceptedEmails: function (email) {
    check(email, String);
    return interceptedEmails[email];
  },

  addEmailForTestAndVerify: function (email) {
    check(email, String);
    Meteor.users.update(
      {_id: this.userId},
      {$push: {emails: {address: email, verified: false}}});
    Accounts.sendVerificationEmail(this.userId, email);
  }
});
