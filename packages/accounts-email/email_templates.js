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

Accounts.emailTemplates = {
  from: "Meteor Accounts <no-reply@meteor.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),

  verifyEmail: {
    subject: function(user) {
      return "How to verify email address on " + Accounts.emailTemplates.siteName;
    },
    text: greet("To verify your account email")
  }
};
