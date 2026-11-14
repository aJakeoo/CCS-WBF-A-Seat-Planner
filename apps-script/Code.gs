// Paste this into a Google Apps Script project attached to a Google Sheet.
// It stores each reservation as a row and refuses seats that are already taken.

var SHEET = "RSVPs";

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(["Time", "Name", "Email", "Seats"]);
  return sh;
}

function takenSeats_() {
  var sh = sheet_(), n = sh.getLastRow() - 1, out = [];
  if (n < 1) return out;
  sh.getRange(2, 4, n, 1).getValues().forEach(function (r) {
    String(r[0]).split(",").forEach(function (s) { s = s.trim(); if (s) out.push(s); });
  });
  return out;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// The page calls this to learn which seats are taken. Names and emails are never returned.
function doGet() {
  return json_({ taken: takenSeats_() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);               // stops two people booking the same seat at once
  try {
    var d = JSON.parse(e.postData.contents);
    var seats = (d.seats || []).map(String);
    if (!d.name || !d.email || !seats.length || seats.length > 8) return json_({ ok: false, error: "bad request" });
    var taken = takenSeats_();
    var clash = seats.filter(function (s) { return taken.indexOf(s) > -1; });
    if (clash.length) return json_({ ok: false, taken: clash });
    sheet_().appendRow([new Date(), String(d.name).slice(0, 100), String(d.email).slice(0, 100), seats.join(", ")]);
    try {
      MailApp.sendEmail({
        to: d.email,
        subject: "Reservation confirmed: The Highest Road, December 3",
        body: "Thanks, " + d.name + "! Your reservation is confirmed.\n\n" +
              "The Highest Road, a FARA community screening\n" +
              "Thursday, December 3, 7:30 to 9:00 PM\n" +
              "W.B. Ford Auditorium\n" +
              "Seats: " + seats.join(", ") + "\n\n" +
              "We look forward to seeing you there."
      });
    } catch (err) { /* the reservation is saved even if the email fails */ }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
