// Sierra's client admin has no shortcut map. Actions are found by the visible
// labels in Sierra's own help: Leads > Leads Dashboard, Leads > Add Lead,
// and the lead + menu (Add a note, Add a task, Send an email, Log a call).

const ACTIONS = [
  { id: "help", label: "Shortcut list", chord: "Alt+Shift+Slash", site: "both" },
  { id: "search", label: "Focus search", chord: "Alt+Shift+KeyS", site: "admin" },
  {
    id: "leads",
    label: "Leads Dashboard",
    chord: "Alt+Shift+KeyM",
    site: "admin",
    kind: "nav",
    labels: ["Leads Dashboard", "Manage Leads"],
    parent: "Leads",
  },
  {
    id: "add-lead",
    label: "Add Lead",
    chord: "Alt+Shift+KeyA",
    site: "admin",
    kind: "nav",
    labels: ["Add Lead"],
    parent: "Leads",
  },
  {
    id: "note",
    label: "Add a note",
    chord: "Alt+Shift+KeyN",
    site: "admin",
    kind: "record",
    labels: ["Add a note", "Add note"],
  },
  {
    id: "task",
    label: "Add a task",
    chord: "Alt+Shift+KeyT",
    site: "admin",
    kind: "record",
    labels: ["Add a task", "Add task"],
  },
  {
    id: "email",
    label: "Send an email",
    chord: "Alt+Shift+KeyE",
    site: "admin",
    kind: "record",
    labels: ["Send an email", "Send email"],
  },
  {
    id: "call",
    label: "Log a call",
    chord: "Alt+Shift+KeyC",
    site: "admin",
    kind: "record",
    labels: ["Log a call", "Log call"],
  },
  {
    id: "dial",
    label: "Call via personal number",
    chord: "Alt+Shift+KeyP",
    site: "admin",
    kind: "dial",
  },
];

const RESERVED = new Set([
  "Ctrl+KeyC",
  "Ctrl+KeyV",
  "Ctrl+KeyX",
  "Ctrl+KeyA",
  "Ctrl+KeyZ",
  "Ctrl+KeyY",
  "Ctrl+KeyL",
  "Ctrl+KeyT",
  "Ctrl+KeyW",
  "Ctrl+KeyN",
  "Ctrl+KeyF",
  "Ctrl+KeyR",
  "Ctrl+Tab",
  "Alt+ArrowLeft",
  "Alt+ArrowRight",
  "Alt+Shift+KeyL",
  "Alt+Shift+KeyD",
]);

const MODIFIER_CODES = new Set([
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
]);

const CODE_LABEL = {
  Slash: "/",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Tab: "Tab",
  Space: "Space",
  Enter: "Enter",
  Escape: "Esc",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
};

function eventToChord(event) {
  if (!event || !event.code || MODIFIER_CODES.has(event.code)) return null;
  const parts = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(event.code);
  return parts.join("+");
}

function chordHasModifier(chord) {
  return chord.startsWith("Ctrl+") || chord.startsWith("Alt+") || chord.includes("+Ctrl+") || chord.includes("+Alt+");
}

function chordLabel(chord) {
  return chord
    .split("+")
    .map((part) => {
      if (part.startsWith("Key")) return part.slice(3);
      if (part.startsWith("Digit")) return part.slice(5);
      return CODE_LABEL[part] || part;
    })
    .join("+");
}

function rejectChord(chord) {
  if (!chord || !chordHasModifier(chord)) return "Use Alt or Ctrl";
  if (RESERVED.has(chord)) return "That chord belongs to the browser";
  return null;
}

