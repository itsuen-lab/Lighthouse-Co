# Security Specification for Firestore Rules

## 1. Data Invariants
- Site content must be publicly readable so any user across mobile devices, desktop browsers, or external visitors can view the films, promo items, and site info.
- Site content write access (create/update) must be strictly restricted to the verified administrator (`itsuen@gmail.com`).
- Direct deletion of the site content document is forbidden.
- Blanket collection listing of site content is denied; only direct get is allowed.

## 2. The Dirty Dozen Payloads (Target: /site_content/main)
1. **Unauthenticated Write**: Anonymous visitor attempts to overwrite `/site_content/main` -> PERMISSION_DENIED.
2. **Unverified Email Write**: Authenticated user with email `itsuen@gmail.com` but `email_verified: false` attempts update -> PERMISSION_DENIED.
3. **Non-Admin Write**: Authenticated user with email `attacker@example.com` attempts update -> PERMISSION_DENIED.
4. **Delete Attempt**: Admin attempts to delete `/site_content/main` -> PERMISSION_DENIED.
5. **Collection List Scraping**: Visitor attempts `list` query on `/site_content` -> PERMISSION_DENIED.
6. **Unbounded Films Array**: Attacker attempts to inject 5,000 film entries -> PERMISSION_DENIED.
7. **Unbounded Promos Array**: Attacker attempts to inject 5,000 promo items -> PERMISSION_DENIED.
8. **Invalid Featured Type**: Attacker sends `featured: "invalid_string"` instead of a list -> PERMISSION_DENIED.
9. **Missing Required Fields**: Update payload missing `featured` or `films` -> PERMISSION_DENIED.
10. **Arbitrary Collection Write**: Attacker attempts to write to `/other_collection/data` -> PERMISSION_DENIED (Catch-all default deny).
11. **Spoofed Claims Write**: Attacker injects custom token claims without verified admin email -> PERMISSION_DENIED.
12. **Malformed Document ID Path**: Path injection with non-compliant ID -> PERMISSION_DENIED.
