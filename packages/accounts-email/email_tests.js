if (Meteor.isClient) {
  // intentionally initialize later so that we can debug tests after
  // they fail without trying to recreate a user with the same email
  // address
  var email1;
  var email2;

  var verifyEmailToken;

  Accounts._isolateLoginTokenForTest();
  Accounts.removeDefaultRateLimit();

  var getVerifyEmailToken = function (email, test, expect) {
    Accounts.connection.call(
      "getInterceptedEmails", email, expect(function (error, result) {
        test.equal(error, undefined);
        test.notEqual(result, undefined);
        test.equal(result.length, 1);
        var options = result[0];

        var re = new RegExp(Meteor.absoluteUrl() + "#/verify-email/(\\S*)");
        var match = options.text.match(re);
        test.isTrue(match);
        verifyEmailToken = match[1];
        test.isTrue(options.html.match(re));

        test.equal(options.from, 'test@meteor.com');
        test.equal(options.headers['My-Custom-Header'], 'Cool');
      }));
  };

  var loggedIn = function (test, expect) {
    return expect(function (error) {
      test.equal(error, undefined);
      test.isTrue(Meteor.user());
    });
  };

  testAsyncMulti("accounts emails - verify email flow", [
    function (test, expect) {
      email1 = Random.id() + "-intercept@example.com";
      email2 = Random.id() + "-intercept@example.com";
      Accounts.createUser(
        {email: email1, password: 'foobar'},
        loggedIn(test, expect));
    },
    function (test, expect) {
      test.equal(Meteor.user().emails.length, 1);
      test.equal(Meteor.user().emails[0].address, email1);
      test.isFalse(Meteor.user().emails[0].verified);
      // We should NOT be publishing things like verification tokens!
      test.isFalse(_.has(Meteor.user(), 'services'));
    },
    function (test, expect) {
      getVerifyEmailToken(email1, test, expect);
    },
    function (test, expect) {
      // Log out, to test that verifyEmail logs us back in.
      Meteor.logout(expect(function (error) {
        test.equal(error, undefined);
        test.equal(Meteor.user(), null);
      }));
    },
    function (test, expect) {
      Accounts.verifyEmail(verifyEmailToken,
                           loggedIn(test, expect));
    },
    function (test, expect) {
      test.equal(Meteor.user().emails.length, 1);
      test.equal(Meteor.user().emails[0].address, email1);
      test.isTrue(Meteor.user().emails[0].verified);
    },
    function (test, expect) {
      Accounts.connection.call(
        "addEmailForTestAndVerify", email2,
        expect(function (error, result) {
          test.isFalse(error);
          test.equal(Meteor.user().emails.length, 2);
          test.equal(Meteor.user().emails[1].address, email2);
          test.isFalse(Meteor.user().emails[1].verified);
        }));
    },
    function (test, expect) {
      getVerifyEmailToken(email2, test, expect);
    },
    function (test, expect) {
      // Log out, to test that verifyEmail logs us back in. (And if we don't
      // do that, waitUntilLoggedIn won't be able to prevent race conditions.)
      Meteor.logout(expect(function (error) {
        test.equal(error, undefined);
        test.equal(Meteor.user(), null);
      }));
    },
    function (test, expect) {
      Accounts.verifyEmail(verifyEmailToken,
                           loggedIn(test, expect));
    },
    function (test, expect) {
      test.equal(Meteor.user().emails[1].address, email2);
      test.isTrue(Meteor.user().emails[1].verified);
    },
    function (test, expect) {
      Meteor.logout(expect(function (error) {
        test.equal(error, undefined);
        test.equal(Meteor.user(), null);
      }));
    }
  ]);
}

if (Meteor.isServer) {

  Tinytest.add("passwords - add email", function (test) {
    var origEmail = Random.id() + "@turing.com";
    var userId = Accounts.createUser({
      email: origEmail
    });

    var newEmail = Random.id() + "@turing.com";
    Accounts.addEmail(userId, newEmail);

    var thirdEmail = Random.id() + "@turing.com";
    Accounts.addEmail(userId, thirdEmail, true);

    test.equal(Accounts._findUserByQuery({id: userId}).emails, [
      { address: origEmail, verified: false },
      { address: newEmail, verified: false },
      { address: thirdEmail, verified: true }
    ]);

    // Test findUserByEmail as well while we're here
    test.equal(Accounts.findUserByEmail(origEmail)._id, userId);
  });

  Tinytest.add("passwords - add email when the user has an existing email " +
      "only differing in case", function (test) {
    var origEmail = Random.id() + "@turing.com";
    var userId = Accounts.createUser({
      email: origEmail
    });

    var newEmail = Random.id() + "@turing.com";
    Accounts.addEmail(userId, newEmail);

    var thirdEmail = origEmail.toUpperCase();
    Accounts.addEmail(userId, thirdEmail, true);

    test.equal(Accounts._findUserByQuery({id: userId}).emails, [
      { address: thirdEmail, verified: true },
      { address: newEmail, verified: false }
    ]);
  });

  Tinytest.add("passwords - add email should fail when there is an existing " +
      "user with an email only differing in case", function (test) {
    var user1Email = Random.id() + "@turing.com";
    var userId1 = Accounts.createUser({
      email: user1Email
    });

    var user2Email = Random.id() + "@turing.com";
    var userId2 = Accounts.createUser({
      email: user2Email
    });

    var dupEmail = user1Email.toUpperCase();
    test.throws(function () {
      Accounts.addEmail(userId2, dupEmail);
    }, /Email already exists/);

    test.equal(Accounts._findUserByQuery({id: userId1}).emails, [
      { address: user1Email, verified: false }
    ]);

    test.equal(Accounts._findUserByQuery({id: userId2}).emails, [
      { address: user2Email, verified: false }
    ]);
  });

  Tinytest.add("passwords - remove email", function (test) {
    var origEmail = Random.id() + "@turing.com";
    var userId = Accounts.createUser({
      email: origEmail
    });

    var newEmail = Random.id() + "@turing.com";
    Accounts.addEmail(userId, newEmail);

    var thirdEmail = Random.id() + "@turing.com";
    Accounts.addEmail(userId, thirdEmail, true);

    test.equal(Accounts._findUserByQuery({id: userId}).emails, [
      { address: origEmail, verified: false },
      { address: newEmail, verified: false },
      { address: thirdEmail, verified: true }
    ]);

    Accounts.removeEmail(userId, newEmail);

    test.equal(Accounts._findUserByQuery({id: userId}).emails, [
      { address: origEmail, verified: false },
      { address: thirdEmail, verified: true }
    ]);

    Accounts.removeEmail(userId, origEmail);

    test.equal(Accounts._findUserByQuery({id: userId}).emails, [
      { address: thirdEmail, verified: true }
    ]);
  });
}
