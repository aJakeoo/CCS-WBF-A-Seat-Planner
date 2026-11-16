// Paste this into a Google Apps Script project attached to a Google Sheet.
// It stores each reservation as a row and refuses seats that are already taken.

var SHEET = "RSVPs";
var DONATE_URL = "https://give.curefa.org/campaign/781150/donate";
var TRAILER_URL = "https://youtu.be/duCEzsbm0pE";

// Calendar invite. Times are in UTC: 7:30 to 9:00 PM Eastern on December 3 is 00:30 to 02:00 UTC on December 4.
function ics_(name, seats) {
  var esc = function (s) { return String(s).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); };
  var stamp = Utilities.formatDate(new Date(), "UTC", "yyyyMMdd'T'HHmmss'Z'");
  var desc = "Seats: " + seats.join(", ") + "\n" +
             "Free and open to everyone. December 3 is the United Nations International Day of Persons with Disabilities.\n\n" +
             "Trailer: " + TRAILER_URL + "\n" +
             "Donate to FARA: " + DONATE_URL;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Highest Road Screening//RSVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + Utilities.getUuid() + "@highest-road-screening",
    "DTSTAMP:" + stamp,
    "DTSTART:20261204T003000Z",
    "DTEND:20261204T020000Z",
    "SUMMARY:" + esc("The Highest Road: Community Screening"),
    "LOCATION:" + esc("Wendell W. Anderson Jr. Auditorium, W.B. Ford Building, College for Creative Studies, 201 E. Kirby, Detroit, MI 48202"),
    "DESCRIPTION:" + esc(desc),
    "URL:" + DONATE_URL,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:" + esc("The Highest Road screening starts in 2 hours"),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}

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

// Saves a backup record of each reservation as an issue in the GitHub repo. The repo is PUBLIC,
// so the record holds seat numbers and a time only. Never names or emails (those stay in the Sheet).
// Needs two Script Properties (Project Settings, Script Properties): GITHUB_TOKEN and
// GITHUB_REPO (like "owner/repo"). Does nothing when they are not set.
// Never put the token in this file or in the repo.
function backupToGithub_(d, seats, sheetOk, note) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("GITHUB_TOKEN"), repo = props.getProperty("GITHUB_REPO");
  if (!token || !repo) return false;
  try {
    var record = { seats: seats, savedToSheet: sheetOk, time: new Date().toISOString() };
    var res = UrlFetchApp.fetch("https://api.github.com/repos/" + repo + "/issues", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      payload: JSON.stringify({
        title: "Seats " + seats.join(", "),
        body: (note ? "**" + note + "**\n\n" : "") + "```json\n" + JSON.stringify(record, null, 2) + "\n```",
        labels: sheetOk ? ["rsvp"] : ["rsvp", "needs-review"]
      }),
      muteHttpExceptions: true
    });
    return res.getResponseCode() === 201;
  } catch (err) {
    return false;
  }
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
    var sheetOk = true, note = "", taken = [];
    try { taken = takenSeats_(); } catch (err) { sheetOk = false; note = "Could not read the Sheet, so double booking was not checked."; }
    var clash = seats.filter(function (s) { return taken.indexOf(s) > -1; });
    if (clash.length) return json_({ ok: false, taken: clash });
    if (sheetOk) {
      try {
        sheet_().appendRow([new Date(), String(d.name).slice(0, 100), String(d.email).slice(0, 100), seats.join(", ")]);
      } catch (err) { sheetOk = false; note = "Could not write to the Sheet."; }
    }
    // Seats-only backup record in the GitHub repo, so a reservation is not lost if the Sheet fails.
    var ghOk = backupToGithub_(d, seats, sheetOk, note);
    if (!sheetOk && !ghOk) return json_({ ok: false, error: "could not save" });
    try {
      MailApp.sendEmail({
        to: d.email,
        subject: "Reservation confirmed: The Highest Road: CCS Community Screening - Free, December 3",
        body: "Thanks, " + d.name + "! Your reservation is confirmed.\n\n" +
              "This screening is free and open to everyone. It takes place on December 3, the United Nations International Day of Persons with Disabilities.\n\n" +
              "Our organization, FARA, relies on grassroots awareness and fundraising, so please invite friends, family and anyone who can come.\n\n" +
              "The Highest Road, a documentary by Kyle Bryant, Sean Baumstark, FARA, Allan Thompson\n" +
              "Thursday, December 3 at 7:30 PM\n" +
              "Anderson Auditorium, W.B. Ford Building\n" +
              "College for Creative Studies, 201 E. Kirby, Detroit\n" +
              "Seats: " + seats.join(", ") + "\n" +
              "Cost: Free!\n\n" +
              "Screenings like this, FARA and the FA research community rely on donations. If you are able, please consider donating:\n" +
              DONATE_URL + "\n\n" +
              "You should check out the trailer:\n" +
              TRAILER_URL + "\n\n" +
              "Thank you so much for fighting FA with me! I can't wait to see you at the screening!\n\n" +
              "Powered by Google Apps Script",
        attachments: [Utilities.newBlob(ics_(d.name, seats), "text/calendar", "The-Highest-Road-Screening.ics")]
      });
    } catch (err) { /* the reservation is saved even if the email fails */ }
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
