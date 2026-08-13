# @staticbot/base44-supabase-shim

Drop-in shim that exposes the **same surface as `@base44/sdk`** but routes
every call to a **Supabase** backend (Postgres + GoTrue + Storage + Edge
Functions). Built so you swap one import in `src/api/base44Client.js` and
your hundreds of pages keep working.

This is the runtime shim Staticbot's Base44 → Supabase migration vendors into
your repo as the final step of the migration. You can also use it standalone
if you're doing the migration by hand.

## Install (automated path — done for you by Staticbot)

Staticbot's Base44 native migration vendors the prebuilt `dist/` directly into
your repo at `vendor/base44-supabase-shim/` and patches `package.json` to point
at it. You don't need to do anything manually — just merge the PR that lands
on the `staticbot/base44-switchover-<id>` branch.

## Install (manual)

In each consuming app, vendor the prebuilt tarball or add as a git submodule
(so builds don't depend on an npm registry):

```sh
# Option A: git submodule (you'll need to build it once locally)
git submodule add https://github.com/staticbot/staticbot-base44-supabase-shim.git vendor/base44-supabase-shim
cd vendor/base44-supabase-shim && npm i && npm run build

# Option B: vendor the prebuilt tarball straight from the npm registry
#   (same URL shape staticbot-app's Base44ShimProperties.getDistTarballUrl builds)
curl -L https://registry.npmjs.org/@staticbot/base44-supabase-shim/-/base44-supabase-shim-0.4.0.tgz \
    | tar -xz -C vendor/base44-supabase-shim --strip-components=1
```

In `package.json`:

```json
{
  "dependencies": {
    "@staticbot/base44-supabase-shim": "file:./vendor/base44-supabase-shim",
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

## Use (browser / Vite app)

```js
// src/api/base44Client.js  — replace @base44/sdk import
import { createClient } from '@staticbot/base44-supabase-shim';

export const base44 = createClient({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  schemaPrefix: 'propertyflow',          // app-specific schema
  sharedSchema: 'core',                  // shared entities live here
  // sharedEntities default: ['Customer','Company','User','Role','Department','Notification','AuditLog']
});

// Then everything in your existing pages keeps working:
const customers = await base44.entities.Customer.list('-created_date', 50);
const c = await base44.entities.Customer.get('uuid');
await base44.entities.Customer.update('uuid', { phone: '081...' });
await base44.entities.Unit.create({ unit_no: 'A-101' });
```

## Use (Supabase Edge Function — Deno)

```ts
import { createClientFromRequest } from 'npm:@staticbot/base44-supabase-shim/server';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req, {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    schemaPrefix: 'propertyflow',
  });

  const customers = await base44.asServiceRole.entities.Customer.filter(
    {},
    '-created_date',
    50,
  );
  return new Response(JSON.stringify({ data: customers }));
});
```

## Entity → table mapping

Default rule: PascalCase → snake_case + plural.
- `Customer` → `customers`
- `ChartOfAccount` → `chart_of_accounts`
- `MeetingMinute` → `meeting_minutes`

Override via `entityMap` if a real table doesn't follow the rule:

```js
createClient({
  ...,
  entityMap: {
    Customer: { schema: 'core', table: 'customers' },        // explicit
    Job: { schema: 'construction', table: 'project_jobs' },  // non-default name
  },
});
```

## Filter syntax

```js
// Equality (default)
await base44.entities.Customer.filter({ status: 'active', vip: true });

// IN (pass array)
await base44.entities.Customer.filter({ id: ['a', 'b', 'c'] });

// Operators
await base44.entities.Invoice.filter({
  amount: { op: 'gt', value: 1000 },
  customer_name: { op: 'ilike', value: '%co.%' },
});
```

Operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`.

## Order by

- String form (Base44 convention): `'name'` ascending, `'-created_date'` descending.
- Object form: `{ field: 'name', ascending: false }`.

## Auth surface

Base44 alias names are supported alongside Supabase-idiomatic ones so migrated
apps compile unchanged:

- `auth.signIn({email, password})` / `auth.loginViaEmailPassword(email, password)`
- `auth.signUp({email, password, metadata?})` / `auth.register({email, password, metadata?})`
- `auth.loginWithProvider(provider, returnPath?)` — Google / Microsoft / Facebook / Apple; builds an absolute `redirectTo` from `window.location.origin`.
- `auth.verifyOtp({email, otpCode})` — email OTP after `register()`. Returns `{access_token, session, user}`; the Supabase session is installed as a side-effect so a follow-up `setToken()` is a no-op.
- `auth.resendOtp(email)`
- `auth.setToken(accessToken)` — kept as a warn-once no-op so migrated code doesn't `TypeError`; the session is already installed by `verifyOtp` / `signInWithPassword`.
- `auth.resetPasswordRequest(email, {redirectTo?})` — Supabase `resetPasswordForEmail`.
- `auth.resetPassword({resetToken, newPassword})` — `resetToken` is ignored (Supabase already exchanged the link fragment for a session before you got here).
- `auth.isAuthenticated(): Promise<boolean>`
- `auth.logout(returnUrl?)` — after signOut resolves, navigates to `returnUrl` if provided.
- `auth.me()` / `auth.updateMe(metadata)` / `auth.getUser()` / `auth.getSession()` / `auth.redirectToLogin(returnUrl?)` / `auth.onAuthStateChange(cb)`

