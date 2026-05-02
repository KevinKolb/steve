/* ============================================================
   PRIVATE CONFIG — do not commit this file
   ============================================================ */
window.SITE_CONFIG = {
  /* ── Post-Party Photo Page ──────────────────────────────────
   *
   * GOOGLE DRIVE SETUP (so guests can upload photos)
   * 1. Go to console.cloud.google.com → New project
   * 2. Enable "Google Drive API" and "Google Sheets API"
   * 3. Create an OAuth 2.0 Client ID (Web application type)
   *    → Add your site URL to "Authorized JavaScript origins"
   *    → e.g. https://yourdomain.github.io
   * 4. Create an API Key (for reading the Sheets log publicly)
   *    → Restrict it to Google Sheets API + your domain
   * 5. Create a Google Drive folder, share it:
   *    → "Anyone with the link" → Editor (so guests can upload)
   *    → Copy the folder ID from the URL:
   *    → drive.google.com/drive/folders/[THIS_IS_THE_ID]
   * 6. Create a Google Sheet for the contributor log.
   *    → Share it: "Anyone with the link can view"
   *    → Add a header row: Name | Timestamp | Count | Files | Via
   *    → Copy the Sheet ID from the URL:
   *    → docs.google.com/spreadsheets/d/[THIS_IS_THE_ID]/edit
   *
   * ── ─────────────────────────────────────────────────────── */
  googleClientId:      '765216717937-s98970gc8i2nl6fc0862iafrkj7i04s3.apps.googleusercontent.com',   // OAuth 2.0 Client ID
  googleApiKey:        'AIzaSyCLYXnshqQyXo4CjFZD4KhwbHNmtiJD22s',   // API Key (for reading Sheets)
  googleDriveFolderId: '1wbHJTkfopiT-vVMzN_qJl5E62a3hxPLK',   // Shared Drive folder ID
  googleSheetsId:      '1-hqFk_qnDFxi3jOURw7MPBKaE9jkPxK6jhzScVh8new',   // Google Sheet ID for contributor log

  /* ── iCLOUD SHARED ALBUM ──────────────────────────────────
   * Create a Shared Album in the Photos app, copy the invite link.
   * Leave blank to hide the album section.
   * ── ─────────────────────────────────────────────────────── */
  iCloudAlbumLink: '',       // e.g. https://www.icloud.com/photos/0abc...
};
