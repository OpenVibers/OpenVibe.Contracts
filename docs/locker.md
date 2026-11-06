# Locker: end-to-end encryption for anything on OpenVibe

`locker.envelope@1` (`contracts/locker/envelope.v1.json`) is the format. The library that reads and writes it is
`openvibe-sdk/locker` (Node and the browser); `openvibe-sdk/locker/server` checks an envelope's header without
decrypting it.

Locker sits on top of sharing: sharing decides **who may fetch** a thing, Locker decides **who can read** it. With a
locked item, OpenVibe stores and serves only ciphertext, and the keys never reach our servers.

## The three locks

| Lock | Who can open it | What the header holds |
| --- | --- | --- |
| `people` | you and the people you shared with, each with their own key | one key slot per recipient |
| `password` | anyone you give the password to | one password slot (PBKDF2 parameters) |
| `link` | anyone with the full link | nothing: the key is in the part after `#` |

`share@1` carries the same three names plus `none` in its `lock` field, so a service knows how an item is sealed
without opening it.

## The envelope bytes

```
0      4      8                          8 + header length
+------+------+--------------------------+--------------------------+
| OVLK | len  | header JSON (UTF-8)      | chunk frames             |
+------+------+--------------------------+--------------------------+
```

* `OVLK` — four ASCII bytes. A service that does not know Locker can tell at once.
* `len` — the header length, unsigned 32-bit big endian.
* The header — the JSON object below, exactly `len` bytes, nothing else. The header is never encrypted: it holds no
  key material, only wrapped keys.

Each chunk frame is:

```
0      4      5                          17
+------+------+--------------------------+--------------------------+
| len  | flags| nonce (12 bytes)         | ciphertext + 16-byte tag |
+------+------+--------------------------+--------------------------+
```

* `len` — the ciphertext length, unsigned 32-bit big endian: the plaintext of the chunk plus the 16-byte GCM tag.
  Every chunk but the last holds a whole chunk (1 MiB) of plaintext; the last holds what is left of
  `padded_size`, which is more than zero bytes.
* `flags` — bit 0 (`0x01`) marks the **final chunk**. Every other bit is zero in this version.
* `nonce` — the 12-byte GCM nonce: the header's `nonce_base` (8 random bytes) followed by the chunk counter
  (unsigned 32-bit big endian). No nonce repeats inside one envelope.

## The header

```json
{
  "version": "locker.envelope.v1",
  "suite": "AES-256-GCM",
  "chunk_size": 1048576,
  "padded_size": 256,
  "nonce_base": "YmJiYmJiYmI=",
  "lock": "people",
  "slots": { "people": [ { "subject": {}, "algorithm": "ECDH-P256/HKDF-SHA256/AES-256-GCM", "recipient_key": "", "ephemeral_public_key": {}, "salt": "", "nonce": "", "wrapped_key": "" } ] }
}
```

* `version` — `locker.envelope.v1`. A new format is a new file and a new catalog entry.
* `suite` — `AES-256-GCM`. The content key is 32 bytes.
* `chunk_size` — 1 MiB, fixed in this version.
* `padded_size` — the size of the padded plaintext, in bytes. **The true size lives inside the encrypted
  content**, so the server cannot read it; this is the size it may store and show. It is padded with Padmé
  (see below) and is never below 256 bytes.
* `nonce_base` — eight random bytes, base64: the first half of every chunk nonce.
* `lock` — `people`, `password` or `link`. Exactly one slot kind is present, and it matches.
* `slots` — the key slots. The content key itself is never in the header.

### What is authenticated, and what is not

Every chunk authenticates the header's **core** as associated data:

```
AAD = UTF-8(canonical JSON of {version, suite, chunk_size, padded_size, nonce_base, lock})
    || counter (4 bytes, big endian)
    || flags (1 byte)
```

The canonical JSON is that object with its keys in exactly that order and no whitespace, which both ends build the
same way. So the framing, the size, the nonce base and the lock kind cannot be changed: the chunks stop verifying.

The **slots are deliberately outside that core**. Adding a member to a people-locked item wraps the content key for
the new member; it does not re-encrypt the content, so the header's core cannot change either. Each slot is
authenticated on its own instead: the slot's AES-GCM tag covers the content key *and* the slot's own parameters
(the subject, the ephemeral public key and the salt for a people slot; the iteration count and the salt for a
password slot). A slot therefore cannot be moved to another person, replayed from another envelope, or have its
parameters weakened in transit.

### The padded plaintext

The plaintext inside the chunks is:

```
8 bytes   the true length, unsigned 64-bit big endian
N bytes   the content
rest      zero padding, up to the next chunk boundary
```

`padded_size` counts all of it, padding included, and is never below 256 bytes. The length prefix is why the
server cannot learn the size: the real length is inside the encrypted part.

The padding is **Padmé** (Nikitin et al., "Reducing Metadata Leakage from Encrypted Files and Network Traffic",
PoPETs 2019): the length is rounded up to the next size on a grid that gets finer as the length grows. The
expansion is at most about twelve per cent (the worst case is 129 bytes padded to 144), the number of possible
padded lengths grows like the logarithm of the content size, so the padded size leaks O(log log n) bits about the
real one, and a short note costs 256 bytes rather than a whole megabyte. The chunk grid does not leak the size:
only the last chunk is shorter than a chunk, and its length is `padded_size` minus the whole chunks before it.

