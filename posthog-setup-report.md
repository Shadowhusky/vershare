<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into VerShare. Client-side tracking is initialized via `instrumentation-client.ts` (Next.js 15.3+ pattern) with a `/ingest` reverse proxy configured in `next.config.ts` for reliable event delivery. Server-side tracking uses `posthog-node` via a shared `src/lib/posthog-server.ts` helper, capturing critical business events at the API boundary. User identification is wired into all auth flows — email/password login, registration, Google OAuth, and email verification — with `posthog.reset()` called on logout to separate sessions.

| Event | Description | File |
|-------|-------------|------|
| `share_created` | User successfully creates a share (client-side, after UI submit) | `src/components/create/CreatePanel.tsx` |
| `share_link_copied` | User copies the share link from the success box | `src/components/shared/ShareLinkBox.tsx` |
| `file_downloaded` | User clicks the download button on a file share | `src/components/view/FileView.tsx` |
| `user_logged_in` | User logs in via email/password (client-side) | `src/components/auth/AuthModal.tsx` |
| `user_registered` | New user creates an account via email/password (client-side) | `src/components/auth/AuthModal.tsx` |
| `user_email_verified` | User successfully verifies their email address | `src/components/auth/AuthModal.tsx` |
| `user_logged_in` | Google OAuth sign-in success (client-side) | `src/components/auth/AuthModal.tsx` |
| `share_deleted` | Owner deletes one of their shares | `src/components/view/ShareView.tsx` |
| `share_expiry_updated` | Owner changes a share's expiry (extend/permanent/temporary) | `src/components/view/ShareView.tsx` |
| `user_registered` | New user registration captured server-side | `src/app/api/auth/register/route.ts` |
| `user_logged_in` | Email/password login captured server-side | `src/app/api/auth/login/route.ts` |
| `google_sign_in` | Google OAuth success captured server-side | `src/app/api/auth/google/route.ts` |
| `share_created` | Share creation captured server-side (file and text paths) | `src/app/api/shares/route.ts` |

## Next steps

We've built some insights and a dashboard to keep an eye on user behavior:

- [Analytics basics (wizard) dashboard](https://eu.posthog.com/project/200136/dashboard/742692)
- [Shares created over time](https://eu.posthog.com/project/200136/insights/pT39GdJs)
- [New user registrations](https://eu.posthog.com/project/200136/insights/yygZOa3J)
- [File downloads](https://eu.posthog.com/project/200136/insights/DTZU70FT)
- [Registration to first share funnel](https://eu.posthog.com/project/200136/insights/EcIxNWH4)
- [Shares by content type](https://eu.posthog.com/project/200136/insights/W8cBh2wq)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
