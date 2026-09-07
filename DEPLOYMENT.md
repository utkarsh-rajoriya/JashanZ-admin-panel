# Deployment — JashanZ-admin-panel

CI/CD is implemented via GitHub Actions. This app serves four internal portals — `admin.jashanz.com`, `support.jashanz.com`, `finance.jashanz.com`, `admanager.jashanz.com` — from one build; all four domains share the exact same `dist/` output and S3 bucket, with the app branching by route internally (each portal has its own login page and route tree).

## Workflows

### `.github/workflows/ci.yml`

Runs on every pull request targeting `main`, and on every push to `main`. Never touches AWS, never deploys.

1. Checkout
2. `npm ci`
3. `npm run lint`
4. `npm run build`

### `.github/workflows/deploy-production.yml`

Runs **only** on a push to `main` — never on a pull request, so a PR (including one from a fork) can never reach the AWS credentials this workflow uses.

1. Checkout, install, lint (same checks as CI, run independently)
2. `npm run build` with `VITE_API_URL` injected as a build-time environment variable — baked directly into the compiled JS bundle
3. Authenticate to AWS via OIDC (no long-lived AWS keys anywhere in this repo or its GitHub Secrets)
4. `aws s3 sync dist/ s3://<bucket> --delete` — safe here specifically because this bucket's entire content is this build's output and nothing else; `index.html` is synced separately with `no-cache` headers so a new deploy is visible immediately
5. CloudFront cache invalidation (`/*`) — runs only if the S3 sync above succeeded

## Required GitHub repository configuration

### Secrets

None required for this workflow — OIDC replaces the need for stored AWS credentials.

### Variables (Settings → Secrets and variables → Actions → Variables)

| Name                               | Purpose                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                     | Production API base URL, e.g. `https://api.jashanz.com/api/v1` — public, not sensitive, safe as a Variable |
| `AWS_DEPLOY_ROLE_ARN`              | IAM role this workflow assumes via OIDC                                                                    |
| `AWS_REGION`                       | Target AWS region                                                                                          |
| `S3_BUCKET_ADMIN`                  | Target S3 bucket name                                                                                      |
| `CLOUDFRONT_DISTRIBUTION_ID_ADMIN` | Target CloudFront distribution to invalidate                                                               |

**Never put a secret in a `VITE_*` variable** — everything prefixed `VITE_` is bundled into the public JS output and downloadable by anyone who loads the app, including staff members without SUPER_ADMIN access.

## Required AWS setup (not created by this task — infrastructure, not code)

- **IAM role** for GitHub OIDC, trust policy restricted to this repo and the `main` branch only. Minimum permissions: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` scoped to the admin bucket ARN only, and `cloudfront:CreateInvalidation` scoped to the one distribution ARN only. No `AdministratorAccess`.
- **A separate S3 bucket and CloudFront distribution from the website repo** — this is internal backoffice tooling, keep it deployed with its own scoped IAM role rather than reusing the website's role, even though the deploy mechanism is identical.
- **GoDaddy DNS**: `admin`, `support`, `finance`, `admanager` CNAME/ALIAS records all pointed at this one CloudFront distribution's domain name.
- **GitHub branch protection on `main`**: require the `CI` workflow to pass before merging.

## Rollback

Same approach as the website repo: `git revert` the bad commit on `main` and let `deploy-production.yml` redeploy. No previous build is retained in S3 once `--delete` runs — enable S3 bucket versioning on the admin bucket if a retained-previous-build safety net is wanted later.