### The slots

**People slot** (`locker.people-slot@1`) — one per recipient:

```json
{ "subject": { "type": "user", "id": "usr_..." }, "algorithm": "ECDH-P256/HKDF-SHA256/AES-256-GCM",
  "ephemeral_public_key": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
  "salt": "<16 bytes, base64>", "nonce": "<12 bytes, base64>", "wrapped_key": "<48 bytes, base64>" }
```

The envelope has one ephemeral ECDH P-256 key pair. For each recipient the shared secret with their public key goes
through HKDF-SHA-256 (salt: the slot's `salt`, info: `openvibe-locker people-slot v1|<subject id>`), and the result
wraps the content key with AES-256-GCM. The recipient derives the same secret with their private key and the
envelope's ephemeral public key.

**Password slot** (`locker.password-slot@1`):

```json
{ "algorithm": "PBKDF2-SHA256/AES-256-GCM", "kdf": "PBKDF2-SHA-256", "iterations": 600000,
  "salt": "<16 bytes, base64>", "nonce": "<12 bytes, base64>", "wrapped_key": "<48 bytes, base64>" }
```

PBKDF2-SHA-256 with 600000 iterations and the slot's salt gives the wrapping key. The parameters live in the header
so they can be raised later: the reader takes the iteration count and the salt from the header, never from its own
defaults. The floor is 600000 and the ceiling is 10000000: the count may go up, never down, and a header outside
that range is refused before anything is derived, so a hostile header cannot make a reader work for hours.

**Link slot** (`locker.link-slot@1`) — empty, on purpose. A link lock stores no key: the content key travels in the
part of the link after `#`, which browsers never send to us.

## The key directory

A person's keys live on Network, opaque. The contracts are:

| API | Request contract | Response contract |
| --- | --- | --- |
| GET /api/v1/people/:subject/keys | none | locker.public-keys@1 |
| PUT /api/v1/me/keys | locker.keys-put-request@1 | locker.public-keys@1 |
| GET /api/v1/me/keys/backup | none | locker.key-backup@1 |

A person has two key pairs: an **ECDH P-256** pair that receives content keys, and an **ECDSA P-256** pair that signs
the fingerprint. The **fingerprint** is the first eight bytes of SHA-256 over both public keys, read as eight words
(256 words, eight bits each) in two groups of four, joined by a middle dot: it is short enough to say out loud and compare once. Sixty-four
bits, not thirty-two: a server that swapped in its own key would need about 2^32 key generations to land on the same
four words, and 2^64 for the eight. The signature over both public keys proves the holder owns the signing key, so a
key pair is self-certifying; a change of keys changes the fingerprint, and `locker.key-change@1` records it so a share
sheet can warn before sharing with a key nobody saw before.

The private keys are stored wrapped (`locker.key-backup@1`): PBKDF2-SHA-256 from the locker passphrase, then
AES-256-GCM. Network holds the protected copy and cannot open it. There is no reset: if the passphrase and the
recovery kit are both lost, nobody can open the locker, including OpenVibe.

## Sharing a locked item

`share@1` carries the lock kind, so a service knows how an item is sealed without opening it. For a **people** lock the
share API also carries the slots, because the slots are how the sharing and the encryption agree on who may read:

* **Adding someone** saves the member and that member's people slot together (`share.member-input@1.key_slot`). The
  caller wraps the content key for the person's current public key; the server never sees the content key. A member
  without a slot is refused (`share.slot_required`), and a slot made for another key is refused (`share.key_changed`)
  after the slot's `recipient_key` is compared with the thumbprint of the person's key as the key directory has it now.
* **Removing someone** is a re-seal, not a row deletion: the caller sends the content sealed again for those who stay
  (`share.update-request@1.envelope`) and the service stores it before it drops the member. Without an envelope the
  request is refused (`share.reseal_required`). Someone who already opened the item keeps what they saw; the fresh
  content key only stops the next fetch from opening.
* **A transfer** carries the recipient's slot at offer time (`share.transfer-request@1.key_slot`), and on acceptance the
  former owner's access goes unless they kept it.
* **The read** answers each member's slot, and for the owner the member's current fingerprint and whether it changed
  since the slot was made, which is what the sheet needs to warn and re-wrap.

## What a service does with a locked item

`openvibe-sdk/locker/server` gives a service the checks in one place: it reads the header and checks its shape and
its size, **without decrypting anything**. Then the service:

* skips indexing, previews, thumbnails, transcoding and content AI;
* shows the lock badge;
* serves the bytes only to the people `canView` allows.

A locked item is never public: everyone is disabled, and links are rate-limited. Locked storage has per-account
quotas. Normal abuse reports work by account and link; a recipient who reports may choose to disclose the content key
to moderators, which opens that one item only.

## What we cannot do

We cannot scan or moderate what is inside a locked item. That matters most for uploads. A recipient can always keep
what they opened, and the server still sees who owns what, how big it is (padded) and when.
