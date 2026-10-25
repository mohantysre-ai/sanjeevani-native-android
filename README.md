# Sanjeevani — Native Android (Capacitor)

Evidence-graded AYUSH, Yoga, Fitness & Nutrition app — **true native Android app** built with
[Capacitor 8](https://capacitorjs.com). The entire web app **and its full offline data layer
(40k catalog entries, 10k remedy/herb/food/yoga pages, interaction checker, search dictionary)
are bundled inside the APK** — it launches instantly, works with **zero network**, and opens
the app itself (no remote website, no WebView to a server).

| | |
|---|---|
| Package | `com.ayush.sanjeevani` |
| Version | 1.1.0 (versionCode 2) |
| Min SDK / Target SDK | 24 / 36 (Android 7.0 → 16) |
| Signing | `keys/sanjeevani-release.jks` · alias `sanjeevani` · pass `sanjeevani2026` |
| SHA-256 (signing cert) | `5B:3D:29:10:92:E3:1E:6B:C0:4D:FF:28:59:07:90:F6:64:4E:45:11:13:AD:9C:67:B9:5B:03:B1:FB:51:7D:D5` |

---

## Open in Android Studio (recommended path)

1. **Clone / download this repository** and extract it.
2. In Android Studio: **File → Open…** and select **this repository's root folder**
   (the folder containing `android/`, `www/`, `capacitor.config.ts`).
3. Let Gradle sync finish (it downloads Gradle 9.6.0 + AGP 9.4.1 automatically —
   needs JDK 17+, Android Studio bundles one).
4. **Build → Generate Signed App Bundle / APK** — or simply **Run** on a device.
   The release signing config is already wired to `keys/sanjeevani-release.jks`,
   so `assembleRelease` output is signed and Play-ready out of the box.

> The web bundle (`www/`) and the synced native assets
> (`android/app/src/main/assets/public/`) are **committed**, so you do NOT need
> Node/npm to build from this repo. They are only needed to change app code.

## Build from the command line

```bash
# everything is prebuilt — just:
cd android
./gradlew assembleRelease      # → android/app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease        # → .aab for Google Play

# after changing web code (needs Node 20+):
npm install
npm run sync                   # copies www/ into the Android assets
cd android && ./gradlew assembleRelease
```

Environment overrides for signing (CI-safe):

```bash
export SANJEEVANI_KEYSTORE=/path/to/sanjeevani-release.jks
export SANJEEVANI_KEYSTORE_PASSWORD=sanjeevani2026
```

---

## What's inside

```
├── android/                      Capacitor 8 Android project (AGP 9.4.1, Gradle 9.6.0)
│   └── app/src/main/assets/public/   synced web bundle (committed — zero-step build)
├── www/                          built web app (source of truth for cap sync)
│   └── data/                     offline API bundles (~29 MB JSON, see below)
├── web/                          Next.js source of the app (reference / regeneration)
│   ├── src/lib/native-data.ts    client fetch-shim that replaces the API server
│   └── scripts/export-native-data.mjs  DB → static JSON exporter
├── keys/sanjeevani-release.jks   release keystore (30-year validity)
├── capacitor.config.ts           appId com.ayush.sanjeevani · webDir www
└── package.json                  Capacitor deps + `npm run sync|open`
```

### Offline data layer (how the app works without a server)

The web app normally talks to a Next.js server (`/api/v1/*` + Prisma/SQLite).
Inside the APK there is no server, so:

1. `web/scripts/export-native-data.mjs` dumps the whole catalog into static JSON
   (`www/data/`): grouped section lists, per-group detail payloads, a
   slug→group map for the 30k variant slugs, the 40k-entry synonym dictionary,
   interaction rules, daily-pick candidates and the evidence-quiz pool.
2. `web/src/lib/native-data.ts` installs a `fetch` shim **before** the app boots
   (activated by the Capacitor bridge) and serves every `/api/v1/*` call from
   those bundles with the exact server semantics: paging, `q` filtering,
   kingdom/category filters, synonym-expanded search, deterministic daily picks,
   the herb–medication checker and device-local consent no-ops.

Result: full catalog browsing, search, detail pages, daily dose, evidence quiz and
the safety checker — **all offline, identical to the server-backed app**.
On-demand machine translation is the only server-only feature; the UI gracefully
falls back to English for unseeded languages (identical to the server's fallback).

### Known behavior notes

- HOMEOPATHY and every other section verified rendering from the bundled data
  (375 grouped remedies / 564 herbs / 572 asanas / 1,000+ foods, 10k detail pages).
- Content languages: the catalog ships **English + Hindi inline** (names, columns).
  Other UI languages (57 packs) localize the interface; catalog text falls back to
  English exactly as the current server does.
- The DMR Act 1954 scientific-consensus disclaimer renders on every homeopathy
  surface, bundled and offline.

## Play Store checklist

- [x] Signed AAB: `cd android && ./gradlew bundleRelease`
- [x] Keystore backed up (`keys/sanjeevani-release.jks`, alias `sanjeevani`)
- [x] Version bump: `android/variables.gradle` + `android/app/build.gradle`
      (versionCode 2, versionName 1.1.0)
- [ ] Play Console listing (privacy policy, data-safety form, screenshots)
- [ ] Play App Signing: upload the AAB; keep the keystore for reset authority

## Regenerating the web bundle from source (optional)

The committed `www/` was built from the full sandbox environment (75 MB SQLite +
48 MB optimized photos). To rebuild from source you need those assets, then:

```bash
cd web
npm install
node scripts/export-native-data.mjs     # requires the SQLite DB (db/custom.db)
cd .. && NATIVE_BUILD=1 npx next build  # static export → out/
cp -r out/* www/                        # refresh the bundle
npm run sync && cd android && ./gradlew assembleRelease
```