## Agents

Base44's hosted agents (WhatsApp / Telegram) have no self-host equivalent. The
`agents` namespace exposes a stub so `base44.agents.getWhatsAppConnectURL(name)`
doesn't crash — it returns `null` by default, which lets `<a href={...}>` render
as an inert link (feature visibly disabled). Wire your own bridge with:

```js
createClient({
  ...,
  agents: {
    whatsappUrls: { SubdomainReviewer: 'https://wa.example.com/connect' },
  },
});
```

## What's NOT covered

- **Stripe / payments** — Base44 had managed integration; here, wire Stripe into
  edge functions yourself.
- **Email** — air-gapped LAN can't send mail by default; supply an internal
  SMTP relay or capture via inbucket. Enable via `integrations.sendEmailFunction`.
- **AI / `InvokeLLM` / `GenerateImage`** — opt-in only. Wire your own endpoint
  through an edge function and pass its name via `integrations.invokeLlmFunction`
  / `integrations.generateImageFunction`.
- **Schema discovery** — entity definitions must exist in Postgres first
  (separate migrations). The shim assumes tables exist with conventional names.

## Test

```sh
npm i
npm test       # vitest, mocked SupabaseClient
npm run build  # tsup → dist/
```

## Releasing

Manual recipe. The shim ships to the public npm registry — that's where the
tarball is fetched at Base44 switchover time (staticbot-app's
`Base44ShimProperties.cdnBaseUrl` defaults to
`https://registry.npmjs.org/@staticbot/base44-supabase-shim/-`, so
`getDistTarballUrl()` produces the standard unpkg-style URL). npm's CDN is
public + immutable per version — no bucket, no ACL, no S3 CLI.

### 1. Prep

```sh
# From a clean working tree:
npm run typecheck && npm test && npm run build
```

Bump `version` in `package.json` to the new semver. Additive changes → minor;
bugfix-only → patch. Breaking changes need a coordinated rollout (see step 4).

### 2. Publish to npm

```sh
npm publish --access public
# `--access public` is required for scoped packages (@staticbot/*).
# `npm whoami` first if you're not sure you're logged in as the maintainer.
```

Verify the tarball resolves at the URL the worker will hit:

```sh
curl -I https://registry.npmjs.org/@staticbot/base44-supabase-shim/-/base44-supabase-shim-<version>.tgz
# expect: HTTP/2 200, content-type: application/octet-stream
```

**Never overwrite / re-publish a version.** npm forbids it by default (you'd
have to `npm unpublish` first, which npm strongly discourages and blocks after
72h). Even if you could, the worker caches by URL hash
(`SHIM_CACHE_ROOT/<sha256(url)[:16]>/`) — an in-place replacement is invisible
to any worker that already cached the version.

### 3. Tag + push

```sh
git add -A
git commit -m "v<version>: <short changelog>"
git tag v<version>
git push origin main --tags
```

### 4. Roll out the version pin in staticbot-app

Two places reference the pinned version — bump both, otherwise integration tests
will fail against the newly-published tarball URL:

- `staticbot-app`'s `Base44ShimProperties.version` default (and matching docs).
- `staticbot-control-center`'s `test_phase7_base44_switchover.py` fixtures — the
  module-level `_make_shim_tarball(version=...)` default, the `shim_version` /
  `shim_dist_url` keys returned by the `_input_data(...)` helper, and the
  `package.json` version fixture in the shim-tarball setup used by the
  `TestCommitFilesToBranch`-style tests.

Then either **redeploy staticbot-app** to bake in the new default, or **hot-flip
in prod** by setting `BASE44_SHIM_VERSION=<new>` in the Spring env — the value
in `application.yml` under `application.base44-shim.version` reads
`${BASE44_SHIM_VERSION:<default>}`, so the env override takes effect immediately
for any new BASE44_SWITCHOVER job with no restart.

If you ever need to mirror the tarball off npm (self-host CDN, air-gapped
customer, etc.), the second knob is `BASE44_SHIM_CDN_BASE_URL` — point it at any
directory that serves `base44-supabase-shim-<version>.tgz`. Same URL shape npm's
`/-/` path uses; no code change required.

### 5. Rollback

If a customer migration reports a bad shim release, flip `BASE44_SHIM_VERSION`
back to the last-known-good version in prod env — no code deploy needed.
Already-running switchover jobs continue with whatever tarball they cached; only
new jobs pick up the flip. That's why step 2's "never re-publish" rule is
load-bearing.
