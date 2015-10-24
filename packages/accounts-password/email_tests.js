// intentionally initialize later so that we can debug tests after
// they fail without trying to recreate a user with the same email
// address
var email1;
var email2;

var resetPasswordToken;
var enrollAccountToken;

Accounts._isolateLoginTokenForTest();
Accounts.removeDefaultRateLimit();
testAsyncMulti("accounts emails - reset password flow", [
  function (test, expect) {
    email1 = Random.id() + "-intercept@example.com";
    Accounts.createUser({email: email1, password: 'foobar'},
                        expect(function (error) {
                          test.equal(error, undefined);
                        }));
  },
  function (test, expect) {
    Accounts.forgotPassword({email: email1}, expect(function (error) {
      test.equal(error, undefined);
    }));
  },
  function (test, expect) {
    Accounts.connection.call(
      "getInterceptedEmails", email1, expect(function (error, result) {
        test.equal(error, undefined);
        test.notEqual(result, undefined);
        test.equal(result.length, 2); // the first is the email verification
        var options = result[1];

        var re = new RegExp(Meteor.absoluteUrl() + "#/reset-password/(\\S*)");
        var match = options.text.match(re);
        test.isTrue(match);
        resetPasswordToken = match[1];
        test.isTrue(options.html.match(re));

        test.equal(options.from, 'test@meteor.com');
        test.equal(options.headers['My-Custom-Header'], 'Cool');
      }));
  },
  function (test, expect) {
    Accounts.resetPassword(resetPasswordToken, "newPassword", expect(function(error) {
      test.isFalse(error);
    }));
  },
  function (test, expect) {
    Meteor.logout(expect(function (error) {
      test.equal(error, undefined);
      test.equal(Meteor.user(), null);
    }));
  },
  function (test, expect) {
    Meteor.loginWithPassword(
      {email: email1}, "newPassword",
      expect(function (error) {
        test.isFalse(error);
      }));
  },
  function (test, expect) {
    Meteor.logout(expect(function (error) {
      test.equal(error, undefined);
      test.equal(Meteor.user(), null);
    }));
  }
]);

var loggedIn = function (test, expect) {
  return expect(function (error) {
    test.equal(error, undefined);
    test.isTrue(Meteor.user());
  });
};

var getEnrollAccountToken = function (email, test, expect) {
  Accounts.connection.call(
    "getInterceptedEmails", email, expect(function (error, result) {
      test.equal(error, undefined);
      test.notEqual(result, undefined);
      test.equal(result.length, 1);
      var options = result[0];

      var re = new RegExp(Meteor.absoluteUrl() + "#/enroll-account/(\\S*)")
      var match = options.text.match(re);
      test.isTrue(match);
      enrollAccountToken = match[1];
      test.isTrue(options.html.match(re));

      test.equal(options.from, 'test@meteor.com');
      test.equal(options.headers['My-Custom-Header'], 'Cool');
    }));
};

testAsyncMulti("accounts emails - enroll account flow", [
  function (test, expect) {
    email2 = Random.id() + "-intercept@example.com";
    Accounts.connection.call("createUserOnServer", email2,
      expect(function (error, result) {
        test.isFalse(error);
        var user = result;
        test.equal(user.emails.length, 1);
        test.equal(user.emails[0].address, email2);
        test.isFalse(user.emails[0].verified);
      }));
  },
  function (test, expect) {
    getEnrollAccountToken(email2, test, expect);
  },
  function (test, expect) {
    Accounts.resetPassword(enrollAccountToken, 'password',
                           loggedIn(test, expect));
  },
  function (test, expect) {
    test.equal(Meteor.user().emails.length, 1);
    test.equal(Meteor.user().emails[0].address, email2);
    test.isTrue(Meteor.user().emails[0].verified);
  },
  function (test, expect) {
    Meteor.logout(expect(function (error) {
      test.equal(error, undefined);
      test.equal(Meteor.user(), null);
    }));
  },
  function (test, expect) {
    Meteor.loginWithPassword({email: email2}, 'password',
                             loggedIn(test ,expect));
  },
  function (test, expect) {
    test.equal(Meteor.user().emails.length, 1);
    test.equal(Meteor.user().emails[0].address, email2);
    test.isTrue(Meteor.user().emails[0].verified);
  },
  function (test, expect) {
    Meteor.logout(expect(function (error) {
      test.equal(error, undefined);
      test.equal(Meteor.user(), null);
    }));
  }
]);
