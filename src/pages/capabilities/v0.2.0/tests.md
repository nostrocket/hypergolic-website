---
layout: ../../../layouts/CapabilityTestReport.astro
title: Capability test results
description: Six capabilities passed on a physical Android 16 phone and an iPhone 16 running iOS 27.0.1. Common and Upload also passed on an Android 16 emulator.
release: Hypergolic v0.2.0
date: 20 November 2026
---

The Android phone and emulator ran the distributed, production-signed arm64 APK, build 2. The iPhone ran the ordinary production entry point built locally from tag v0.2.0. Its development signature, separate app ID and isolated keychain group kept the disposable test identity separate from the installed app. The tests used signed, published napplets. [Hypergolic v0.2.0 release](https://github.com/nostrocket/hypergolic/releases/tag/v0.2.0)

**Release APK SHA-256** · `3fa70f253e906adc82eea181081991f967869c7507e704ca41c4a476998a3377`

The bundled WebView runtime in the iPhone build matched the runtime in the released Android APK byte for byte. Its SHA-256 was `442db9548f1682e6d5c3f94a6eb426e40a0d6ff435b7440c2f957b1eb0b65e63`. The iOS app’s JavaScript bundle SHA-256 was `c09b84fd45f9efcbbb2ef3804d1a9579e55bdbe9817fd0ff1273f33d9425338e`. [Tagged source used for the iPhone build](https://github.com/nostrocket/hypergolic/tree/ca268422b8cb25395804d0aa72bdd503922f76ee)

The iPhone used a combined test napplet for Storage, Common, Link and Theme. Its signed manifest event ID was `59c7d78c01ff54aaf5999909d570bcf2c5a44ff7c26763bd6e234dc23722dee1`. Notify and Upload used the fixtures identified in their sections.

## Storage

**Passed on a physical Android 16 phone and iPhone 16.** On each phone the napplet used the same key to store different strings in shared and per-instance storage. Reads and key listings matched the writes. Both values survived a cold restart. A second instance could read the shared value and started with empty per-instance storage. Removing each key produced a missing value and an empty listing in its scope. These checks exercised all four operations. [Storage contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/capability-contract.md)

Android State Lab manifest event ID · `2fffeb1ebb31decc372cae8c190cadfb163b49071da6cb17ad391fcf3965ba30`

## Common

**All eight operations passed on a physical Android 16 phone, iPhone 16 and Android 16 emulator.** On each device the napplet encoded and decoded a disposable target’s NIP-19 identifier, looked up its signed profile by name and read the active account’s follow list. Each device used its own disposable local signer. After native review, the napplet received signed results for follow, unfollow, a custom emoji reaction and a report on the synthetic test event.

On iPhone the follow-list read included the target key. Independent readers on nos.lol verified the signed events and matched their IDs and targets to the results returned to the napplets. The Android receipt checks also matched the authors and tags.

| Operation | Android phone event | Android emulator event |
| --- | --- | --- |
| Follow | `306da258836db2883edac7ef129b8a5704183803d8f60b9e2c2bd01029ce0b54` | `c5798f25f0789e6fb8d31779377fb7e496d55d9cc98229c2424ba289609e588f` |
| Unfollow | `f698a8763e81ecdeaabc94d68ff6207d0b41106d5ed4e6457aad8c469200922b` | `0e3efe697b1ecd723bcac86fca9875e3785e71dd0f1dfc24b2abb48619ed8b2a` |
| Custom emoji reaction | `4c3bbd5e5f6aad6e29c129d67a89ca4feca4bd5c2cf917d64e38b22bd54002e3` | `aa7de4c7635d5c118f3af170f2c5c7a445b464a3eb5616838aed9ad89f2f32f7` |
| Event report | `a63bbdc0fa941e0ef454a3eef41382dc3911d471a74048936cb45985dae6034b` | `80efa1208f9a9a89a8f3f692d203442f8647a6e06ed341e9cf5d5c21c6248524` |

| Operation | iPhone 16 event |
| --- | --- |
| Follow | `4c5736ac7afa07a24b6b3c9af1a7b282b96103bb7e52a72d443c9b466db94c35` |
| Unfollow | `9727c733d1e21cf063c3e37569f73e3017389b95142700e140bcbfa3e4979be8` |
| Custom emoji reaction | `69b15588e179be108bf900623f05ea7031faabc0e1371d3e59666a2cd25a8fb1` |
| Event report | `4b891800c3aee5950a25c8225138fcae3437ce903849201efa7d3b62d0d5ea8d` |

Follow and unfollow each replaced the kind-3 follow list. The emulator account started with an empty follow list. After the five-minute read cache expired on the emulator, the napplet returned the followed key. The reaction and report targeted a synthetic note from the test publisher. The Android reports gave “other” as their reason and identified the test. The release limits each signed event to 8 KiB. [Common social operations](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/common-social.md)

## Link

**Passed on a physical Android 16 phone and iPhone 16.** On both phones, refusing the HTTPS request returned `denied` to the calling napplet. On Android, approving the URL opened the app chooser and selecting Mi Browser launched it. On iPhone, approving a fresh request brought Safari to the foreground. Back in Hypergolic, the calling napplet received `opened` on each phone. [External link contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/external-links.md)

## Notify

**Passed on a physical Android 16 phone and iPhone 16.** On Android the napplet received a denial for the “Release checks” channel, followed by a grant on its second request. A separate general permission let it set the in-app badge to 3. In the notification centre, an action tap, a body tap and a dismissal each returned the expected card ID and callback. The action included its action ID, and the dismissal included its reason. The napplet dismissed a fourth card and reset the badge to zero. The empty centre cleared its launcher. [In-app notifications](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/notifications-configuration.md)

On iPhone, channel refusal returned false and approval returned true. A separate general grant enabled the in-app badge. The native notification centre showed 3 and cleared to zero. The action tap, body tap, user dismissal and guest dismissal each matched the expected card. With a new card and a badge of 3, backgrounding Hypergolic and returning cleared both.

iPhone notification manifest event ID · `f6f8ebf2c299222a894291f7cc87cf4d91f57374c061680501f9b3362d02164d`

Android notification manifest event ID · `61d4cf08076f9bbadebdf88e8f9bd9563137e4ace3d2cb1f7ce50fdc99d3c02b`

## Theme

**Passed on a physical Android 16 phone and iPhone 16.** Each napplet declared Theme optional. Android began in dark mode and delivered the light and dark callbacks as the phone switched modes. A fresh read after each Android change agreed with the callback. The iPhone began in light mode and delivered the dark palette when the system appearance changed, then the light palette when it was restored. Both phones returned the colours below. [Release theme service](https://github.com/nostrocket/hypergolic/blob/v0.2.0/runtime/src/shell-theme.ts)

| Appearance | Background | Text | Primary |
| --- | --- | --- | --- |
| Dark | `#080F17` | `#EEF3F7` | `#F5A04B` |
| Light | `#FFFFFF` | `#17202A` | `#AA4708` |

Android theme test manifest event ID · `f4c608e1c913acb5ae308383e05dc87ea26d2eb7743aca692ffb192ab595f58c`

## Upload

**Passed on a physical Android 16 phone, iPhone 16 and Android 16 emulator.** In each run, Upload Lab submitted a 71-byte PNG. The native review showed its media type, size and Blossom destination. A disposable local signer approved the kind-24242 upload authorization. The guest received an `uploading` callback at 71 of 71 bytes, followed by a `complete` result with a URL, SHA-256, size and media type. Querying the original upload ID returned the same completion details on each device. An independent download of each returned URL produced HTTP 200 and matched all 71 source bytes. The server already held the file before this run, so the test covers an upload to a deduplicating server. [Release upload contract](https://github.com/nostrocket/hypergolic/blob/v0.2.0/docs/upload-access.md)

PNG SHA-256 · `5a852fbaaaecaf4cd14c01e150c7f881c5c5894b0a1e3c53be7e007c58374ee6`

Upload Lab manifest event ID · `7c3a74a2eda6e2a206682eeaecdd0f444d02ba8241435a37fcbde7baae706697`
