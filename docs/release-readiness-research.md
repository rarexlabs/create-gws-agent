# npm release-readiness research

Checked 2026-07-22 PDT (2026-07-23 UTC). Sources are npm's official documentation and public registry only.

## Conclusion

`create-gws-agent` appears available now: the live registry request to [`GET https://registry.npmjs.org/create-gws-agent`](https://registry.npmjs.org/create-gws-agent) returned HTTP `404` with `{"error":"Not found"}` at 2026-07-23 01:33 UTC. This is a point-in-time result, not a reservation. Recheck immediately before publishing; npm also requires an unscoped name to be unique, not confusingly similar to another package, lowercase, and policy-compliant ([name guidelines](https://docs.npmjs.com/package-name-guidelines/)).

The repository is close to an initial release. Its package is unscoped, has `publishConfig.access: "public"`, and declares the MIT license. Before using GitHub trusted publishing/provenance, add the exact public GitHub repository to `package.json` as `repository.url`; npm requires it to match the publishing repository exactly ([trusted publishing troubleshooting](https://docs.npmjs.com/trusted-publishers/#troubleshooting)). The repository currently has no configured Git remote, so the value cannot be inferred here.

## Mandatory prerequisites

- Create an npm user account. A paid plan is not listed as a requirement for an unscoped public package; unscoped packages are always public and are managed by user accounts rather than organizations ([unscoped public packages](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/), [scope/access matrix](https://docs.npmjs.com/package-scope-access-level-and-visibility/)).
- Verify the account email before publishing. npm explicitly requires email verification for publication ([account setup](https://docs.npmjs.com/creating-a-new-npm-user-account/)).
- For creating and directly publishing any package, use either account 2FA during an interactive publish or a read/write granular access token created with **Bypass 2FA** enabled ([publishing 2FA requirement](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)). Interactive 2FA is the safer choice for the initial release.
- Ensure `package.json` is valid and has the intended unique `name` and unused `version`; do not set `private: true`, which prevents publication. npm will reject an existing name/version pair, and a published pair can never be reused even after unpublishing ([`package.json`](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [`npm publish`](https://docs.npmjs.com/cli/v11/commands/npm-publish/)).

## Token requirements

- As of November 2025, npm supports only granular access tokens; legacy access tokens have been removed ([access tokens](https://docs.npmjs.com/about-access-tokens/)).
- A non-interactive token publish requires a read/write granular token with **Bypass 2FA** selected at token creation. Without that setting, the package/account 2FA policy still applies. Granular tokens can be limited by package/scope, expiry, and CIDR; use the smallest practical permissions ([access tokens](https://docs.npmjs.com/about-access-tokens/)).
- npm recommends trusted publishing with OIDC instead of long-lived publish tokens where supported ([trusted publishers](https://docs.npmjs.com/trusted-publishers/)).

## Initial manual publish

Run from the package root:

```sh
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm view create-gws-agent --registry=https://registry.npmjs.org/
npm test
npm pack --dry-run
npm publish --dry-run --access public
npm publish --access public
```

`npm login` saves registry credentials and `npm whoami` verifies the authenticated identity ([`npm login`](https://docs.npmjs.com/cli/v11/commands/npm-login/), [account login test](https://docs.npmjs.com/creating-a-new-npm-user-account/)). An `E404` from `npm view create-gws-agent` is the expected availability signal; if metadata is returned, stop because the name is registered ([`npm view`](https://docs.npmjs.com/cli/v11/commands/npm-view/)). Review the dry-run contents for secrets and unnecessary files before publishing ([unscoped publishing checklist](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/), [`npm publish` file selection](https://docs.npmjs.com/cli/v11/commands/npm-publish/#files-included-in-package)).

For this unscoped package, `npm publish` alone is sufficient because unscoped packages are always public; `--access public` is explicit and consistent with the existing `publishConfig`. npm's current publish command defaults new packages to public and does not allow unscoped packages to be restricted ([`npm publish` access](https://docs.npmjs.com/cli/v11/commands/npm-publish/#access)). Complete the 2FA challenge when prompted.

Afterward, verify:

```sh
npm view create-gws-agent name version dist-tags --registry=https://registry.npmjs.org/
```

## Recommended hardened release path

1. Publish the first version interactively with account 2FA. A trusted-publisher relationship cannot be configured until the package already exists ([`npm trust` prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites)).
2. Add an exact public `repository.url` to `package.json`, create a tag-triggered CI release that runs install/build/test/publish, and configure the package's trusted publisher in npm settings. Trusted publishing requires npm CLI `11.5.1+`, Node `22.14.0+`, a supported cloud-hosted runner, and OIDC permission; GitHub Actions needs `permissions: id-token: write` ([trusted publishers](https://docs.npmjs.com/trusted-publishers/)). This machine's Node `24.11.1` and npm `11.6.2` meet the publish-workflow minimum, although `npm trust` and staged publishing require npm `11.15.0+`; upgrade npm or configure trust on the npm website ([`npm trust`](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites), [staged publishing](https://docs.npmjs.com/staged-publishing/)).
3. Prefer GitHub Actions or GitLab CI/CD trusted publishing for automatic provenance. It requires a public package from a public repository; the package repository field must match the source repository. No `--provenance` flag is needed when trusted publishing is used ([provenance](https://docs.npmjs.com/generating-provenance-statements/), [automatic provenance](https://docs.npmjs.com/trusted-publishers/#automatic-provenance-generation)).
4. After OIDC publishing works, set Publishing access to **Require two-factor authentication and disallow tokens**, then revoke unused publish tokens. For maximum assurance, npm recommends granting the trusted publisher only staged-publish permission, followed by human review and 2FA approval ([trusted-publishing security guidance](https://docs.npmjs.com/trusted-publishers/#recommended-restrict-token-access-when-using-trusted-publishers)).
5. For each release, run tests and inspect `npm pack --dry-run`; use a new semantic version because published name/version pairs are immutable. npm recommends semantic versioning and recommends `1.0.0` for a first release, although the repository's current `0.1.0` is valid if the project intentionally signals a pre-1.0 API ([semantic versioning](https://docs.npmjs.com/about-semantic-versioning/), [`npm publish`](https://docs.npmjs.com/cli/v11/commands/npm-publish/)).

If provenance on the very first version is required, the manual-first path will not provide it. Instead, publish that version from supported public-repository CI with a temporary granular write token with Bypass 2FA and `npm publish --provenance --access public`, then configure trusted publishing and revoke the token. Manual/local publishing cannot produce npm provenance, and trusted publishing cannot be configured before the package exists ([generating provenance](https://docs.npmjs.com/generating-provenance-statements/), [`npm trust` prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/#prerequisites)).

## Local verification note

The normal `npm run pack:check` hit a local `~/.npm` cache permission error in this environment, unrelated to package contents. Re-running `npm pack --dry-run` with a writable temporary cache succeeded and showed only the intended README, CLI, package metadata, and template files. Resolve the local cache ownership or point npm at a writable cache before relying on the scripted check during release.
