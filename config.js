// Edit this file to change the event or the room. No build step needed.
window.EVENT = {
  title: "The Highest Road",
  subtitle: "A documentary featuring Kyle Bryant, Sean Baumstark, and the FA community",
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

  // Rows run front (A, nearest the screen) to back. Each row is [label, seat count, options].
  // options.spaces = [left, right] wheelchair spaces outside the seats (ids like AW1);
  // options.companion = seat numbers that are companion seats. Wheelchair spaces and
  // companion seats are for guests who use a wheelchair or are with someone who does.
  // Shorter rows are centred, staggering them half a seat from the row in front. Counts come
  // from the floor plan of room 100 (seat 1 is on the audience's left). The plan shows 251
  // seats while CCS lists 235, so confirm the real count in the room and adjust if needed.
  rows: [
    ["A", 21, { spaces: [1, 1], companion: [1, 21] }],
    ["B", 22], ["C", 21], ["D", 22], ["E", 21], ["F", 22],
    ["G", 21], ["H", 22], ["I", 21], ["J", 22], ["K", 21],
    ["L", 15, { spaces: [2, 2], companion: [1, 15] }]
  ],

  // Seats held back for crew or guests of honor, like { "C5": "Reserved" }.
  held: {}
};
