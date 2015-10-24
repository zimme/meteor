// Verifies a user's email address based on a token originally
// created by Accounts.sendVerificationEmail
//
// @param token {String}
// @param callback (optional) {Function(error|undefined)}

/**
 * @summary Marks the user's email address as verified. Logs the user in afterwards.
 * @locus Client
 * @param {String} token The token retrieved from the verification URL.
 * @param {Function} [callback] Optional callback. Called with no arguments on success, or with a single `Error` argument on failure.
 */
Accounts.verifyEmail = function(token, callback) {
  if (!token)
    throw new Error("Need to pass token");

  Accounts.callLoginMethod({
    methodName: 'verifyEmail',
    methodArguments: [token],
    userCallback: callback});
};
