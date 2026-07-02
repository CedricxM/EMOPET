# Security Rotation Required

This file intentionally lists variable names only. It does not contain secret values.

## Rotate If Previously Shared Or Committed

The previous root `.env.example` contained values that were not all clearly placeholder-only. If any of those values were copied from real development, staging or production credentials, rotate the corresponding provider secrets manually:

- `AUTH_SECRET`
- `JWT_SECRET`
- `REPORT_SHARE_SECRET`
- `ADMIN_TOKEN`
- `ADMIN_SEED_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ALMA_API_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `OPENWEATHERMAP_API_KEY`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- `EXPO_ACCESS_TOKEN`
- `SENTRY_DSN`
- `POSTHOG_API_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `DATABASE_URL`
- `REDIS_URL`

## Notes

- Local `.env` files are ignored by `.gitignore`, but this workspace is not an active Git checkout, so tracked history could not be verified here.
- Do not paste old values into issues, reports or chat logs while rotating.
- After rotation, update only local deployment secret stores and keep `.env.example` placeholder-only.
