// Edit this file to change the event or the room. No build step needed.
window.EVENT = {
  title: "The Highest Road",
  subtitle: "A documentary featuring Kyle Bryant",
  date: "Thursday, December 3",
  time: "7:30 PM",
  venue: "Anderson Auditorium, W.B. Ford Building",

  // Where RSVPs are sent. Leave empty for preview mode
  // (choices are kept in this browser only and shown as a copyable summary).
  // Works with a Google Apps Script web app URL or any endpoint that accepts JSON.
  submitUrl: "https://script.google.com/macros/s/AKfycbxQl7ylypdEUgfHhSwXpAz7mf6cLv_RwV9N-J_0eJtwrw7J2QNmHxKjighLPfxmInM7xQ/exec",
  // Optional: URL that returns {"taken":["C5","C6"]}. Falls back to taken.json.
  seatsUrl: "",

  maxParty: 8,

  // Rows run front (A, nearest the screen) to back. Each row is
  // [label, seat count, [accessible seat numbers]]. Shorter rows are centred, which
  // staggers them half a seat from the row in front. PLACEHOLDER counts totalling
  // 235 until the room is counted. Seat IDs (like G8) will change when this is replaced.
  rows: [
    ["A", 21, [1, 21]],
    ["B", 22], ["C", 21], ["D", 22], ["E", 21], ["F", 22],
    ["G", 21], ["H", 22], ["I", 21], ["J", 22],
    ["K", 20, [1, 20]]
  ],

  // Seats held back for crew or guests of honor, like { "C5": "Reserved" }.
  held: {}
};
