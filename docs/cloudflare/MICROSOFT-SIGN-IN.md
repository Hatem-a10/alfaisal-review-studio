# Microsoft sign-in on Clerk Hobby

Clerk hosts the social sign-in and sign-up buttons, verifies OAuth and returns users to Review Studio. The Worker still verifies the Clerk issuer and session, and uses the existing immutable Clerk subject for the student namespace and roles. Clerk Development already shows Microsoft on both staging auth pages. Both handoffs reached Microsoft with the shared Development callback at `https://clerk.shared.lcl.dev/v1/oauth_callback`. Production continues to use Google and email.

## Configure a production candidate after approval

1. Open the [Clerk Dashboard](https://dashboard.clerk.com/), select the Review Studio **Production** instance, then **SSO connections → Add connection → For all users → Microsoft**. Open its custom credentials form and copy its exact **Redirect URI**. The existing production Clerk callback is `https://clerk.alfaisal.review/v1/oauth_callback`. Confirm the Microsoft form displays this exact URI before adding it to Entra. Leave the connection disabled until the reviewed release.
2. Open [Microsoft Entra](https://entra.microsoft.com/), choose a directory where you can register apps, and go to **App registrations → New registration**. Give the Review Studio production app a recognizable name. Select **Accounts in any organizational directory and personal Microsoft accounts**, choose **Web** and paste the callback copied from Clerk. This uses Clerk's supported `common` audience. Use a separate app and secret if staging needs custom credentials.
3. Copy the **Application (client) ID**. In **Certificates & secrets → New client secret**, copy the secret **Value** once and record its expiry in the owner's private credential manager. Enter both fields directly in the correct Clerk provider form. Keep secret values out of Git, chat, logs and Worker variables. Arrange rotation before expiry.
4. Follow Clerk's **Enable OpenID** section for the Entra Authentication settings, including the redirect from step 1 as the front-channel logout URL, and token options. Add only required permissions and review requested consent.
5. Follow Microsoft's official optional-claims guidance for `email` and `xms_edov`. Keep `acceptMappedClaims` unset or false. The Clerk Microsoft guide recommends setting it to true, which Microsoft explicitly disallows for multitenant apps. Confirm this configuration with Clerk support if verified-email behavior fails. Keep Microsoft disabled pending resolution and verification of linking.
6. Keep the provider disabled in production until owner approval of the exact candidate and activation. Use the existing reviewed GitHub-to-Cloudflare process to promote the code. Enable the Microsoft social connection in Clerk Production only after the preflight passes. Keep Google and email enabled and Apple disabled.

[Clerk's Microsoft setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/microsoft) · [Entra registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app) · [Microsoft optional claims](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference) · [Microsoft multitenant claim guidance](https://learn.microsoft.com/en-us/entra/identity-platform/active-directory-jwt-claims-customization)

## Existing accounts and university eligibility

- Start with the existing Review Studio sign-in method. Open **Site Settings → Account & privacy → Manage sign-in methods** to use Clerk's security controls. If the Microsoft account uses a different email, verify that address on the existing Clerk account before connecting the provider. Follow the verification prompts. If an address is already attached to another account, stop and review with support. Keep the original immutable Clerk user ID and its application namespace.
- Clerk's account linking uses verified ownership. Never merge students by display name or an unverified Microsoft email. Owner identity and privileges continue to require the existing server-side checks.
- An Alfaisal account requires actual consent testing. A staging success establishes eligibility for the development OAuth app tested. The exact production app may have a different publisher, scope or consent decision. If Microsoft displays **Need admin approval**, capture the error code and ask Alfaisal IT to review the exact application ID, publisher and permission request. Keep Google and email available. The project requires no enterprise SSO, directory synchronization or paid Microsoft or Clerk upgrade.

[Clerk account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking) · [Clerk UserProfile](https://clerk.com/docs/reference/components/user/user-profile) · [Microsoft tenant consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent)

## Acceptance and recovery

| Check | Acceptance evidence |
| --- | --- |
| Personal Microsoft | A new approved test user completes sign-up with a verified email and starts with an isolated namespace. Returning sign-in resolves to the same subject. |
| School or work Microsoft | An approved institutional test user returns from OAuth or the institution's policy and consent blocker is recorded. Confirm against the exact custom app before production availability is promised. |
| Existing student | With synthetic saved progress, connect Microsoft through Clerk's verified flow, sign out, sign in with Microsoft and verify the same subject, revision, academic groups and private file access. Try a different test account to confirm isolation. |
| Google and email | Existing routes still show both methods. Verify each callback using approved accounts. Verify no Apple option appears. |
| Errors | Cancel or deny consent, retry and fall back to an existing method. Review Clerk's `oauth_callback.failed` records without copying personal or credential details. |
| Owner and storage | Verify the same existing owner identity and step-up controls, access to existing progress, and the production D1/R2 bindings without migrating or resetting records. |

If Microsoft misbehaves after release, disable only that Clerk social connection. Users who added Microsoft can continue using their other verified methods. Confirm email and Google immediately. Use the Worker rollback from the production runbook if a separate code defect requires it. Preserve all Clerk accounts, linked identities, namespaces and storage.
