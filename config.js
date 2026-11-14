// Edit this file to change the event or the room. No build step needed.
window.EVENT = {
  title: "The Highest Road",
  subtitle: "A documentary by Kyle Bryant",
  date: "Wednesday, December 3",
  time: "7:30 PM",
  venue: "W.B. Ford Auditorium",

  // Where RSVPs are sent. Leave empty for preview mode
  // (choices are kept in this browser only and shown as a copyable summary).
  // Works with a Google Apps Script web app URL or any endpoint that accepts JSON.
  submitUrl: "https://script.google.com/macros/s/AKfycbxQl7ylypdEUgfHhSwXpAz7mf6cLv_RwV9N-J_0eJtwrw7J2QNmHxKjighLPfxmInM7xQ/exec",
  // Optional: URL that returns {"taken":["C5","C6"]}. Falls back to taken.json.
  seatsUrl: "",

  maxParty: 8,

  // Rows are listed front (A, nearest the screen) to back.
  // Each row lists seat counts for [left, center, right] sections.
  // Placeholder layout totalling 235 seats. Replace with the real plan once measured.
  rows: [
    ["A", [3, 8, 3]],
    ["B", [4, 9, 4]], ["C", [4, 9, 4]], ["D", [4, 9, 4]], ["E", [4, 9, 4]],
    ["F", [4, 9, 4]], ["G", [4, 9, 4]], ["H", [4, 9, 4]], ["I", [4, 9, 4]],
    ["J", [4, 9, 4]], ["K", [4, 9, 4]], ["L", [4, 9, 4]], ["M", [4, 9, 4]],
    ["N", [4, 9, 4]]
  ],

  // Seats held back (accessible spaces, crew, guests of honor).
  held: { "N1": "Accessible", "N17": "Accessible" }
};
