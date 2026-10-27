(function () {
  if (!window.Lab) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const slider = document.getElementById("n-slider");
  const numberEl = document.getElementById("n-number");
  const nHint = document.getElementById("n-hint");
  const algorithmEl = document.getElementById("algorithm");
  const zoomEl = document.getElementById("zoom");
  const countBtn = document.getElementById("count-btn");
  const opCount = document.getElementById("op-count");
  const opCaption = document.getElementById("op-caption");
  const meterFill = document.getElementById("meter-fill");
  const snapshot = document.getElementById("snapshot");
  const countLive = document.getElementById("count-live");
  const blurb = document.getElementById("blurb");
  const chart = document.getElementById("chart");
  const legend = document.getElementById("legend");
  const sliceBody = document.getElementById("slice-body");
  const sliceCaption = document.getElementById("slice-caption");

  const secretEl = document.getElementById("secret");
  const guessEl = document.getElementById("guess");
  const fieldHint = document.getElementById("field-hint");
  const board = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resultEl = document.getElementById("result");
  const playBtn = document.getElementById("play");
  const stepBtn = document.getElementById("step");
  const stair = document.getElementById("stair");
  const stairNote = document.getElementById("stair-note");
  const noiseEl = document.getElementById("noise");
  const presetButtons = [
    document.getElementById("pre-start"),
    document.getElementById("pre-long"),
    document.getElementById("pre-exact"),
  ];

  let mode = "early";
  let countToken = 0;
  const walk = { token: 0, timer: 0, shown: 0, signature: "", playing: false };

  for (const algo of Lab.ALGORITHMS) {
    const option = document.createElement("option");
    option.value = algo.id;
    option.textContent = algo.name + " — " + algo.cls;
    algorithmEl.append(option);
  }
  algorithmEl.value = "linear";

  function prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fmt(value) {
    return value.toLocaleString("en-US");
  }

  function clean(value) {
    return Array.from(value)
      .filter(function (ch) {
        return ch.codePointAt(0) >= 32;
      })
      .slice(0, 12)
      .join("");
  }

  function currentN() {
    return Number(slider.value);
  }

  function snapshotSentence(id, n) {
    const ops = Lab.operations(id, n);
    const parts = [
      fmt(ops) + " operations for the selected routine.",
      "At this n, constant lookup is " + fmt(Lab.operations("constant", n)) +
        ", binary search is " + fmt(Lab.operations("binary", n)) +
        ", linear scan is " + fmt(n) +
        ", the mergesort estimate is " + fmt(Lab.operations("nlogn", n)) +
        ", and all-pairs is " + fmt(n * n) + ".",
    ];
    if (n * 2 <= Lab.N_MAX) {
      parts.push(
        "Double the input to " + (n * 2) + " and the selected routine does " +
          fmt(Lab.operations(id, n * 2)) + "."
      );
    }
    return parts.join(" ");
  }

  function svgEl(name, attrs, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, String(attrs[key]));
    });
    if (text != null) node.textContent = text;
    return node;
  }

  function niceStep(raw) {
    if (raw <= 1) return 1;
    const pow = 10 ** Math.floor(Math.log10(raw));
    const scaled = raw / pow;
    const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return nice * pow;
  }

  function renderChart(n, id, zoomed) {
    const padL = 58;
    const padR = 18;
    const padT = 22;
    const padB = 40;
    const width = 680;
    const height = 380;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const selected = Lab.algorithmById(id);

    let yMax = 1;
    const pool = zoomed ? [selected] : Lab.ALGORITHMS;
    for (let size = 1; size <= Lab.N_MAX; size += 1) {
      pool.forEach(function (algo) {
        yMax = Math.max(yMax, algo.ops(size));
      });
    }

    function xPos(size) {
      return padL + ((size - 1) / (Lab.N_MAX - 1)) * plotW;
    }
    function yPos(value) {
      return padT + (1 - value / yMax) * plotH;
    }
    function curve(algo, close) {
      let d = "";
      for (let size = 1; size <= Lab.N_MAX; size += 1) {
        const x = xPos(size).toFixed(2);
        const y = yPos(algo.ops(size)).toFixed(2);
        d += (size === 1 ? "M" : "L") + x + "," + y;
      }
      if (close) {
        d += "L" + xPos(Lab.N_MAX).toFixed(2) + "," + yPos(0).toFixed(2);
        d += "L" + xPos(1).toFixed(2) + "," + yPos(0).toFixed(2) + "Z";
      }
      return d;
    }

    chart.replaceChildren();
    const defs = svgEl("defs", {});
    const clip = svgEl("clipPath", { id: "plot-clip" });
    clip.append(svgEl("rect", { x: padL, y: padT, width: plotW, height: plotH }));
    defs.append(clip);
    chart.append(defs);
    chart.append(svgEl("rect", {
      x: padL, y: padT, width: plotW, height: plotH, fill: "#fbf8f2", stroke: "#e4d9c8",
    }));

    const step = niceStep(yMax / 4);
    for (let tick = step; tick <= yMax + 1e-6; tick += step) {
      const y = yPos(tick);
      chart.append(svgEl("line", {
        x1: padL, x2: padL + plotW, y1: y, y2: y, stroke: "#eadfce",
      }));
      chart.append(svgEl("text", {
        x: padL - 8,
        y: y,
        "text-anchor": "end",
        "dominant-baseline": "middle",
        fill: "#5e574c",
        "font-size": "11",
        "font-family": "ui-monospace, monospace",
      }, fmt(Math.round(tick))));
    }

    [1, 8, 16, 24, 32].forEach(function (size) {
      chart.append(svgEl("text", {
        x: xPos(size),
        y: padT + plotH + 22,
        "text-anchor": "middle",
        fill: "#5e574c",
        "font-size": "11",
        "font-family": "ui-monospace, monospace",
      }, String(size)));
    });

    const yLabel = svgEl("text", {
      x: 14,
      y: padT + plotH / 2,
      "text-anchor": "middle",
      fill: "#5e574c",
      "font-size": "11",
      "font-family": "ui-monospace, monospace",
      transform: "rotate(-90 14 " + (padT + plotH / 2) + ")",
    }, "operations");
    chart.append(yLabel);

    const ordered = Lab.ALGORITHMS.filter(function (algo) {
      return algo.id !== id;
    }).concat(selected);
    const drawn = zoomed ? [selected] : ordered;

    drawn.forEach(function (algo) {
      if (algo.id === id) {
        chart.append(svgEl("path", {
          d: curve(algo, true),
          fill: algo.color,
          opacity: "0.12",
          "clip-path": "url(#plot-clip)",
        }));
      }
      chart.append(svgEl("path", {
        d: curve(algo, false),
        fill: "none",
        stroke: algo.color,
        "stroke-width": algo.id === id ? "2.75" : "1.75",
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        opacity: algo.id === id ? "1" : "0.8",
        "clip-path": "url(#plot-clip)",
      }));
    });

    const markerX = xPos(n);
    chart.append(svgEl("line", {
      x1: markerX,
      x2: markerX,
      y1: padT,
      y2: padT + plotH,
      stroke: "#1c1916",
      "stroke-dasharray": "3 4",
    }));
    chart.append(svgEl("circle", {
      cx: markerX,
      cy: yPos(selected.ops(n)),
      r: "4.5",
      fill: selected.color,
      stroke: "#fbf8f2",
      "stroke-width": "1.5",
    }));
    const anchor = n > Lab.N_MAX - 4 ? "end" : "start";
    chart.append(svgEl("text", {
      x: markerX + (anchor === "end" ? -6 : 6),
      y: padT + 14,
      "text-anchor": anchor,
      fill: "#1c1916",
      "font-size": "12",
      "font-family": "ui-monospace, monospace",
    }, "n=" + n));

    chart.setAttribute(
      "aria-label",
      selected.name + " is " + selected.cls + ". At n = " + n + " it performs " +
        fmt(selected.ops(n)) + " operations. The chart plots sizes 1 through " +
        Lab.N_MAX + (zoomed ? ", scaled to the selected routine." : ", with all five routines.")
    );

    legend.replaceChildren();
    Lab.ALGORITHMS.forEach(function (algo) {
      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = algo.color;
      item.append(swatch, document.createTextNode(algo.cls + " " + algo.name));
      if (algo.id === id) item.classList.add("is-selected");
      if (zoomed && algo.id !== id) item.classList.add("is-dim");
      legend.append(item);
    });
  }

  function renderTable(n, id) {
    sliceCaption.textContent = "Operations at n = " + n;
    sliceBody.replaceChildren();
    Lab.ALGORITHMS.forEach(function (algo) {
      const row = document.createElement("tr");
      if (algo.id === id) row.classList.add("is-selected");
      const name = document.createElement("th");
      name.scope = "row";
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = algo.color;
      name.append(swatch, document.createTextNode(algo.name + " · " + algo.cls));
      const value = document.createElement("td");
      value.textContent = fmt(algo.ops(n));
      row.append(name, value);
      sliceBody.append(row);
    });
  }

  function renderGrowth() {
    countToken += 1;
    const n = currentN();
    const id = algorithmEl.value;
    const algo = Lab.algorithmById(id);
    const ops = Lab.operations(id, n);
    opCount.textContent = fmt(ops);
    opCount.style.color = algo.color;
    opCaption.textContent = "operations · " + algo.name;
    blurb.textContent = algo.blurb;
    snapshot.textContent = snapshotSentence(id, n);
    meterFill.style.transform = "scaleX(" + ops / (n * n) + ")";
    meterFill.style.background = algo.color;
    renderTable(n, id);
    renderChart(n, id, zoomEl.checked);
  }

  function clearNError() {
    nHint.textContent = "";
    numberEl.setAttribute("aria-invalid", "false");
  }

  slider.addEventListener("input", function () {
    numberEl.value = slider.value;
    clearNError();
    renderGrowth();
  });

  numberEl.addEventListener("input", function () {
    const n = Lab.clampN(Number(numberEl.value));
    if (n == null) {
      nHint.textContent = "Use a whole number from 1 to 32. The chart is still showing the slider.";
      numberEl.setAttribute("aria-invalid", "true");
      return;
    }
    clearNError();
    slider.value = String(n);
    renderGrowth();
  });

  algorithmEl.addEventListener("change", renderGrowth);
  zoomEl.addEventListener("change", renderGrowth);

  countBtn.addEventListener("click", function () {
    const n = currentN();
    const id = algorithmEl.value;
    const ops = Lab.operations(id, n);
    const token = ++countToken;
    const start = performance.now();
    const duration = prefersReduced() ? 0 : 900;
    function tick(now) {
      if (token !== countToken) return;
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const shown = Math.round(ops * eased);
      opCount.textContent = fmt(shown);
      meterFill.style.transform = "scaleX(" + (ops * eased) / (n * n) + ")";
      if (t < 1) requestAnimationFrame(tick);
      else {
        countLive.textContent = Lab.algorithmById(id).name + " performs " + fmt(ops) + " operations at n = " + n + ".";
      }
    }
    countLive.textContent = "";
    requestAnimationFrame(tick);
  });

  function stepsFor(analysis) {
    return mode === "early" ? analysis.earlySteps : analysis.fullSteps;
  }

  function signature() {
    return secretEl.value + "\0" + guessEl.value + "\0" + mode;
  }

  function stopWalk() {
    walk.token += 1;
    walk.playing = false;
    window.clearTimeout(walk.timer);
  }

  function tileFace(ch) {
    if (ch == null) return { text: "·", label: "missing character" };
    if (ch === " ") return { text: "␣", label: "space" };
    return { text: ch, label: ch };
  }

  function explanation(analysis) {
    if (analysis.width === 0) return "Type a secret to give the comparison a width.";
    const bits = [
      "Shared prefix: " + analysis.prefix + ". Stop early: " + analysis.earlySteps +
        (analysis.earlySteps === 1 ? " step" : " steps") + ". Check every character: " +
        analysis.fullSteps + (analysis.fullSteps === 1 ? " step" : " steps") + ".",
    ];
    if (analysis.equal) {
      bits.push("The strings match across the width. Stopping early still examines every character, because it returns early only when it finds a difference.");
    } else if (analysis.earlySteps === analysis.fullSteps) {
      bits.push("Stopping early still examines the whole width. The first difference is at the last position, or the guess runs out there, so this failure costs the same number of steps as a match.");
    } else {
      bits.push("Stopping early returns at the first difference. Its step count is one more than the shared prefix, so the count and the prefix are the same piece of information.");
    }
    if (analysis.ignored > 0) {
      bits.push(
        analysis.ignored + (analysis.ignored === 1 ? " character past the width is" : " characters past the width are") + " not read."
      );
    }
    const missing = analysis.cells.filter(function (cell) {
      return cell.guess == null;
    }).length;
    if (missing > 0) {
      bits.push(
        (missing === 1 ? "One position has" : missing + " positions have") +
          " no guess character. A missing character is a difference."
      );
    }
    return bits.join(" ");
  }

  function statusText(analysis, shown) {
    const total = stepsFor(analysis);
    if (analysis.width === 0) return "Type a secret to start the walk.";
    if (shown <= 0) return walk.playing ? "Starting the walk." : "Press Play, or step one character.";
    if (shown < total) return "Examined " + shown + " of " + total + ".";
    if (mode === "early" && !analysis.equal) {
      return "Stopped at the first difference, after " + total + (total === 1 ? " character." : " characters.");
    }
    return "Examined all " + total + (total === 1 ? " character." : " characters.");
  }

  function renderBoard(analysis, shown) {
    board.replaceChildren();
    const total = stepsFor(analysis);
    analysis.cells.forEach(function (cell, index) {
      const examined = index < shown;
      const col = document.createElement("div");
      col.className = "col";
      if (examined) col.classList.add("examined", cell.same ? "same" : "diff");
      if (examined && shown < total && index === shown - 1) col.classList.add("cursor");

      const secretFace = tileFace(cell.secret);
      const guessFace = tileFace(cell.guess);
      const secretTile = document.createElement("div");
      secretTile.className = "tile";
      secretTile.textContent = secretFace.text;
      const guessTile = document.createElement("div");
      guessTile.className = "tile guess";
      guessTile.textContent = guessFace.text;
      const idx = document.createElement("div");
      idx.className = "idx";
      idx.textContent = String(index + 1);

      const state = !examined ? "not examined" : cell.same ? "match" : "difference";
      col.setAttribute("role", "group");
      col.setAttribute(
        "aria-label",
        "Position " + (index + 1) + ", secret " + secretFace.label + ", guess " + guessFace.label + ", " + state
      );
      col.append(secretTile, guessTile, idx);
      board.append(col);
    });
  }

  function renderStair(analysis) {
    const rows = Lab.staircase(secretEl.value);
    stair.replaceChildren();
    rows.forEach(function (row) {
      const item = document.createElement("li");
      if (analysis.width > 0 && row.prefix === analysis.prefix) item.classList.add("is-current");
      const bars = document.createElement("div");
      bars.className = "bars";
      const early = document.createElement("span");
      early.className = "bar early";
      early.style.height = (row.earlySteps / analysis.width) * 100 + "%";
      const full = document.createElement("span");
      full.className = "bar full";
      full.style.height = (row.fullSteps / analysis.width) * 100 + "%";
      bars.append(early, full);
      if (noiseEl.checked) {
        Lab.noisyTicks(row.earlySteps, secretEl.value + ":" + row.prefix).forEach(function (sample) {
          const dot = document.createElement("span");
          dot.className = "tick-dot";
          const fraction = Math.max(0, Math.min(1, sample / 10 / analysis.width));
          dot.style.bottom = fraction * 100 + "%";
          bars.append(dot);
        });
      }
      const label = document.createElement("span");
      label.className = "xlabel";
      label.textContent = String(row.prefix);
      const sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = "Prefix " + row.prefix + ": stop-early " + row.earlySteps + ", check-every " + row.fullSteps + ".";
      item.append(bars, label, sr);
      stair.append(item);
    });

    stairNote.textContent = analysis.width === 0
      ? "Type a secret to plot the costs."
      : "The marked column is this guess: shared prefix " + analysis.prefix +
        ", stop early " + analysis.earlySteps + (analysis.earlySteps === 1 ? " step" : " steps") +
        ", check every character " + analysis.fullSteps + (analysis.fullSteps === 1 ? " step" : " steps") + ".";
  }

  function syncDisabled(analysis) {
    const off = analysis.width === 0;
    playBtn.disabled = off;
    stepBtn.disabled = off;
    presetButtons.forEach(function (button) {
      button.disabled = off;
    });
  }

  function paint(analysis, shown) {
    renderBoard(analysis, shown);
    statusEl.textContent = statusText(analysis, shown);
  }

  function showFinished() {
    stopWalk();
    const analysis = Lab.analyze(secretEl.value, guessEl.value);
    walk.shown = stepsFor(analysis);
    walk.signature = signature();
    paint(analysis, walk.shown);
    resultEl.textContent = explanation(analysis);
    renderStair(analysis);
    syncDisabled(analysis);
  }

  function bindText(input) {
    input.addEventListener("input", function () {
      const next = clean(input.value);
      if (next !== input.value) {
        input.value = next;
        fieldHint.textContent = "Kept to 12 characters.";
      } else if (secretEl.value.length === 0) {
        fieldHint.textContent = "Type a secret. It stays in this browser tab.";
      } else {
        fieldHint.textContent = "";
      }
      showFinished();
    });
  }

  bindText(secretEl);
  bindText(guessEl);

  function setMode(next) {
    mode = next;
    document.getElementById("mode-early").setAttribute("aria-pressed", mode === "early" ? "true" : "false");
    document.getElementById("mode-full").setAttribute("aria-pressed", mode === "full" ? "true" : "false");
    showFinished();
  }

  document.getElementById("mode-early").addEventListener("click", function () {
    setMode("early");
  });
  document.getElementById("mode-full").addEventListener("click", function () {
    setMode("full");
  });

  function guessFor(kind) {
    const chars = Array.from(secretEl.value);
    if (chars.length === 0) return "";
    if (kind === "exact") return chars.join("");
    const mismatchAt = kind === "start" ? 0 : chars.length - 1;
    return chars.map(function (ch, index) {
      if (index !== mismatchAt) return ch;
      return ch === "X" ? "Y" : "X";
    }).join("");
  }

  document.getElementById("pre-start").addEventListener("click", function () {
    guessEl.value = guessFor("start");
    fieldHint.textContent = "";
    showFinished();
  });
  document.getElementById("pre-long").addEventListener("click", function () {
    guessEl.value = guessFor("long");
    fieldHint.textContent = "";
    showFinished();
  });
  document.getElementById("pre-exact").addEventListener("click", function () {
    guessEl.value = guessFor("exact");
    fieldHint.textContent = "";
    showFinished();
  });

  function play() {
    const analysis = Lab.analyze(secretEl.value, guessEl.value);
    if (analysis.width === 0) return;
    stopWalk();
    const token = walk.token;
    const total = stepsFor(analysis);
    walk.shown = 0;
    walk.signature = signature();
    walk.playing = true;
    paint(analysis, 0);
    if (prefersReduced()) {
      walk.playing = false;
      walk.shown = total;
      paint(analysis, total);
      return;
    }
    function tick() {
      if (token !== walk.token) return;
      walk.shown += 1;
      const current = Lab.analyze(secretEl.value, guessEl.value);
      paint(current, walk.shown);
      if (walk.shown >= stepsFor(current)) {
        walk.playing = false;
        return;
      }
      walk.timer = window.setTimeout(tick, 320);
    }
    walk.timer = window.setTimeout(tick, 220);
  }

  function step() {
    const analysis = Lab.analyze(secretEl.value, guessEl.value);
    if (analysis.width === 0) return;
    const total = stepsFor(analysis);
    stopWalk();
    if (walk.signature !== signature() || walk.shown >= total || walk.shown <= 0) {
      walk.shown = 0;
      walk.signature = signature();
    }
    walk.shown += 1;
    paint(analysis, walk.shown);
  }

  playBtn.addEventListener("click", play);
  stepBtn.addEventListener("click", step);
  guessEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      play();
    }
  });
  noiseEl.addEventListener("change", function () {
    renderStair(Lab.analyze(secretEl.value, guessEl.value));
  });

  renderGrowth();
  showFinished();
})();
