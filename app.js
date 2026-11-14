(function () {
  var E = window.EVENT, NS = "http://www.w3.org/2000/svg";
  var SEAT = 28, GAP = 6, ROW = 36, PAD = 8, LBL = 28;
  var seats = {};
  var taken = {}, selected = [];
  var MAX = E.maxParty || 8;
  var $ = function (id) { return document.getElementById(id); };

  // ---------- build map ----------
  // Rows are [label, seatCount, [accessible seat numbers]]. Shorter rows are centred,
  // so a row with one seat fewer sits half a seat off from the row in front of it.
  var maxN = Math.max.apply(null, E.rows.map(function (r) { return r[1]; }));
  var W = PAD * 2 + LBL * 2 + maxN * (SEAT + GAP) - GAP, H = E.rows.length * ROW + PAD;
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Seats, front row at top");

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  E.rows.forEach(function (r, ri) {
    var label = r[0], count = r[1], acc = r[2] || [], y = ri * ROW + PAD;
    [PAD + LBL / 2, W - PAD - LBL / 2].forEach(function (lx) {
      var t = el("text", { "class": "rowlbl", x: lx, y: y + SEAT / 2, "aria-hidden": "true" });
      t.textContent = label;
      svg.appendChild(t);
    });
    var x0 = PAD + LBL + (maxN - count) * (SEAT + GAP) / 2;
    for (var k = 0; k < count; k++) {
      var id = label + (k + 1), x = x0 + k * (SEAT + GAP), isAcc = acc.indexOf(k + 1) > -1;
      var rect = el("rect", { x: x + 1, y: y + 1, width: SEAT - 2, height: SEAT - 2, rx: 6, tabindex: "0", role: "button", "data-id": id });
      var tt = document.createElementNS(NS, "title"); tt.textContent = "Seat " + id + (isAcc ? " (accessible)" : "");
      rect.appendChild(tt);
      seats[id] = { el: rect, acc: isAcc };
      svg.appendChild(rect);
      if (isAcc) {
        var g = el("g", { "class": "acc-ico", transform: "translate(" + x + "," + y + ")", "pointer-events": "none", "aria-hidden": "true" });
        g.appendChild(el("circle", { cx: 13, cy: 7, r: 2, "class": "dot" }));
        g.appendChild(el("path", { d: "M13 10.5V16H18.5L20.5 21M10.5 13.5A5 5 0 1 0 17 20.5" }));
        svg.appendChild(g);
      }
    }
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
      el.setAttribute("aria-label", "Seat " + id + (seats[id].acc ? ", accessible" : "") + (s === "taken" ? ", taken" : s === "held" ? ", reserved" : on ? ", selected" : ""));
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
