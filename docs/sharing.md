# Sharing on OpenVibe: core contracts

`share@1` (`contracts/share/share.v1.json`) is the uniform GET/PUT response. Resource refs are `{ service, kind, id }`; every subject is `identity.subject-ref@1`, never a local id or bare string.

| API | Request contract | Response contract |
| --- | --- | --- |
| GET /api/v1/{kind}/{id}/share | none | share@1 |
| PUT /api/v1/{kind}/{id}/share | share.update-request@1 | share@1 |
| POST .../share/requests | share.access-request-create@1 | share.access-request@1 |
| POST .../share/transfer | share.transfer-request@1 | share.transfer@1 |
| POST .../share/transfer/{accept,decline,cancel} | share.transfer-action-request@1 | share.transfer@1 |
| GET /api/v1/shared-with-me | limit (1–100), cursor (opaque) | share.list-result@1 |

PUT replaces members when `members` is present; omitted fields are unchanged. `name` and `subject` are mutually exclusive. Names are exact, resolved by Network with per-caller rate limiting; there is no global suggestion endpoint. The agent SDK `.add()` preserves existing members.

Public is listed and viewable by anyone; link is viewable by link but excluded from listings/indexes. People admits active members; private admits the owner. Editors may edit only with people audience. An unexpired pending transfer permits its recipient to preview in any audience. Staff moderation is an authenticated server assertion and every override is audited. A denied resource returns generic 404 with no title or content.

Transfer actions must include `transfer_id`, preventing a stale notification from accepting a newer offer. Only the exact recipient subject can accept/decline; only the owner can cancel. Seven-day expiry is enforced at access and action time. Accept removes the old owner's membership unless `keep_access` is true (viewer); public/link viewing remains inherent to that audience. Private becomes people when keeping the old owner as viewer, so the chosen retained access works. These operations are atomic and log outgoing/incoming ownership separately.

The events are `share.granted`, `share.revoked`, `share.transfer.requested`, `share.transfer.accepted`, `share.transfer.declined`. Payloads never carry titles or content in **any** audience. Network owns these shared contracts and adopting services use their own event source and declare produced types in their manifests. Audience changes, cancellation and expiry emit appropriate grant/revoke effects; notification kinds are `share.added`, `share.access_requested`, `share.transfer.requested`, `share.transfer.answered`.

Service integration must enforce `canView` on pages, raw/download/API, embeds, media proxies, comments and previews. Only public resources may be indexed, exported to search, listed in sitemaps or have content previews/events; even an owner viewing a private item must not export its content. Store media private and serve it through a checked service proxy. The SDK core does not retrofit adopting service routes.
