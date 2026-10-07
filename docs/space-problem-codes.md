# OpenVibe.Space problem codes

Space returns `errors.problem@1` (`application/problem+json`). Its `code` is stable and its default `type` is `https://openvibe.network/problems/<code>`. Space's `server/forum/service.js`, `server/identity/blocks.js`, `server/forum/routes.js`, and `server/events-consumer.js` issue these `space.*` codes:

| Status | Code | Meaning |
| --- | --- | --- |
| 403 | `space.blocked` | The author or moderator target has a blocking relationship with the caller. This also refuses adding a space moderator when either person blocked the other. |
| 404 | `space.not_found` | The space or requested parent space does not exist, or a staff space is hidden from the caller. |
| 403 | `space.staff_only` | Only discussion staff can post in this space. |
| 403 | `space.staff_threads` | Only staff can start a Roadmap thread. |
| 400 | `space.invalid_name` | A space needs a valid name. |
| 400 | `space.invalid_style` | The style must be `feed` or `forum`. |
| 400 | `space.invalid_kind` | The kind must be `discussion`, `request`, or `roadmap`. |
| 400 | `space.invalid_parent` | The parent creates a cycle or nests boards too deeply. |
| 400 | `space.invalid_slug` | The requested slug is invalid or reserved. |
| 409 | `space.slug_taken` | The requested slug already belongs to a space. |
| 403 | `space.reactions_off` | Ratings are off in this space. |
| 403 | `space.votes_off` | Votes are off in this space. |
| 403 | `space.internal_only` | The Events delivery route only accepts local requests. |
| 503 | `space.events_disabled` | The Events delivery secret is not configured. |
| 401 | `space.bad_signature` | The Events delivery signature is invalid or outside its replay window. |
| 400 | `space.bad_delivery` | The Events delivery body is malformed. |
| 500 | `space.event_failed` | Processing an Events delivery failed; Events may retry it. |

`community.blocked` remains a Community code for its surviving comment and paste routes. Space uses its own `space.blocked` namespace for forum operations.
