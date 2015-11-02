# End-User Stories

To avoid a lot of repetition, I'm structuring the stories in terms of the behavior various end-user actions should have in various end-user states. First I'll describe the states and the actions available from them, and then I'll describe the behavior of the actions themselves.

## End-user States

### Logged Out

The user is not logged in to any account. This state does not exist in apps that automatically log users in to guest accounts. In this state the app provides some subset of the following actions: 
* Sign In with Service X
* Sign Up with Service X
* Sign In/Up with Service X
* Sign In as Guest. 

### Guest

The user is logged in to an account that was created for him but he has not yet established a way to sign in to that account from another browser profile (i.e. he has not yet "signed up"). As a result, the app provides some subset of the following actions: 
* Sign In with Service X
* Sign Up with Service X
* Sign In/Up with Service X
* Delete Account
* Merge Account Associated with Service X. 

#### Guest without Data

A substate of Guest where the user has not associated any data with the account.

#### Guest with Data

A substate of Guest where the user has associated some data with the account.

### Signed Up

The user is logged in to an account that he is able to sign in to from another browser profile. As a result, and app provides some subset of the following actions:
* Add Service X
* Remove Service X
* Sign Out
* Delete Account
* Switch User with Service X
* Merge Account Associated with Service X. 

If there are multiple login services, the app probably won't provide Switch User with Service X, opting instead to have the user first choose Sign Out, and then Sign In/Up with Service X. If there is only one login service, the app won't provide Add Service X and Remove Service X but is more likely to offer a Switch User action. Also, the app will not offer the Add Service X action for services that are already associated with the account, nor will it offer the Delete Service X action for services that are not associated with the account. It will also not offer any Delete Service X actions if there is only one service associated with the account.

## End-user Actions

### Sign In with Service X

If the user is currently a Guest with Data, he is asked to confirm that he wants to delete his guest account before continuing. If he does not confirm, his state remains unchanged. If he does confirm or he is not a Guest with Data, the app gathers credentials for service X either automatically (e.g. with an OAuth service), or directly from the user. If the credentials don't match an existing account, the user's state remains unchanged and the user sees an "sign in failed" error message. If the credentials do match an existing account, the user is logged in to the matching account, and if the user was a Guest, his guest account is deleted.

### Sign Up with Service X

The app gathers credentials to support future sign in using service X along with any other information the app requires on sign up. If the credentials match an existing account, the user's state remains unchanged and the app displays a "user already has an account" error message and offers the Merge Account Associated with Service X action. If the credentials do not match an existing account, the user's state is changed to Signed Up (if it wasn't already), and the user is able now able to sign in to the same account using Service X.

### Sign In/Up with Service X

An app should only offer this action when the user can only use one login service. When this action is performed, the app gathers credentials for service X either automatically (e.g. with an OAuth service), or directly from the user. If the credentials do not match an existing account, the app gathers any additional information needed to sign up, the user's state is changed to Signed Up (if it wasn't already), and the user is able now able to sign in to the same account using Service X. If the credentials do match an existing account, and the user is not a Guest with Data, the user is logged in to the matching account. If the credentials do match an existing account, and the user is a Guest with Data, the app provides some subset of the following actions: Delete Guest Account And Then Sign In with Service X, Merge Account Associated with Service X, Cancel.

### Sign In as Guest

A new account is created and the user is logged into it. The user can only access it from his current browser profile. The user's state becomes Guest without Data.

### Delete Account

The user is logged out and his account is deleted. His new state becomes Logged Out.

### Sign Out

The user is logged out of his account (but his account remains). His new state becomes Logged Out.

### Switch User with Service X

This is equivalent to Sign In with Service X, but is only available when the user is in the Signed Up state.

### Merge Account Associated with Service X

The app gathers credentials for service X either automatically (e.g. with an OAuth service), or directly from the user. If the credentials don't match an existing account, the user's state remains unchanged and the user sees an "no such account" error message. If the credentials do match an existing account, the user's current account and the existing account are merged in an app-specific manner (potentially with user input), the user is logged in to the merged account, and as a result his state is Signed Up.

### Add Service X

This is equivalent to Sign Up with Service X, but is only available when the user is in the Signed Up state.

### Remove Service X

The user becomes unable to login to his current account using service X.

# Developer Stories

## Compatibility

Existing apps continue to work the same as before.

Meteor 1.2 can be monkey patched to support new features.

MDG is willing to include (in the next minor release) any PRs that are required to make the system work without monkey patching.

Existing login service providers which call `Accounts.registerLoginHandler` do not need to be changed to support new features. This includes core providers like `accounts-password` and `accounts-google`, as well as third party providers, both OAuth and non-OAuth.

## Hooks to Enforce Policy

The `onCreateUser` handler is called if and only if a new account is created.

The `onValidateNewUser` handlers are called if and only if a new account is created.

The `onValidateLoginAttempt` handlers are called when a user performs an action which could result in them being logged in to a new or different account. Should they also be called when logging in to the account they are already logged in to? To ensure backward compatibility, I think the answer is "yes". Should they also be called when adding a service to an existing account? I'm leaning toward "no" to be consistent with the current behavior when calling other methods that modify the credentials required to access the current account (e.g. `changePassword`). Instead, I'm thinking we should provide a new `onValidateUpdateCredentials` hook (see below).

The (new) `onValidateUpdateCredentials` handlers are called if and only if a service is to be added to the current user's account, or the credentials associated with an existing service are to be changed (e.g. `changePassword`).

The `onLogin` handlers are called if and only if the `onValidateLoginAttempt` handlers are called and the login is successful.

The `onLoginFailure` handlers are called if and only if the `onValidateLoginAttempt` handlers are called and the login fails.

The callbacks registered with the (new) server-side method `addSignedUpInterceptor(callback)` (or something similar) are called to determine whether a user has signed up. For details on the envisioned functionality, see [the brettle:accounts-login-state README](https://github.com/brettle/meteor-accounts-login-state/blob/master/README.md).

The callbacks registered with the (new) server-side method `addHasDataInterceptor(callback)` (or something similar) are called to determine whether a guest user has any associated data. If no callbacks are registered or any registered callback returns true, then the user's state is Guest with Data. Otherwise, the user's state is Guest without Data.

If and only if a callback is set with the (new) server-side method `setMergeUsersHandler(callback)` (or something similar), then the Merge Account Associated with Service X action is available and the callback will be called with the two accounts to be merged when the user performs that action. It must return the id of whichever of those two accounts the user should be logged in to.

## User Interface

We are UI framework agnostic and do not dictate how the actions are made available to the user. For example, an app can put them in a dropdown, in the body of a page, or split across multiple pages. UI code calls into a client-side API that we provide to perform the actions.





