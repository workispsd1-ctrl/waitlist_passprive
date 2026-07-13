/**
 * PassPrivé waitlist — Google Apps Script web app.
 *
 * Deploy: Extensions ▸ Apps Script, paste this, then
 * Deploy ▸ Manage deployments ▸ edit ▸ Version: New version ▸ Deploy.
 * Copy the /exec URL into NEXT_PUBLIC_LAUNCH_SHEET_URL.
 *
 * IMPORTANT: the /exec URL only serves the LATEST deployed version — after
 * any edit you must cut a New version, not just save.
 *
 * Sheet columns (row 1 is a header):
 *   Timestamp | Name | Phone | Email | Type | Source Page
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Ensure header row exists.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Phone', 'Email', 'Type', 'Source Page']);
    }

    var data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = e.parameter || {};
    }

    // Duplicate check: skip if this phone (or email, if given) is already on the list.
    var newPhone = normalize_(data.phone);
    var newEmail = normalize_(data.email);
    if (sheet.getLastRow() > 1) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      for (var i = 0; i < rows.length; i++) {
        var existingPhone = normalize_(rows[i][2]); // Phone column
        var existingEmail = normalize_(rows[i][3]); // Email column
        var phoneMatch = newPhone && existingPhone === newPhone;
        var emailMatch = newEmail && existingEmail === newEmail;
        if (phoneMatch || emailMatch) {
          return ContentService
            .createTextOutput(JSON.stringify({ result: 'duplicate' }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    sheet.appendRow([
      data.submitted_at || new Date().toLocaleString(),
      data.name || '',
      data.phone || '',
      data.email || '',
      data.type || '',
      data.source || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Normalizes a value for duplicate comparison: lowercased, digits/letters only.
function normalize_(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// GET: browser check + live sign-up count (JSONP for the landing page).
//   ?action=count&callback=foo  ->  foo({"count": N})
function doGet(e) {
  var callback = e && e.parameter && e.parameter.callback;

  if (callback || (e && e.parameter && e.parameter.action === 'count')) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var count = Math.max(0, sheet.getLastRow() - 1); // minus the header row
    var payload = JSON.stringify({ count: count });
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + payload + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput('PASSPRIVÉ launch capture is running.');
}
