# Tiotrack Tracker V2.1 — Shark custom domains

This patch extends automatic outbound-link decoration to Shark links served on custom/branded domains.

It keeps the existing protections:
- does not decorate same-origin links merely because they are external-looking
- supports `data-tio-no-decorate`
- preserves existing destination parameters
- always sets the deterministic Tiotrack `click_id`
- preserves captured attribution params such as `ttclid` and UTMs

New detection:
- `serverflow.dad`
- any URL containing `shk`
- configured outbound domains
- external links whose path begins with `/l/`, `/c/`, or `/b/`

This covers links such as:
`https://phantoms.group/l/...`

Apply from the Tiotrack project root:
`unzip -o ~/Downloads/tiotrack-tracker-v2.1-shark-custom-domain.zip -d .`

Then:
`npm run build`
`vercel --prod`
