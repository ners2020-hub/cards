# Admin artwork

Generate artwork from the card name, element, type, description, and optional art direction. Preview it, choose **Use this artwork**, then save the card draft. Drafts do not automatically publish playable cards or implement abilities.

Set `OPENAI_API_KEY` in Supabase Edge Function secrets, never in browser code, Git, or chat. **Check connection** checks secret presence, not provider billing/model access. API billing is separate from ChatGPT usage.

The service requests one medium-quality portrait JPEG using `gpt-image-2.5-flare`. It checks the authenticated user's `game_admins` role before accepting requests and before generation. Job tables have no browser access. Artwork is publicly viewable; storage writes require the protected service.

Limits: one active job per admin, 10 attempts per admin and 30 sitewide per rolling 24 hours, including failures. Repeated request IDs retrieve the existing job; provider calls are never automatically retried. An interrupted request may still be billed. Regeneration starts a new paid attempt.

Validation: `node scripts/test-admin-art.mjs` passed mocked authorization, quota, retry, and provider tests. `supabase/admin-art-tests.sql` passed in a rolled-back live transaction. Admin lint, production build, unsigned endpoint rejection, and CORS preflights passed. Real paid generation and signed-in upload/save still need end-to-end verification after provider setup.

[OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
