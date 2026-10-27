// Operation-count model for the lab. No DOM, so the counts can be checked with node.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Lab = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const N_MAX = 32;

  function binaryProbes(n) {
    return Math.floor(Math.log2(n)) + 1;
  }

  function mergeComparisons(n) {
    if (n <= 1) return 0;
    return Math.round(n * Math.log2(n));
  }

  const ALGORITHMS = [
    {
      id: "constant",
      name: "Constant lookup",
      cls: "O(1)",
      color: "#6f675c",
      blurb:
        "Read one known slot. Growing the table does not add another read in this model, so the count stays at 1.",
      ops: function () {
        return 1;
      },
    },
    {
      id: "binary",
      name: "Binary search",
      cls: "O(log n)",
      color: "#1e3a5f",
      blurb:
        "The table is sorted. Each probe discards half of the remaining range. The worst case is floor(log₂ n) + 1 probes.",
      ops: binaryProbes,
    },
    {
      id: "linear",
      name: "Linear scan",
      cls: "O(n)",
      color: "#1a684f",
      blurb: "Look at every entry once. Doubling the input doubles the number of probes.",
      ops: function (n) {
        return n;
      },
    },
    {
      id: "nlogn",
      name: "Merge sort (estimate)",
      cls: "O(n log n)",
      color: "#8a5a10",
      blurb:
        "A standard mergesort estimate: about n log₂ n comparisons, and 0 when n is 1 because a one-element list is already sorted. This curve is the estimate, not a live sort.",
      ops: mergeComparisons,
    },
    {
      id: "pairs",
      name: "All pairs",
      cls: "O(n²)",
      color: "#b6402c",
      blurb:
        "For every entry, look at every entry, including the entry itself. The count is n × n, so doubling n multiplies the work by about four.",
      ops: function (n) {
        return n * n;
      },
    },
  ];

  function algorithmById(id) {
    return ALGORITHMS.find(function (algo) {
      return algo.id === id;
    }) || ALGORITHMS.find(function (algo) {
      return algo.id === "linear";
    });
  }

  function operations(id, n) {
    return algorithmById(id).ops(n);
  }

  function clampN(n) {
    if (!Number.isInteger(n) || n < 1 || n > N_MAX) return null;
    return n;
  }

  function charsOf(value) {
    return Array.from(value);
  }

  function analyze(secret, guess) {
    const secretChars = charsOf(secret);
    const guessChars = charsOf(guess);
    const width = secretChars.length;
    let prefix = 0;
    while (
      prefix < width &&
      prefix < guessChars.length &&
      secretChars[prefix] === guessChars[prefix]
    ) {
      prefix += 1;
    }

    const cells = secretChars.map(function (ch, index) {
      const present = index < guessChars.length;
      const guessChar = present ? guessChars[index] : null;
      return {
        secret: ch,
        guess: guessChar,
        same: present && guessChar === ch,
      };
    });

    const equal = width > 0 && cells.every(function (cell) {
      return cell.same;
    });
    const earlySteps = width === 0 ? 0 : prefix < width ? prefix + 1 : width;

    return {
      width: width,
      prefix: prefix,
      equal: equal,
      earlySteps: earlySteps,
      fullSteps: width,
      ignored: Math.max(0, guessChars.length - width),
      cells: cells,
    };
  }

  function staircase(secret) {
    const width = charsOf(secret).length;
    if (width === 0) return [];
    const rows = [];
    for (let prefix = 0; prefix <= width; prefix += 1) {
      rows.push({
        prefix: prefix,
        earlySteps: prefix < width ? prefix + 1 : width,
        fullSteps: width,
      });
    }
    return rows;
  }

  function hashString(text) {
    let hash = 2166136261 >>> 0;
    for (const ch of text) {
      hash ^= ch.codePointAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fictional clock: 10 ticks per real step, plus jitter in [-9, 9).
  function noisyTicks(steps, salt, count) {
    const samples = [];
    const random = mulberry32(hashString(String(salt)));
    const total = count || 6;
    for (let i = 0; i < total; i += 1) {
      samples.push(steps * 10 + (random() * 18 - 9));
    }
    return samples;
  }

  return {
    N_MAX: N_MAX,
    ALGORITHMS: ALGORITHMS,
    clampN: clampN,
    algorithmById: algorithmById,
    operations: operations,
    analyze: analyze,
    staircase: staircase,
    noisyTicks: noisyTicks,
  };
});