function norm(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isConnectedCall(label) {
  if (/\bbrowser\b/.test(label)) return false;
  if (/^call via\b/.test(label)) return true;
  if (/^connected (phone|device)\b/.test(label)) return true;
  return false;
}

// Sierra's call menu lists "Call via Browser" and "Call via [connected number]".
// A personal dialer number is a separate row, or part of the Call via label.
// Never guess when more than one connected number is showing.
function chooseCall(labels, pickedNumber) {
  const norms = [...new Set(labels.map(norm).filter(Boolean))];
  const connected = norms.filter(isConnectedCall);
  const personalConnected = connected.filter((label) => /\bpersonal\b/.test(label));
  if (personalConnected.length === 1) return { step: "dial", label: personalConnected[0] };
  if (personalConnected.length > 1) {
    return { step: "none", reason: "More than one personal number is in the call menu" };
  }
  const personal = norms.filter((label) => /\bpersonal\b/.test(label) && !isConnectedCall(label) && !/\brole\b/.test(label));
  if (!pickedNumber && personal.length === 1) return { step: "number", label: personal[0] };
  if (personal.length > 1 && !pickedNumber) {
    return { step: "none", reason: "More than one personal number is in the call menu" };
  }
  if (connected.length === 1) return { step: "dial", label: connected[0] };
  if (connected.length > 1) return { step: "none", reason: "More than one phone is in the call menu" };
  return { step: "none", reason: "Call via your phone isn't in this menu" };
}

const ARROW_DIRECTIONS = {
  ArrowDown: "down",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function isLeadNameCandidate(href, text, className) {
  const label = norm(text);
  if (!label || label.length > 80) return false;
  if (label.includes("@")) return false;
  if (/^\+?[\d\s().-]{7,}$/.test(label)) return false;
  if (/^(leads dashboard|manage leads|add lead|log a call|log call|add a note|add note|add a task|add task|send an email|send email|call|phone)$/.test(label)) return false;
  const hint = `${href || ""} ${className || ""}`.toLowerCase();
  return /lead-detail|leaddetail|lead_detail|lead-name|leadname/.test(hint);
}

function isSheetToolbarLabel(text) {
  const label = norm(text);
  if (!label || label.length > 80) return false;
  return /\bbulk actions?\b|\bstatus(es)?\b|\bagents?\b|\bsort by\b|\bsort\b|\badvanced search\b|\bsmart filters?\b|\ball leads\b|\bfilters?\b|\blead types?\b|\btags?\b|\bponds?\b|\bcolumns?\b|\bassigned(?: to)?\b|\blead sources?\b|\bsources?\b|\bselect criteria\b|\bexport\b|\bedit smart filters\b|\bsave as smart filter\b/.test(label);
}

// A menu control above the lead names. Column headers sit in the gap
// immediately over the names, so those count only when their label is a menu.
// The app header counts only for those same labels, so Inbox and Leads stay out.
function isToolbarStop(rect, text, sheetTop, inAppHeader) {
  if (!rect || rect.width < 12 || rect.height < 12) return false;
  if (rect.width > 520 || rect.height > 80) return false;
  const center = rect.top + rect.height / 2;
  if (center >= sheetTop - 2) return false;
  const gap = sheetTop - rect.bottom;
  if (gap > 420) return false;
  const labeled = isSheetToolbarLabel(text);
  if (inAppHeader) return labeled;
  if (gap < 36 || gap > 320) return labeled;
  return true;
}

// Shift+arrow keeps selecting text only in a text field that already has some.
// Selects, buttons, and empty fields hand the key to the lead walk.
function fieldBlocksWalk(target) {
  const field = target && target.closest && target.closest("input, textarea, [contenteditable='true'], [contenteditable='']");
  if (!field) return false;
  if (field.matches && field.matches("input")) {
    const type = (field.getAttribute("type") || "text").toLowerCase();
    if (["button", "checkbox", "radio", "submit", "reset", "file", "hidden", "image", "range", "color"].includes(type)) return false;
  }
  if (field.matches && field.matches("input, textarea")) return field.value.trim() !== "";
  return (field.textContent || "").replace(/\u00a0/g, " ").trim() !== "";
}

// Pick the closest lead name that actually lies in the arrow's direction.
// A name stacked above or below does not count as left or right.
function nearestInDirection(from, items, direction) {
  let best = null;
  let bestScore = Infinity;
  for (const item of items) {
    if (item.id != null && item.id === from.id) continue;
    const dx = item.cx - from.cx;
    const dy = item.cy - from.cy;
    let primary;
    let secondary;
    if (direction === "down") {
      primary = dy;
      secondary = Math.abs(dx);
    } else if (direction === "up") {
      primary = -dy;
      secondary = Math.abs(dx);
    } else if (direction === "right") {
      primary = dx;
      secondary = Math.abs(dy);
    } else if (direction === "left") {
      primary = -dx;
      secondary = Math.abs(dy);
    } else {
      continue;
    }
    if (primary <= 1) continue;
    // The move has to be mostly along the arrow, not a diagonal jump to another row.
    if (secondary > primary) continue;
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

function install(doc, storage) {
  if (!doc || globalThis.__sierraKeys) return;
  globalThis.__sierraKeys = true;

  const host = doc.defaultView.location.hostname;
  const admin = host === "sierrainteractivedev.com" || host.endsWith(".sierrainteractivedev.com");
  let bindings = {};
  let dirty = false;
  let rebindId = null;
  let highlighted = null;
  let pointer = { x: 0, y: 0 };
  let toastTimer = 0;

  function bindingFor(action) {
    return bindings[action.id] || action.chord;
  }

  function actionForChord(chord) {
    const matches = ACTIONS.filter((action) => bindingFor(action) === chord);
    if (matches.length <= 1) return matches[0] || null;
    return matches.find((action) => bindings[action.id] === chord) || matches[0];
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = doc.defaultView.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function accessibleName(el) {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const title = el.getAttribute("title");
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (text && text.length <= 80) return text;
    if (title) return title;
    const child = el.querySelector("[aria-label], [title]");
    if (!child) return "";
    return child.getAttribute("aria-label") || child.getAttribute("title") || "";
  }

  function candidates(root) {
    return root.querySelectorAll(
      "a, button, [role='menuitem'], [role='button'], [role='link'], summary"
    );
  }

  function findClickable(labels, root) {
    const wanted = labels.map(norm);
    const matches = [];
    for (const el of candidates(root || doc)) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast")) continue;
      const name = norm(accessibleName(el));
      if (!wanted.includes(name)) continue;
      if (name.includes("delete")) continue;
      let score = 0;
      if (el.closest("nav, header, [role='navigation'], [role='menu'], [role='menubar']")) score += 2;
      matches.push({ el, score });
    }
    matches.sort((a, b) => b.score - a.score);
    return matches[0] ? matches[0].el : null;
  }

  function clickEl(el) {
    el.click();
  }

  function waitForClickable(labels, root) {
    const existing = findClickable(labels, root);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      const view = doc.defaultView;
      let done = false;
      const finish = (el) => {
        if (done) return;
        done = true;
        observer.disconnect();
        view.clearTimeout(timer);
        resolve(el || null);
      };
      const observer = new view.MutationObserver(() => {
        const el = findClickable(labels, root);
        if (el) finish(el);
      });
      observer.observe(doc.body, { childList: true, subtree: true });
      const timer = view.setTimeout(() => finish(findClickable(labels, root)), 600);
    });
  }

  function toast(message) {
    let node = doc.getElementById("sierra-keys-toast");
    if (!node) {
      node = doc.createElement("div");
      node.id = "sierra-keys-toast";
      node.setAttribute("role", "status");
      doc.documentElement.appendChild(node);
    }
    node.textContent = message;
    doc.defaultView.clearTimeout(toastTimer);
    toastTimer = doc.defaultView.setTimeout(() => node.remove(), 2200);
  }

  function findSearch() {
    const inputs = doc.querySelectorAll("input[type='search'], input[type='text'], input:not([type])");
    const ranked = [];
    for (const el of inputs) {
      if (!visible(el)) continue;
      const hint = norm(
        [
          el.getAttribute("placeholder"),
          el.getAttribute("aria-label"),
          el.getAttribute("title"),
          el.getAttribute("name"),
          el.id,
        ].join(" ")
      );
      const top = el.getBoundingClientRect().top;
      let score = 0;
      if (/search|find lead|find a lead|name, email|email or phone/.test(hint)) score += 5;
      if (top >= 0 && top < 180) score += 3;
      if (el.closest("header, nav, [role='banner']")) score += 2;
      if (score > 0) ranked.push({ el, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].el : null;
  }

  async function openNav(action) {
    let el = findClickable(action.labels);
    if (!el && action.parent) {
      const parent = findClickable([action.parent]);
      if (parent) {
        clickEl(parent);
        el = await waitForClickable(action.labels);
      }
    }
    if (!el) {
      toast("That page isn't in the menu here");
      return;
    }
    clickEl(el);
  }

  function currentRow() {
    const hit = doc.elementFromPoint(pointer.x, pointer.y);
    const hovered = hit && hit.closest && hit.closest("tr, [role='row']");
    if (hovered && !hovered.closest("#sierra-keys-root")) return hovered;
    const boxes = [...doc.querySelectorAll("input[type='checkbox']:checked")].filter(visible);
    const rows = [...new Set(boxes.map((box) => box.closest("tr, [role='row']")).filter(Boolean))];
    return rows.length === 1 ? rows[0] : null;
  }

  function findOpener(root) {
    const ranked = [];
    for (const el of candidates(root)) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root")) continue;
      const blob = norm(`${accessibleName(el)} ${el.getAttribute("title") || ""}`);
      if (/delete|remove|permanently/.test(blob)) continue;
      let score = 0;
      if (blob === "+" || blob === "add" || /\bplus\b|\bmore actions\b|\bquick actions\b/.test(blob)) score += 5;
      if (score > 0) ranked.push({ el, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].el : null;
  }

  async function openRecord(action) {
    const direct = findClickable(action.labels);
    if (direct) {
      clickEl(direct);
      return;
    }
    const row = currentRow();
    const opener = findOpener(row || doc.body);
    if (!row && !opener) {
      toast("Open a lead first");
      return;
    }
    if (opener) {
      clickEl(opener);
      const el = await waitForClickable(action.labels);
      if (el) {
        clickEl(el);
        return;
      }
    }
    toast(row || opener ? "That action isn't on this page" : "Open a lead first");
  }

  function findPhone(root) {
    const ranked = [];
    for (const el of candidates(root)) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast")) continue;
      const blob = norm(`${accessibleName(el)} ${el.getAttribute("title") || ""}`);
      if (/log a call|log call|add to call|text message|send text|call list|call via/.test(blob)) continue;
      let score = 0;
      if (blob === "call" || blob === "phone" || blob === "call lead") score += 5;
      if (/\bphone\b/.test(blob) && !/status/.test(blob)) score += 3;
      if (score > 0) ranked.push({ el, score });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked[0] ? ranked[0].el : null;
  }

  function visibleLabels() {
    const labels = [];
    for (const el of candidates(doc)) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast")) continue;
      const name = norm(accessibleName(el));
      if (name) labels.push(name);
    }
    return labels;
  }

  function findNamed(label) {
    const wanted = norm(label);
    const matches = [];
    for (const el of candidates(doc)) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast")) continue;
      if (norm(accessibleName(el)) !== wanted) continue;
      let score = 0;
      if (el.closest("[role='menu'], [role='dialog'], nav, header")) score += 2;
      matches.push({ el, score });
    }
    matches.sort((a, b) => b.score - a.score);
    return matches[0] ? matches[0].el : null;
  }

  function waitForCallMenu() {
    const interesting = (labels) => labels.some((label) => /call via|\bpersonal\b|connected phone|connected device/.test(label));
    if (interesting(visibleLabels())) return Promise.resolve(visibleLabels());
    return new Promise((resolve) => {
      const view = doc.defaultView;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        observer.disconnect();
        view.clearTimeout(timer);
        resolve(visibleLabels());
      };
      const observer = new view.MutationObserver(() => {
        if (interesting(visibleLabels())) finish();
      });
      observer.observe(doc.body, { childList: true, subtree: true, attributes: true });
      const timer = view.setTimeout(finish, 700);
    });
  }

  async function openDial() {
    const row = currentRow();
    const opener = findPhone(row || doc.body);
    if (!opener) {
      toast(row ? "That action isn't on this page" : "Open a lead first");
      return;
    }
    clickEl(opener);
    let labels = await waitForCallMenu();
    let choice = chooseCall(labels, false);
    if (choice.step === "number") {
      const number = findNamed(choice.label);
      if (!number) {
        toast(choice.reason || "Call via your phone isn't in this menu");
        return;
      }
      clickEl(number);
      labels = await waitForCallMenu();
      choice = chooseCall(labels, true);
    }
    if (choice.step !== "dial") {
      toast(choice.reason);
      return;
    }
    const dial = findNamed(choice.label);
    if (!dial) {
      toast("Call via your phone isn't in this menu");
      return;
    }
    clickEl(dial);
  }

  function closeOverlay() {
    rebindId = null;
    const root = doc.getElementById("sierra-keys-root");
    if (root) root.remove();
  }

  function renderOverlay() {
    let root = doc.getElementById("sierra-keys-root");
    if (!root) {
      root = doc.createElement("section");
      root.id = "sierra-keys-root";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-label", "Sierra shortcuts");
      doc.documentElement.appendChild(root);
      root.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        event.stopPropagation();
        if (button.dataset.act === "close") closeOverlay();
        if (button.dataset.act === "reset") {
          bindings = {};
          rebindId = null;
          saveBindings();
          renderOverlay();
          toast("Shortcuts reset");
        }
        if (button.dataset.act === "rebind") {
          rebindId = button.dataset.id;
          renderOverlay();
        }
      });
    }
    const items = ACTIONS.map((action) => {
      const waiting = rebindId === action.id;
      const where = action.site === "admin" ? "Client Admin" : "Both sites";
      return `<li data-waiting="${waiting ? "true" : "false"}">
        <span>${escapeHtml(action.label)}<br><small style="color:#78716c">${where}</small></span>
        <kbd>${waiting ? "Press a chord" : escapeHtml(chordLabel(bindingFor(action)))}</kbd>
        <button type="button" data-act="rebind" data-id="${action.id}">Change</button>
      </li>`;
    }).join("");
    root.innerHTML = `
      <div id="sierra-keys-head">
        <div>
          <h2>Sierra shortcuts</h2>
          <p>${admin ? "Client Admin. Shift+arrows move across the menus above the lead list, then the lead names. Enter opens the highlighted control." : "Public site."} Letters still type in fields. Alt or Ctrl chords run.</p>
        </div>
        <button type="button" data-act="close">Close</button>
      </div>
      <ul id="sierra-keys-list">${items}</ul>
      <div id="sierra-keys-foot">
        <span>Esc closes. Change, then press the new chord.</span>
        <button type="button" data-act="reset">Reset</button>
      </div>`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function saveBindings() {
    dirty = true;
    storage.set({ bindings });
  }

  function editable(target) {
    const el = target && target.closest && target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']");
    if (!el) return false;
    if (el.matches("input")) {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      if (["button", "checkbox", "radio", "submit", "reset", "file", "hidden", "image"].includes(type)) return false;
    }
    return true;
  }

  function ownLabel(el) {
    let own = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) own += node.nodeValue || "";
    }
    own = own.replace(/\s+/g, " ").trim();
    if (own) return own;
    const full = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (full.length <= 80 && !el.querySelector("button, a, select, input, [role='button']")) return full;
    return "";
  }

  function isInteractiveStop(el) {
    const tag = el.tagName;
    if (tag === "BUTTON" || tag === "A" || tag === "SELECT" || tag === "SUMMARY" || tag === "INPUT") return true;
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (role === "button" || role === "combobox" || role === "tab") return true;
    return el.hasAttribute("aria-haspopup") || el.hasAttribute("aria-expanded");
  }

  function leadNameLinks() {
    const links = [];
    for (const el of doc.querySelectorAll("a[href]")) {
      if (!visible(el)) continue;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast, nav, header, [role='navigation']")) continue;
      if (!isLeadNameCandidate(el.getAttribute("href"), accessibleName(el), `${el.className || ""} ${el.id || ""}`)) continue;
      links.push(el);
    }
    return links;
  }

  function sheetToolbarControls(names) {
    if (!names.length) return [];
    const sheetTop = Math.min(...names.map((el) => el.getBoundingClientRect().top));
    const nameSet = new Set(names);
    const selector = [
      "button",
      "a[href]",
      "select",
      "summary",
      "input[type='button']",
      "input[type='submit']",
      "input[type='reset']",
      "input[type='image']",
      "input[type='checkbox']",
      "[role='button']",
      "[role='combobox']",
      "[role='tab']",
      "[aria-haspopup]",
      "[aria-expanded]",
    ].join(", ");
    const found = [];
    const consider = (el, text) => {
      if (!visible(el) || nameSet.has(el)) return;
      if (el.closest("#sierra-keys-root, #sierra-keys-toast")) return;
      const row = el.closest("tr, [role='row']");
      if (row && names.some((name) => row.contains(name))) return;
      const inAppHeader = !!el.closest("header, [role='banner']");
      if (!isToolbarStop(el.getBoundingClientRect(), text, sheetTop, inAppHeader)) return;
      found.push(el);
    };
    for (const el of doc.querySelectorAll(selector)) consider(el, accessibleName(el));
    for (const el of doc.querySelectorAll("div, span, li, label, th")) {
      if (found.some((other) => other === el || other.contains(el))) continue;
      consider(el, ownLabel(el));
    }
    return found.filter((el) => {
      for (const other of found) {
        if (other === el) continue;
        if (other.contains(el) && (isInteractiveStop(other) || !isInteractiveStop(el))) return false;
        if (el.contains(other) && isInteractiveStop(other) && !isInteractiveStop(el)) return false;
      }
      return true;
    });
  }

  function pointOf(rect) {
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };
  }

  function highlightOrigin() {
    if (highlighted && highlighted.isConnected) {
      const point = pointOf(highlighted.getBoundingClientRect());
      return { ...point, id: highlighted };
    }
    const active = doc.activeElement;
    if (active && active !== doc.body && active !== doc.documentElement && active.getBoundingClientRect) {
      const rect = active.getBoundingClientRect();
      if (rect.width || rect.height) return pointOf(rect);
    }
    return { cx: pointer.x, cy: pointer.y };
  }

  function setHighlight(el) {
    if (highlighted && highlighted !== el) highlighted.classList.remove("sierra-keys-lead-target");
    highlighted = el;
    el.classList.add("sierra-keys-lead-target");
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (typeof el.focus === "function") el.focus({ preventScroll: true });
  }

  function moveLeadHighlight(direction) {
    const names = leadNameLinks();
    const targets = names.concat(sheetToolbarControls(names));
    if (!targets.length) {
      toast("No lead names on this page");
      return;
    }
    const from = highlightOrigin();
    const items = targets.map((el) => {
      const point = pointOf(el.getBoundingClientRect());
      return { id: el, el, ...point };
    });
    const next = nearestInDirection(from, items, direction);
    if (!next) return;
    setHighlight(next.el);
  }

  async function run(action) {
    if (action.id === "help") {
      if (doc.getElementById("sierra-keys-root")) closeOverlay();
      else renderOverlay();
      return;
    }
    if (action.site === "admin" && !admin) {
      toast("That shortcut is for Client Admin");
      return;
    }
    if (action.id === "search") {
      const field = findSearch();
      if (!field) {
        toast("Search isn't on this page");
        return;
      }
      field.focus();
      if (typeof field.select === "function") field.select();
      return;
    }
    if (action.kind === "nav") return openNav(action);
    if (action.kind === "record") return openRecord(action);
    if (action.kind === "dial") return openDial();
  }

  doc.addEventListener("pointermove", (event) => {
    pointer = { x: event.clientX, y: event.clientY };
  }, true);

  doc.defaultView.addEventListener("keydown", (event) => {
    const direction = ARROW_DIRECTIONS[event.code];
    const shiftArrow = admin && direction && event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
    if (event.repeat && !shiftArrow) return;
    if (shiftArrow && !rebindId) {
      if (fieldBlocksWalk(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      moveLeadHighlight(direction);
      return;
    }
    if ((event.code === "Enter" || event.code === "NumpadEnter") && admin && highlighted && highlighted.isConnected && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (editable(event.target)) return;
      if (event.target && event.target.closest && event.target.closest("#sierra-keys-root")) return;
      event.preventDefault();
      event.stopPropagation();
      highlighted.click();
      return;
    }
    if (event.repeat) return;
    if (event.code === "Escape" && doc.getElementById("sierra-keys-root")) {
      event.preventDefault();
      event.stopPropagation();
      if (rebindId) {
        rebindId = null;
        renderOverlay();
      } else {
        closeOverlay();
      }
      return;
    }
    const chord = eventToChord(event);
    if (!chord) return;
    if (rebindId) {
      if (!event.altKey && !event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const reason = rejectChord(chord);
      if (reason) {
        toast(reason);
        return;
      }
      const owner = actionForChord(chord);
      if (owner && owner.id !== rebindId) {
        toast(`Already used by ${owner.label}`);
        return;
      }
      bindings = { ...bindings, [rebindId]: chord };
      rebindId = null;
      saveBindings();
      renderOverlay();
      return;
    }
    const action = actionForChord(chord);
    if (!action) return;
    if (editable(event.target) && !event.altKey && !event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    void run(action);
  }, true);

  storage.get((saved) => {
    if (dirty) return;
    bindings = saved && saved.bindings ? saved.bindings : {};
  });
}

function browserStorage() {
  return {
    get(callback) {
      if (!globalThis.chrome || !chrome.storage || !chrome.storage.local) {
        callback({});
        return;
      }
      chrome.storage.local.get("bindings", (data) => {
        if (chrome.runtime && chrome.runtime.lastError) callback({});
        else callback(data || {});
      });
    },
    set(value) {
      if (!globalThis.chrome || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.set(value);
    },
  };
}

if (typeof document !== "undefined" && document.readyState) {
  const start = () => install(document, browserStorage());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}

if (typeof process !== "undefined" && process.argv && process.argv.includes("--self-test")) {
  const failures = [];
  const check = (name, got, expected) => {
    if (got !== expected) failures.push(`${name}: got ${got} expected ${expected}`);
  };
  check("letter", eventToChord({ code: "KeyS", altKey: true, shiftKey: true, ctrlKey: false }), "Alt+Shift+KeyS");
  check("slash", eventToChord({ code: "Slash", altKey: true, shiftKey: true, ctrlKey: false }), "Alt+Shift+Slash");
  check("modifier only", eventToChord({ code: "ShiftLeft", altKey: true, shiftKey: true, ctrlKey: false }), null);
  check("reserved copy", rejectChord("Alt+Shift+KeyL"), "That chord belongs to the browser");
  check("reserved paste", rejectChord("Ctrl+KeyV"), "That chord belongs to the browser");
  check("plain letter", rejectChord("KeyS"), "Use Alt or Ctrl");
  check("allowed", rejectChord("Alt+Shift+KeyS"), null);
  check("label", chordLabel("Alt+Shift+Slash"), "Alt+Shift+/");
  check("label letter", chordLabel("Alt+Shift+KeyM"), "Alt+Shift+M");
  check("download chord reserved", rejectChord("Alt+Shift+KeyD"), "That chord belongs to the browser");
  check("lead name href", isLeadNameCandidate("lead-detail.aspx?id=1", "Ada Lovelace", ""), true);
  check("menu is not a lead", isLeadNameCandidate("lead-detail.aspx", "Leads Dashboard", "lead-name"), false);
  check("plain link is not a lead", isLeadNameCandidate("/settings.aspx", "Ada Lovelace", ""), false);
  check("bulk actions label", isSheetToolbarLabel("Bulk Actions"), true);
  check("sort by label", isSheetToolbarLabel("Sort by"), true);
  check("agents label", isSheetToolbarLabel("Agents"), true);
  check("name is not a menu", isSheetToolbarLabel("Ada Lovelace"), false);
  check("menu above the names", isToolbarStop({ top: 80, bottom: 104, width: 120, height: 24 }, "Bulk Actions", 200), true);
  check("column header skipped", isToolbarStop({ top: 170, bottom: 190, width: 80, height: 20 }, "Phone", 200), false);
  check("menu close to the names", isToolbarStop({ top: 160, bottom: 184, width: 110, height: 24 }, "Sort by", 200), true);
  check("app header link skipped", isToolbarStop({ top: 8, bottom: 32, width: 70, height: 24 }, "Inbox", 200, true), false);
  check("labeled menu in the header", isToolbarStop({ top: 48, bottom: 76, width: 140, height: 28 }, "Bulk Actions", 200, true), true);
  check("custom filter in the band", isToolbarStop({ top: 80, bottom: 104, width: 150, height: 24 }, "Hot Buyers Now", 200, false), true);
  check("custom filter too far", isToolbarStop({ top: 8, bottom: 32, width: 150, height: 24 }, "Hot Buyers Now", 400, false), false);
  check("wide bar is not one stop", isToolbarStop({ top: 80, bottom: 112, width: 800, height: 32 }, "Bulk Actions", 200, false), false);
  const filled = {
    value: "ada",
    getAttribute() { return "text"; },
    matches(sel) { return sel === "input" || sel === "input, textarea"; },
    closest() { return filled; },
  };
  const empty = { ...filled, value: "  ", closest() { return empty; } };
  const menu = { closest() { return null; } };
  check("filled field keeps shift+arrow", fieldBlocksWalk(filled), true);
  check("empty field walks", fieldBlocksWalk(empty), false);
  check("menu walks", fieldBlocksWalk(menu), false);
  const sheet = [
    { id: "bulk", cx: 80, cy: 40 },
    { id: "sort", cx: 400, cy: 44 },
    { id: "ada", cx: 90, cy: 140 },
    { id: "grace", cx: 90, cy: 180 },
  ];
  check("up onto the menu", nearestInDirection(sheet[2], sheet, "up").id, "bulk");
  check("across the menu", nearestInDirection(sheet[0], sheet, "right").id, "sort");
  check("down onto the name", nearestInDirection(sheet[0], sheet, "down").id, "ada");
  const column = [
    { id: "a", cx: 100, cy: 10 },
    { id: "b", cx: 108, cy: 40 },
    { id: "c", cx: 100, cy: 90 },
  ];
  check("down the column", nearestInDirection(column[0], column, "down").id, "b");
  check("end of column", nearestInDirection(column[2], column, "down"), null);
  check("down is not right", nearestInDirection(column[0], column, "right"), null);
  const sideBySide = [
    { id: "a", cx: 20, cy: 30 },
    { id: "b", cx: 140, cy: 34 },
  ];
  check("right neighbor", nearestInDirection(sideBySide[0], sideBySide, "right").id, "b");
  check("side is not down", nearestInDirection(sideBySide[0], sideBySide, "down"), null);
  check("dial p free", rejectChord("Alt+Shift+KeyP"), null);
  const connectedOnly = chooseCall(["Call via Browser", "Call via (555) 010-0000"], false);
  check("one connected", `${connectedOnly.step}:${connectedOnly.label}`, "dial:call via (555) 010-0000");
  const pickPersonal = chooseCall(["Call via Browser", "Call via (555) 010-0000", "Personal Number"], false);
  check("pick personal first", `${pickPersonal.step}:${pickPersonal.label}`, "number:personal number");
  const thenDial = chooseCall(["Call via Browser", "Call via (555) 010-0000", "Personal Number"], true);
  check("then connected", `${thenDial.step}:${thenDial.label}`, "dial:call via (555) 010-0000");
  const personalLine = chooseCall(["Call via Browser", "Call via Personal (555) 010-0000", "Call via Buyer (555) 010-9999"], false);
  check("personal line", `${personalLine.step}:${personalLine.label}`, "dial:call via personal (555) 010-0000");
  const ambiguous = chooseCall(["Call via (555) 010-0000", "Call via (555) 010-9999"], false);
  check("ambiguous", ambiguous.step, "none");
  const browserOnly = chooseCall(["Call via Browser", "Add to Call List"], false);
  check("browser only", browserOnly.reason, "Call via your phone isn't in this menu");
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log("sierra-keys self-test ok");
}
