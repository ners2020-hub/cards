# Fatebound TODO

## Planned features

- [x] Implement AI artwork generation in the admin card creator (provider activation pending).
  - Add a Generate artwork button using the card's name, element and description, with optional art direction.
  - Let the creator preview, regenerate and select an image before saving the card draft.
  - Save selected artwork through the card artwork storage flow.
  - Configure a server-side image-generation API connection; keep credentials out of the browser and restrict generation to admins.
  - Add generation limits and clear loading/error feedback to control costs and prevent duplicate requests.
  - Publish after the pending artwork upload work and generation provider configuration are complete.

- [ ] Add a daily card spin.
  - Allow each signed-in player one spin per day.
  - Show an animated roll with individual cards visibly passing through, slowing down to reveal the winning card.
  - Award exactly one card per spin and add it to the player's saved collection.
  - Select and save the reward on the server so refreshing or retrying cannot reroll or duplicate it.

## When Supabase/Codex credits are available

- [ ] Finish and publish admin card artwork uploads.
  - Apply `supabase/storage.sql` to create/update the public `card-art` bucket with a 5 MB image limit.
  - Deploy the updated `supabase/functions/admin/index.ts` Edge Function.
  - Run the admin UI lint and production build.
  - Push the changes to GitHub and publish the updated Site.
  - Verify the upload endpoint returns `401` when signed out and `403` for signed-in non-admins.
  - Verify an admin can upload PNG, JPEG, WEBP and GIF artwork and save the returned URL in a card draft.

Update 2026-09-23: Storage and protected upload/generation services deployed; admin lint, production build, mocked generation tests, and rolled-back database permission/quota tests passed. Configure OPENAI_API_KEY in Supabase Edge Function secrets and verify a real paid generation. Signed-in upload/save verification and GitHub backup sync remain pending.
