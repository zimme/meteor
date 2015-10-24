/**
 * @summary Options to customize emails sent from the Accounts system.
 * @locus Server
 */

function greet(welcomeMsg) {
  return function(user, url) {
      var greeting = (user.profile && user.profile.name) ?
            ("Hello " + user.profile.name + ",") : "Hello,";
      return `${greeting}

${welcomeMsg}, simply click the link below.

${url}

Thanks.
`;
  };
}

_.extend(Accounts.emailTemplates, {
  resetPassword: {
    subject: function(user) {
      return "How to reset your password on " + Accounts.emailTemplates.siteName;
    },
    text: function(user, url) {
      var greeting = (user.profile && user.profile.name) ?
            ("Hello " + user.profile.name + ",") : "Hello,";
      return `${greeting}

To reset your password, simply click the link below.

${url}

Thanks.
`;
    }
  },
  enrollAccount: {
    subject: function(user) {
      return "An account has been created for you on " + Accounts.emailTemplates.siteName;
    },
    text: greet("To start using the service")
  }
});
