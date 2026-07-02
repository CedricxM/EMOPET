# EMOPET Pre-Launch Security Checklist

- [ ] Real `.env` files are not committed.
- [ ] `.env.example` contains placeholders only.
- [ ] Secrets listed in `SECURITY_ROTATION_REQUIRED.md` were rotated if any old values were real.
- [ ] `ADMIN_TOKEN`, `JWT_SECRET`, `REPORT_SHARE_SECRET` and `CORS_ORIGIN` are configured in production.
- [ ] Rate limiting uses a durable store in production.
- [ ] User-owned resources enforce ownership checks.
- [ ] Admin/internal routes enforce staff/admin permissions.
- [ ] Public map/community responses expose only public-safe fields.
- [ ] Private dog/profile/sensor/journal data is never exposed publicly.
- [ ] Supabase RLS is enabled and tested if Supabase is introduced later.
- [ ] Postgres indexes exist for common ownership and filtering keys.
- [ ] Production build passes.
- [ ] Node module-type warning for shared package output is resolved or accepted in CI.
- [ ] Backend typecheck/build/tests pass in CI.
- [ ] Logs avoid secrets, owner contact values and private animal data.
- [ ] Monitoring/alerting is configured with redaction.
- [ ] Backup/export/retention strategy is defined for owner data.
- [ ] Privacy policy and CGU are reviewed before public launch.


