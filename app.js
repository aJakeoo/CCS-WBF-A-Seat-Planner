(function () {
  var E = window.EVENT, NS = "http://www.w3.org/2000/svg";
  var SEAT = 28, GAP = 6, AISLE = 36, ROW = 36, PAD = 8, LBL = 28;
  var seats = {};
  var taken = {}, selected = [];
  var MAX = E.maxParty || 8;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- build map ----------
  var rowW = function (c) {
    var n = c[0] + c[1] + c[2];
    return n * (SEAT + GAP) - GAP + (c[0] && c[1] ? AISLE : 0) + (c[2] && c[1] ? AISLE : 0);
  };
  // Every row uses the widest row's section widths so aisles line up.
  var secW = [0, 1, 2].map(function (i) {
    return Math.max.apply(null, E.rows.map(function (r) { var c = r[1][i]; return c ? c * (SEAT + GAP) - GAP : 0; }));
  });
  var inner = secW[0] + secW[1] + secW[2] + AISLE * 2;
  var W = inner + LBL * 2 + PAD * 2, H = E.rows.length * ROW + PAD;
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Seats, front row at top");

  E.rows.forEach(function (r, ri) {
    var label = r[0], c = r[1], y = ri * ROW + PAD, num = 1;
    [PAD + LBL / 2, W - PAD - LBL / 2].forEach(function (lx) {
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", "rowlbl");
      t.setAttribute("x", lx); t.setAttribute("y", y + SEAT / 2);
      t.setAttribute("aria-hidden", "true");
      t.textContent = label;
      svg.appendChild(t);
    });
    var start = PAD + LBL;
    c.forEach(function (count, si) {
      var w = count ? count * (SEAT + GAP) - GAP : 0;
      var x0 = start + (si === 0 ? secW[0] - w : si === 1 ? (secW[1] - w) / 2 : 0);
      for (var k = 0; k < count; k++) {
        var id = label + num++, x = x0 + k * (SEAT + GAP);
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", x + 1); rect.setAttribute("y", y + 1);
        rect.setAttribute("width", SEAT - 2); rect.setAttribute("height", SEAT - 2);
        rect.setAttribute("rx", 6);
        rect.setAttribute("tabindex", "0");
        rect.setAttribute("role", "button");
        rect.setAttribute("data-id", id);
        var tt = document.createElementNS(NS, "title"); tt.textContent = "Seat " + id;
        rect.appendChild(tt);
        seats[id] = { el: rect };
        svg.appendChild(rect);
      }
      start += secW[si] + AISLE;
    });
  });
  $("map").appendChild(svg);

  // ---------- state ----------
  function sortIds(list) {
    return list.slice().sort(function (a, b) {
      return a.charAt(0) === b.charAt(0) ? parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10) : a.localeCompare(b);
    });
  }
  function status(id) {
    if (taken[id]) return "taken";
    if (E.held && E.held[id]) return "held";
    return "";
  }
  function paint() {
    Object.keys(seats).forEach(function (id) {
      var s = status(id), el = seats[id].el, on = selected.indexOf(id) > -1;
      el.setAttribute("class", "seat" + (s ? " " + s : "") + (on ? " sel" : ""));
      el.setAttribute("aria-disabled", s ? "true" : "false");
      el.setAttribute("aria-pressed", on ? "true" : "false");
      el.setAttribute("aria-label", "Seat " + id + (s === "taken" ? ", taken" : s === "held" ? ", reserved" : on ? ", selected" : ""));
    });
    var n = selected.length;
    $("seatsText").textContent = n ? sortIds(selected).join(", ") : "None yet";
    $("countText").textContent = n
      ? n + (n === 1 ? " seat" : " seats") + " selected" + (n >= MAX ? " (the most per reservation)" : "")
      : "Tap seats on the map to choose up to " + MAX + ".";
  }
  function toggle(id) {
    if (status(id)) return;
    var i = selected.indexOf(id);
    if (i > -1) selected.splice(i, 1);
    else if (selected.length < MAX) selected.push(id);
    else { $("err").textContent = "You can reserve up to " + MAX + " seats at a time."; return; }
    $("err").textContent = "";
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

  // ---------- load taken seats ----------
  var local = [];
  try { local = JSON.parse(localStorage.getItem("highest-road-mine") || "[]"); } catch (e) {}
  function applyTaken(list) {
    (list || []).concat(E.submitUrl ? [] : local).forEach(function (id) { taken[id] = 1; });
    selected = selected.filter(function (id) { return !taken[id]; });
    paint();
  }
  fetch(E.seatsUrl || E.submitUrl || "taken.json", { cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (d) { applyTaken(d.taken); })
    .catch(function () {});
  applyTaken([]);
  if (!E.submitUrl) $("mode").textContent = "Preview mode: reservations are not sent anywhere yet.";

  // ---------- confirmation page ----------
  function showDone(p) {
    $("doneSeats").textContent = p.seats.join(", ");
    $("doneName").textContent = p.name;
    $("doneP").textContent = E.submitUrl
      ? "A confirmation email is on its way to " + p.email + ". It lists your seats, so keep it handy."
      : "Preview mode: nothing was sent. Your seats are shown below.";
    $("page").hidden = true;
    $("done").hidden = false;
    window.scrollTo(0, 0);
    $("doneT").focus();
  }
  $("doneB").onclick = function () {
    $("done").hidden = true;
    $("page").hidden = false;
    window.scrollTo(0, 0);
  };

  // ---------- submit ----------
  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("err"), name = $("name").value.trim(), email = $("email").value.trim();
    err.textContent = "";
    if (!selected.length) { err.textContent = "Choose at least one seat on the map."; return; }
    if (!name) { err.textContent = "Please enter your name."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Please enter a valid email."; return; }
    var payload = { event: E.title, name: name, email: email, seats: sortIds(selected), when: new Date().toISOString() };
    var finish = function () {
      payload.seats.forEach(function (id) { taken[id] = 1; });
      if (!E.submitUrl) {
        local = local.concat(payload.seats);
        try { localStorage.setItem("highest-road-mine", JSON.stringify(local)); } catch (x) {}
      }
      selected = []; paint();
      $("form").reset();
      showDone(payload);
    };
    if (!E.submitUrl) return finish();
    var btn = $("reserve");
    btn.disabled = true; btn.textContent = "Reserving";
    var done = function () { btn.disabled = false; btn.textContent = "Reserve"; };
    fetch(E.submitUrl, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        done();
        if (d && d.ok) return finish();
        ((d && d.taken) || []).forEach(function (id) { taken[id] = 1; });
        selected = selected.filter(function (id) { return !taken[id]; });
        paint();
        err.textContent = d && d.taken ? "Sorry, someone just took one of those seats. Please choose again." : "Something went wrong. Please try again.";
      })
      .catch(function () { done(); err.textContent = "Could not send. Please try again."; });
  });
  paint();
})();
