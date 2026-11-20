---
layout: ../../../layouts/CapabilityTestReport.astro
title: Capability test results
description: Six capabilities passed on a physical Android 16 phone. Common and Upload also passed on an Android 16 emulator.
release: Hypergolic v0.2.0
date: 20 November 2026
---

Both devices ran the distributed, production-signed Android arm64 APK, build 2. The tests used signed, published napplets and disposable accounts in the release workspace. Each result names the device on which it passed. iOS verification is pending. [Download the v0.2.0 release](https://github.com/nostrocket/hypergolic/releases/tag/v0.2.0)

**Release APK SHA-256** · `3fa70f253e906adc82eea181081991f967869c7507e704ca41c4a476998a3377`

## Storage

**Passed on a physical Android 16 phone.** State Lab used the same key to store different strings in shared and per-instance storage. Reads and key listings matched the writes. Both values survived a cold restart. A second instance could read the shared value and started with empty per-instance storage. Removing each key produced a missing value and an empty listing in its scope. These checks exercised all four operations. [Storage contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/capability-contract.md)

State Lab manifest event ID · `2fffeb1ebb31decc372cae8c190cadfb163b49071da6cb17ad391fcf3965ba30`

## Common

**All eight operations passed on a physical Android 16 phone and in a separate Android 16 emulator run.** On each device the napplet encoded and decoded a disposable target’s NIP-19 identifier, looked up its signed profile by name and read the active account’s follow list. Each device used its own disposable local signer. After native review, the napplet received signed results for follow, unfollow, a custom emoji reaction and a report on the synthetic test event.

An independent subscriber on nos.lol verified the IDs, signatures, authors, targets and tags for these eight events.

| Operation | Physical phone event | Emulator event |
| --- | --- | --- |
| Follow | `306da258836db2883edac7ef129b8a5704183803d8f60b9e2c2bd01029ce0b54` | `c5798f25f0789e6fb8d31779377fb7e496d55d9cc98229c2424ba289609e588f` |
| Unfollow | `f698a8763e81ecdeaabc94d68ff6207d0b41106d5ed4e6457aad8c469200922b` | `0e3efe697b1ecd723bcac86fca9875e3785e71dd0f1dfc24b2abb48619ed8b2a` |
| Custom emoji reaction | `4c3bbd5e5f6aad6e29c129d67a89ca4feca4bd5c2cf917d64e38b22bd54002e3` | `aa7de4c7635d5c118f3af170f2c5c7a445b464a3eb5616838aed9ad89f2f32f7` |
| Event report | `a63bbdc0fa941e0ef454a3eef41382dc3911d471a74048936cb45985dae6034b` | `80efa1208f9a9a89a8f3f692d203442f8647a6e06ed341e9cf5d5c21c6248524` |

Follow and unfollow each replaced the kind-3 follow list. The emulator account started with an empty follow list. After the five-minute read cache expired on the emulator, the napplet returned the followed key. The reaction and report targeted a synthetic note from the test publisher. The report gave “other” as its reason and identified the test. The release limits each signed event to 8 KiB. [Common social operations](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/common-social.md)

## Link

**Passed on a physical Android 16 phone.** Refusing the HTTPS request returned `denied` to the napplet. Approving the URL opened Android’s app chooser. Selecting Mi Browser launched the browser. On return to Hypergolic, the calling napplet showed `opened`. [External link contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/external-links.md)

## Notify

**Passed on a physical Android 16 phone.** The napplet received a denial for the “Release checks” channel, followed by a grant on its second request. A separate general permission let it set the in-app badge to 3. In the notification centre, an action tap, a body tap and a dismissal each returned the expected card ID and callback. The action included its action ID, and the dismissal included its reason. The napplet dismissed a fourth card and reset the badge to zero. The empty centre cleared its launcher. [In-app notifications](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/notifications-configuration.md)

Notification test manifest event ID · `61d4cf08076f9bbadebdf88e8f9bd9563137e4ace3d2cb1f7ce50fdc99d3c02b`

## Theme

**Passed on a physical Android 16 phone.** The napplet declared Theme optional. It read the initial dark palette and received a callback when the phone switched to light and again when it switched back to dark. A fresh read after each change agreed with the callback. [Release theme service](https://github.com/nostrocket/hypergolic/blob/v0.2.0/runtime/src/shell-theme.ts)

| Appearance | Background | Text | Primary |
| --- | --- | --- | --- |
| Dark | `#080F17` | `#EEF3F7` | `#F5A04B` |
| Light | `#FFFFFF` | `#17202A` | `#AA4708` |

Theme test manifest event ID · `f4c608e1c913acb5ae308383e05dc87ea26d2eb7743aca692ffb192ab595f58c`

## Upload

**Passed on a physical Android 16 phone and, in a separate run, an Android 16 emulator.** On each device, Upload Lab submitted a 71-byte PNG. The native review showed its media type, size and Blossom destination. A disposable local signer approved the kind-24242 upload authorization. The guest received an `uploading` callback at 71 of 71 bytes, followed by a `complete` result with a URL, SHA-256, size and media type. Querying the original upload ID returned the same completion details on each device. An independent download of each returned URL produced HTTP 200 and matched all 71 source bytes. The server already held the file before this run, so the test covers an upload to a deduplicating server. [Release upload contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/upload-access.md)

PNG SHA-256 · `5a852fbaaaecaf4cd14c01e150c7f881c5c5894b0a1e3c53be7e007c58374ee6`

Upload Lab manifest event ID · `7c3a74a2eda6e2a206682eeaecdd0f444d02ba8241435a37fcbde7baae706697`
