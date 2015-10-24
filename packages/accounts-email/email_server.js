///
/// LOGIN
///

/**
 * @summary Finds the user with the specified email.
 * First tries to match email case sensitively; if that fails, it
 * tries case insensitively; but if more than one user matches the case
 * insensitive search, it returns null.
 * @locus Server
 * @param {String} email The email address to look for
 * @returns {Object} A user if found, else null
 */
Accounts.findUserByEmail = function (email) {
  return Accounts._findUserByQuery({
    email: email
  });
};

// Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).
var selectorForFastCaseInsensitiveLookup = function (fieldName, string) {
  // Performance seems to improve up to 4 prefix characters
  var prefix = string.substring(0, Math.min(string.length, 4));
  var orClause = _.map(generateCasePermutationsForString(prefix),
    function (prefixPermutation) {
      var selector = {};
      selector[fieldName] =
        new RegExp('^' + Meteor._escapeRegExp(prefixPermutation));
      return selector;
    });
  var caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] =
    new RegExp('^' + Meteor._escapeRegExp(string) + '$', 'i')
  return {$and: [{$or: orClause}, caseInsensitiveClause]};
}

// Generates permutations of all case variations of a given string.
var generateCasePermutationsForString = function (string) {
  var permutations = [''];
  for (var i = 0; i < string.length; i++) {
    var ch = string.charAt(i);
    permutations = _.flatten(_.map(permutations, function (prefix) {
      var lowerCaseChar = ch.toLowerCase();
      var upperCaseChar = ch.toUpperCase();
      // Don't add unneccesary permutations when ch is not a letter
      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }
  return permutations;
}

var checkForCaseInsensitiveDuplicates = function (fieldName, displayName, fieldValue, ownUserId) {
  // Some tests need the ability to add users with the same case insensitive
  // value, hence the _skipCaseInsensitiveChecksForTest check
  var skipCheck = _.has(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

  if (fieldValue && !skipCheck) {
    var matchedUsers = Meteor.users.find(
      selectorForFastCaseInsensitiveLookup(fieldName, fieldValue)).fetch();

    if (matchedUsers.length > 0 &&
        // If we don't have a userId yet, any match we find is a duplicate
        (!ownUserId ||
        // Otherwise, check to see if there are multiple matches or a match
        // that is not us
        (matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId))) {
      throw new Meteor.Error(403, displayName + " already exists.");
    }
  }
};

// XXX maybe this belongs in the check package
var NonEmptyString = Match.Where(function (x) {
  check(x, String);
  return x.length > 0;
});

///
/// EMAIL VERIFICATION
///


// send the user an email with a link that when opened marks that
// address as verified

/**
 * @summary Send an email with a link the user can use verify their email address.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 */
Accounts.sendVerificationEmail = function (userId, address) {
  // XXX Also generate a link using which someone can delete this
  // account if they own said address but weren't those who created
  // this account.

  // Make sure the user exists, and address is one of their addresses.
  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Error("Can't find user");
  // pick the first unverified address if we weren't passed an address.
  if (!address) {
    var email = _.find(user.emails || [],
                       function (e) { return !e.verified; });
    address = (email || {}).address;
  }
  // make sure we have a valid address
  if (!address || !_.contains(_.pluck(user.emails || [], 'address'), address))
    throw new Error("No such email address for user.");


  var tokenRecord = {
    token: Random.secret(),
    address: address,
    when: new Date()};
  Meteor.users.update(
    {_id: userId},
    {$push: {'services.email.verificationTokens': tokenRecord}});

  // before passing to template, update user object with new token
  Meteor._ensure(user, 'services', 'email');
  if (!user.services.email.verificationTokens) {
    user.services.email.verificationTokens = [];
  }
  user.services.email.verificationTokens.push(tokenRecord);

  var verifyEmailUrl = Accounts.urls.verifyEmail(tokenRecord.token);

  var options = {
    to: address,
    from: Accounts.emailTemplates.verifyEmail.from
      ? Accounts.emailTemplates.verifyEmail.from(user)
      : Accounts.emailTemplates.from,
    subject: Accounts.emailTemplates.verifyEmail.subject(user)
  };

  if (typeof Accounts.emailTemplates.verifyEmail.text === 'function') {
    options.text =
      Accounts.emailTemplates.verifyEmail.text(user, verifyEmailUrl);
  }

  if (typeof Accounts.emailTemplates.verifyEmail.html === 'function')
    options.html =
      Accounts.emailTemplates.verifyEmail.html(user, verifyEmailUrl);

  if (typeof Accounts.emailTemplates.headers === 'object') {
    options.headers = Accounts.emailTemplates.headers;
  }

  Email.send(options);
};

// Take token from sendVerificationEmail, mark the email as verified,
// and log them in.
Meteor.methods({verifyEmail: function (token) {
  var self = this;
  return Accounts._loginMethod(
    self,
    "verifyEmail",
    arguments,
    "password",
    function () {
      check(token, String);

      var user = Meteor.users.findOne(
        {'services.email.verificationTokens.token': token});
      if (!user)
        throw new Meteor.Error(403, "Verify email link expired");

      var tokenRecord = _.find(user.services.email.verificationTokens,
                               function (t) {
                                 return t.token == token;
                               });
      if (!tokenRecord)
        return {
          userId: user._id,
          error: new Meteor.Error(403, "Verify email link expired")
        };

      var emailsRecord = _.find(user.emails, function (e) {
        return e.address == tokenRecord.address;
      });
      if (!emailsRecord)
        return {
          userId: user._id,
          error: new Meteor.Error(403, "Verify email link is for unknown address")
        };

      // By including the address in the query, we can use 'emails.$' in the
      // modifier to get a reference to the specific object in the emails
      // array. See
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull
      Meteor.users.update(
        {_id: user._id,
         'emails.address': tokenRecord.address},
        {$set: {'emails.$.verified': true},
         $pull: {'services.email.verificationTokens': {address: tokenRecord.address}}});

      return {userId: user._id};
    }
  );
}});


///
/// EMAIL HELPERS
///

/**
 * @summary Add an email address for a user. Use this instead of directly
 * updating the database. The operation will fail if there is a different user
 * with an email only differing in case. If the specified user has an existing
 * email only differing in case however, we replace it.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newEmail A new email address for the user.
 * @param {Boolean} [verified] Optional - whether the new email address should
 * be marked as verified. Defaults to false.
 */
Accounts.addEmail = function (userId, newEmail, verified) {
  check(userId, NonEmptyString);
  check(newEmail, NonEmptyString);
  check(verified, Match.Optional(Boolean));

  if (_.isUndefined(verified)) {
    verified = false;
  }

  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Meteor.Error(403, "User not found");

  // Allow users to change their own email to a version with a different case

  // We don't have to call checkForCaseInsensitiveDuplicates to do a case
  // insensitive check across all emails in the database here because: (1) if
  // there is no case-insensitive duplicate between this user and other users,
  // then we are OK and (2) if this would create a conflict with other users
  // then there would already be a case-insensitive duplicate and we can't fix
  // that in this code anyway.
  var caseInsensitiveRegExp =
    new RegExp('^' + Meteor._escapeRegExp(newEmail) + '$', 'i');

  var didUpdateOwnEmail = _.any(user.emails, function(email, index) {
    if (caseInsensitiveRegExp.test(email.address)) {
      Meteor.users.update({
        _id: user._id,
        'emails.address': email.address
      }, {$set: {
        'emails.$.address': newEmail,
        'emails.$.verified': verified
      }});
      return true;
    }

    return false;
  });

  // In the other updates below, we have to do another call to
  // checkForCaseInsensitiveDuplicates to make sure that no conflicting values
  // were added to the database in the meantime. We don't have to do this for
  // the case where the user is updating their email address to one that is the
  // same as before, but only different because of capitalization. Read the
  // big comment above to understand why.

  if (didUpdateOwnEmail) {
    return;
  }

  // Perform a case insensitive check for duplicates before update
  checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);

  Meteor.users.update({
    _id: user._id
  }, {
    $addToSet: {
      emails: {
        address: newEmail,
        verified: verified
      }
    }
  });

  // Perform another check after update, in case a matching user has been
  // inserted in the meantime
  try {
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({_id: user._id},
      {$pull: {emails: {address: newEmail}}});
    throw ex;
  }
}

/**
 * @summary Remove an email address for a user. Use this instead of updating
 * the database directly.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} email The email address to remove.
 */
Accounts.removeEmail = function (userId, email) {
  check(userId, NonEmptyString);
  check(email, NonEmptyString);

  var user = Meteor.users.findOne(userId);
  if (!user)
    throw new Meteor.Error(403, "User not found");

  Meteor.users.update({_id: user._id},
    {$pull: {emails: {address: email}}});
}

///
/// EMAIL-SPECIFIC INDEXES ON USERS
///
Meteor.users._ensureIndex('services.email.verificationTokens.token',
                          {unique: 1, sparse: 1});
