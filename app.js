(function () {
  var E = window.EVENT, NS = "http://www.w3.org/2000/svg";
  var SEAT = 22, GAP = 6, AISLE = 34, ROW = 30, PAD = 28;
  var seats = {};            // id -> {el,row,x}
  var rowIds = [];           // [{row, ids:[ids in x order]}]
  var taken = {}, selected = [], party = 2;
  var $ = function (id) { return document.getElementById(id); };

  $("venue").textContent = E.venue;
  $("title").textContent = E.title;
  $("meta").textContent = E.subtitle + "  ·  " + E.date + ", " + E.time;

  // ---------- build map ----------
  var rowW = function (r) {
    var n = r[0] + r[1] + r[2];
    return n * (SEAT + GAP) - GAP + (r[0] && r[1] ? AISLE : 0) + (r[2] && r[1] ? AISLE : 0);
  };
  var maxW = Math.max.apply(null, E.rows.map(function (r) { return rowW(r[1]); }));
  var W = maxW + PAD * 2 + 40, H = E.rows.length * ROW + PAD;
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Seats, front row at top");

  E.rows.forEach(function (r, ri) {
    var label = r[0], c = r[1], y = ri * ROW + 6, x = (W - rowW(c)) / 2, ids = [], num = 1;
    [label, label].forEach(function (_, i) {
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", "rowlbl");
      t.setAttribute("y", y + SEAT / 2);
      t.setAttribute("x", i ? W - 12 : 12);
      t.textContent = label;
      svg.appendChild(t);
    });
    c.forEach(function (count, si) {
      if (si && count && c[1]) x += AISLE - GAP + GAP; // aisle gap
      for (var k = 0; k < count; k++) {
        var id = label + num++;
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", x); rect.setAttribute("y", y);
        rect.setAttribute("width", SEAT); rect.setAttribute("height", SEAT);
        rect.setAttribute("rx", 5);
        rect.setAttribute("class", "seat");
        rect.setAttribute("tabindex", "0");
        rect.setAttribute("role", "button");
        rect.setAttribute("data-id", id);
        rect.setAttribute("aria-label", "Seat " + id);
        var tt = document.createElementNS(NS, "title"); tt.textContent = "Seat " + id;
        rect.appendChild(tt);
        seats[id] = { el: rect, row: ri, x: x };
        ids.push(id);
        svg.appendChild(rect);
        x += SEAT + GAP;
      }
    });
    rowIds.push(ids);
  });
  $("map").appendChild(svg);

  // ---------- state ----------
  function status(id) {
    if (taken[id]) return "taken";
    if (E.held && E.held[id]) return "held";
    return "";
  }
  function paint() {
    Object.keys(seats).forEach(function (id) {
      var s = status(id), el = seats[id].el;
      el.setAttribute("class", "seat" + (s ? " " + s : "") + (selected.indexOf(id) > -1 ? " sel" : ""));
      el.setAttribute("aria-disabled", s ? "true" : "false");
      el.setAttribute("aria-pressed", selected.indexOf(id) > -1 ? "true" : "false");
    });
    $("chosen").textContent = selected.length
      ? selected.length + " of " + party + " selected: " + selected.slice().sort().join(", ")
      : "No seats selected";
    $("partyOut").textContent = party;
  }
  function toggle(id) {
    if (status(id)) return;
    var i = selected.indexOf(id);
    if (i > -1) selected.splice(i, 1);
    else {
      if (selected.length >= party) selected.shift();
      selected.push(id);
    }
    paint();
  }
  svg.addEventListener("click", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-id");
    if (id) toggle(id);
  });
  svg.addEventListener("keydown", function (e) {
    var id = e.target.getAttribute && e.target.getAttribute("data-id");
    if (id && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(id); }
  });

  $("minus").onclick = function () { party = Math.max(1, party - 1); selected = selected.slice(-party); paint(); };
  $("plus").onclick = function () { party = Math.min(E.maxParty, party + 1); paint(); };

  // ---------- load taken seats ----------
  function load(url, cb) {
    fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(cb).catch(function () {});
  }
  var local = [];
  try { local = JSON.parse(localStorage.getItem("highest-road-mine") || "[]"); } catch (e) {}
  function applyTaken(list) { (list || []).concat(E.submitUrl ? [] : local).forEach(function (id) { taken[id] = 1; }); paint(); }
  load(E.seatsUrl || E.submitUrl || "taken.json", function (d) { applyTaken(d.taken); });
  applyTaken([]);

  $("mode").textContent = E.submitUrl ? "" : "Preview mode: reservations are not sent anywhere yet.";

  // ---------- submit ----------
  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("err"), name = $("name").value.trim(), email = $("email").value.trim();
    err.textContent = "";
    if (selected.length !== party) { err.textContent = "Choose " + party + " seat" + (party > 1 ? "s" : "") + "."; return; }
    if (!name) { err.textContent = "Please enter your name."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Please enter a valid email."; return; }
    var payload = { event: E.title, name: name, email: email, seats: selected.slice().sort(), when: new Date().toISOString() };
    var finish = function () {
      selected.forEach(function (id) { taken[id] = 1; });
      if (!E.submitUrl) {
        local = local.concat(payload.seats);
        try { localStorage.setItem("highest-road-mine", JSON.stringify(local)); } catch (x) {}
        $("doneS").hidden = false; $("doneS").textContent = JSON.stringify(payload, null, 2);
      } else $("doneS").hidden = true;
      $("doneT").textContent = "Thanks! Reservation confirmed!";
      $("doneP").textContent = "Seats " + payload.seats.join(", ") + ", " + E.date + " at " + E.time + "." + (E.submitUrl ? " A confirmation email is on its way to " + email + "." : "");
      $("done").hidden = false;
      selected = []; paint();
    };
    if (!E.submitUrl) return finish();
    var btn = $("form").querySelector(".primary"); btn.disabled = true;
    fetch(E.submitUrl, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.disabled = false;
        if (d && d.ok) return finish();
        ((d && d.taken) || []).forEach(function (id) { taken[id] = 1; });
        selected = selected.filter(function (id) { return !taken[id]; });
        paint();
        err.textContent = "Sorry, someone just took one of those seats. Please choose again.";
      })
      .catch(function () { btn.disabled = false; err.textContent = "Could not send. Please try again."; });
  });
  $("doneB").onclick = function () { $("done").hidden = true; };
  paint();
})();
