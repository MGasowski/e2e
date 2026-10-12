---
"@e2e-dev/mobile": minor
---

Add `mobile({ driver: 'argent' })`, which drives local iOS simulators and Android emulators through Software Mansion's argent (`@swmansion/argent`, a new optional peer dependency) instead of agent-device. The surface, pool, `device` fixture, and agent tools are unchanged; the device commands argent has no tool for (`app.clearState()`, `device.closeApp`, `device.alert`, the clipboard, network, location, appearance, biometrics, the keychain, and comparable screenshots) fail with `UNSUPPORTED_CAPABILITY`. agent-device stays the default.
