/* ── Theme ── */
let gridColor = "rgba(255,255,255,0.06)";
let tickColor = "#949ba4";

function updateThemeIcon(isLight) {
  document.getElementById("theme-btn").innerHTML = isLight
    ? '<svg viewBox="0 0 24 24"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>';

  gridColor = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
  tickColor = isLight ? "#6d6f78" : "#949ba4";
  Chart.defaults.color = tickColor;
}

const savedTheme = localStorage.getItem("dca-theme");
if (
  savedTheme === "light" ||
  (!savedTheme &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches)
) {
  document.documentElement.classList.add("theme-light");
  updateThemeIcon(true);
} else {
  updateThemeIcon(false);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("theme-light");
  localStorage.setItem("dca-theme", isLight ? "light" : "dark");
  updateThemeIcon(isLight);
  updateChartsTheme();
}

function updateChartsTheme() {
  Object.values(charts).forEach((chart) => {
    if (chart.options.scales) {
      if (chart.options.scales.x) {
        if (chart.options.scales.x.grid)
          chart.options.scales.x.grid.color = gridColor;
        if (chart.options.scales.x.ticks)
          chart.options.scales.x.ticks.color = tickColor;
      }
      if (chart.options.scales.y) {
        if (chart.options.scales.y.grid)
          chart.options.scales.y.grid.color = gridColor;
        if (chart.options.scales.y.ticks)
          chart.options.scales.y.ticks.color = tickColor;
      }
    }
    chart.update();
  });
}

/* ── Collapsible Sections ── */
function initCollapsibles() {
  document.querySelectorAll(".section-title").forEach((el) => {
    if (el.dataset.initialized) return;
    el.dataset.initialized = "true";
    el.addEventListener("click", () => {
      el.classList.toggle("collapsed");
      const isCol = el.classList.contains("collapsed");
      let next = el.nextElementSibling;
      while (
        next &&
        !next.classList.contains("section-title") &&
        next.tagName !== "SCRIPT" &&
        next.tagName !== "STYLE"
      ) {
        next.style.display = isCol ? "none" : "";
        next = next.nextElementSibling;
      }
    });
  });
}

/* ── Drag & Drop ── */
const uploadEl = document.getElementById("upload-section");
uploadEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadEl.classList.add("dragover");
});
uploadEl.addEventListener("dragleave", () =>
  uploadEl.classList.remove("dragover"),
);
uploadEl.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadEl.classList.remove("dragover");
  const files = Array.from(e.dataTransfer.files).filter((f) =>
    f.name.endsWith(".csv"),
  );
  if (files.length > 0) handleFiles(files);
});

document.getElementById("csv-upload").addEventListener("change", function (e) {
  const files = Array.from(e.target.files).filter((f) =>
    f.name.endsWith(".csv"),
  );
  if (files.length > 0) handleFiles(files);
});

let rawParsedData = null;

function handleFiles(files) {
  document.getElementById("upload-title").textContent =
    `Loading ${files.length} CSV file(s) into memory...`;
  document.getElementById("upload-desc").textContent =
    "This might take a few seconds with large files.";

  let completed = 0;
  let combinedData = [];

  files.forEach((file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        combinedData = combinedData.concat(results.data);
        completed++;

        document.getElementById("upload-desc").textContent =
          `Parsed ${completed} of ${files.length} files...`;

        if (completed === files.length) {
          document.getElementById("upload-title").textContent =
            "Merging and Deduplicating...";

          // Deduplicate by Author, Date, and Content
          setTimeout(() => {
            const uniqueMap = new Map();
            combinedData.forEach((row) => {
              if (!row.Date || !row.Author) return;
              const key =
                row.Date + "|" + row.Author + "|" + (row.Content || "");
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, row);
              }
            });
            rawParsedData = Array.from(uniqueMap.values());

            document.getElementById("upload-title").textContent =
              "Calculating Stats...";
            document.getElementById("upload-desc").textContent =
              `Processing ${fmtNum(rawParsedData.length)} unique messages...`;
            setTimeout(() => processData(rawParsedData), 50);
          }, 50);
        }
      },
      error: () => {
        alert(`Could not parse the file: ${file.name}`);
      },
    });
  });
}

/* ── Filter events ── */
document.getElementById("filter-after").addEventListener("change", () => {
  if (rawParsedData) processData(rawParsedData);
});
document.getElementById("filter-before").addEventListener("change", () => {
  if (rawParsedData) processData(rawParsedData);
});
document.getElementById("filter-reset").addEventListener("click", () => {
  document.getElementById("filter-after").value = "";
  document.getElementById("filter-before").value = "";
  if (rawParsedData) processData(rawParsedData);
});

/* ── Helpers ── */
let charts = {};

const palette = [
  "#5865f2", // blurple
  "#57f287", // green
  "#fee75c", // yellow
  "#ed4245", // red
  "#eb459e", // fuchsia
  "#5bc0eb", // sky
];

function getMedian(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function fmtNum(n) {
  return Number(n).toLocaleString();
}

function fmtDuration(mins) {
  if (mins < 60) return mins + "m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? h + "h " + m + "m" : h + "h";
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return d + "d " + (rh > 0 ? rh + "h" : "");
}

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = tickColor;

/* ── Table Sorting State ── */
let sortCol = "msgs";
let sortAsc = false;
let lastAuthorStats = null;
let lastTotalProcessedMsgs = 0;
let lastMaxMsgs = 0;

document.querySelectorAll(".user-table th").forEach((th) => {
  th.addEventListener("click", () => {
    const col = th.dataset.sort;
    if (!col) return;
    if (sortCol === col) sortAsc = !sortAsc;
    else {
      sortCol = col;
      sortAsc = col === "name" || col === "resp";
    }

    document
      .querySelectorAll(".user-table th")
      .forEach((h) => (h.className = ""));
    th.className = sortAsc ? "sort-asc" : "sort-desc";

    renderTable();
  });
});

/* ── Process Data ── */
function processData(data) {
  const excludeBots = document.getElementById("exclude-bots").checked;
  const botRegex = /#\d{4}/;

  // Date filters
  const filterAfterVal = document.getElementById("filter-after").value;
  const filterBeforeVal = document.getElementById("filter-before").value;
  const filterAfter = filterAfterVal
    ? new Date(filterAfterVal + "T00:00:00")
    : null;
  const filterBefore = filterBeforeVal
    ? new Date(filterBeforeVal + "T23:59:59")
    : null;

  const validData = data
    .filter((row) => {
      if (!row.Author || !row.Date) return false;
      if (excludeBots && botRegex.test(row.Author)) return false;
      const d = new Date(row.Date);
      if (isNaN(d)) return false;
      if (filterAfter && d < filterAfter) return false;
      if (filterBefore && d > filterBefore) return false;
      return true;
    })
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // Update filter count
  const totalRaw = data.filter((r) => r.Author && r.Date).length;
  const filterCountEl = document.getElementById("filter-count");
  if (filterAfter || filterBefore) {
    filterCountEl.textContent =
      fmtNum(validData.length) + " of " + fmtNum(totalRaw) + " messages";
  } else {
    filterCountEl.textContent = "";
  }

  if (validData.length === 0) {
    if (!filterAfter && !filterBefore) {
      alert("No valid messages found. Check your CSV file.");
      location.reload();
    } else {
      alert("No messages found in the selected date range.");
    }
    return;
  }

  // Identify all authors and top authors for display
  const globalAuthorCounts = {};
  validData.forEach((r) => {
    globalAuthorCounts[r.Author] = (globalAuthorCounts[r.Author] || 0) + 1;
  });
  const allAuthors = Object.keys(globalAuthorCounts);
  const topAuthors = Object.entries(globalAuthorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((item) => item[0]);

  const authorStats = {};
  allAuthors.forEach(
    (a) =>
      (authorStats[a] = {
        msgs: 0,
        wordCounts: [],
        responseTimes: [],
        starters: 0,
        media: 0,
        consecutiveStreaks: [],
        emojis: 0,
        stickers: 0,
        voiceMessages: 0,
        calls: 0,
        callMinutes: 0,
        callDurations: [],
        reactions: 0,
        totalWords: 0,
      }),
  );

  const hourCounts = new Array(24).fill(0);
  const timePeriodCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const dateCounts = {};
  const dayOfWeekCounts = new Array(7).fill(0);
  const wordCounts = {};

  // Heatmap: [day][hour] = count
  const heatmapData = Array.from({ length: 7 }, () => new Array(24).fill(0));

  // Reactions
  const reactionCounts = {}; // { emoji: count }
  let totalReactions = 0;
  let totalReactedMessages = 0;
  const userReactionsReceived = {}; // { author: count }
  let mostReactedMsg = null; // { author, content, reactions, count }
  const reactionRegex = /([^,]+?)\s*\((\d+)\)/g;
  const customEmojiCounts = {};

  // Global extras
  let totalEmojis = 0;
  let totalStickers = 0;
  let totalVoiceMessages = 0;
  let totalCalls = 0;
  let totalCallMinutes = 0;
  let totalWords = 0;
  let totalMedia = 0;
  const allCallDurations = []; // {date, mins, author}
  const callDayOfWeekCounts = new Array(7).fill(0);

  const stopWords = new Set([
    "the",
    "and",
    "to",
    "i",
    "a",
    "of",
    "it",
    "in",
    "you",
    "is",
    "for",
    "that",
    "my",
    "on",
    "me",
    "we",
    "this",
    "with",
    "so",
    "be",
    "but",
    "was",
    "have",
    "not",
    "your",
    "like",
    "just",
    "are",
    "do",
    "im",
    "can",
    "what",
    "if",
    "all",
    "get",
    "out",
    "about",
    "when",
    "know",
    "up",
    "how",
    "they",
    "as",
    "at",
    "it's",
    "i'm",
    "don't",
    "dont",
    "or",
    "from",
    "no",
    "he",
    "she",
    "would",
    "got",
    "too",
    "ur",
    "u",
    "its",
    "that's",
    "then",
    "there",
    "was",
    "were",
    "been",
    "will",
    "going",
    "really",
    "some",
    "because",
    "cuz",
    "cause",
    "https",
    "http",
    "com",
    "www",
    "net",
    "org",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "mp4",
    "mov",
    "webp",
    "discordapp",
    "cdn",
  ]);

  const customEmojiRegex = /<:[^:]+:\d+>/g;
  const stickerRegex =
    /\[([^\]]+)\]\(https:\/\/media\.discordapp\.net\/stickers\//;
  const callRegex = /^Started a call that lasted (\d+) minutes?\.$/;

  let lastMsgTime = null;
  let lastAuthor = null;
  let currentStreakCounter = 0;

  validData.forEach((row) => {
    const author = row.Author;
    if (!authorStats[author]) return;

    const dateObj = new Date(row.Date);
    if (isNaN(dateObj)) return;

    const content = row.Content || "";
    const attachments = row.Attachments || "";

    // ── Calls ──
    const callMatch = content.match(callRegex);
    if (callMatch) {
      const mins = parseInt(callMatch[1], 10);
      authorStats[author].calls++;
      authorStats[author].callMinutes += mins;
      authorStats[author].callDurations.push(mins);
      totalCalls++;
      totalCallMinutes += mins;
      allCallDurations.push({ date: dateObj, mins, author });
      callDayOfWeekCounts[dateObj.getDay()]++;
    }

    // ── Voice messages ──
    if (attachments.includes("voice-message.ogg")) {
      authorStats[author].voiceMessages++;
      totalVoiceMessages++;
    }

    // ── Stickers ──
    if (stickerRegex.test(content)) {
      authorStats[author].stickers++;
      totalStickers++;
    }

    // ── Custom emojis ──
    const emojiMatches = content.match(customEmojiRegex);
    if (emojiMatches) {
      authorStats[author].emojis += emojiMatches.length;
      totalEmojis += emojiMatches.length;
      emojiMatches.forEach((e) => {
        const name = e.split(":")[1];
        customEmojiCounts[name] = (customEmojiCounts[name] || 0) + 1;
      });
    }

    // ── Consecutive Messages ──
    if (author === lastAuthor) {
      currentStreakCounter++;
    } else {
      if (lastAuthor && authorStats[lastAuthor]) {
        authorStats[lastAuthor].consecutiveStreaks.push(currentStreakCounter);
      }
      currentStreakCounter = 1;
    }

    // ── Timestamps / Starters / Response Time ──
    if (lastMsgTime) {
      const diffMs = dateObj - lastMsgTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMins = diffMs / (1000 * 60);
      if (diffHours > 1) {
        authorStats[author].starters++;
      } else if (lastAuthor !== author && diffHours < 2) {
        authorStats[author].responseTimes.push(diffMins);
      }
    } else {
      authorStats[author].starters++;
    }

    lastMsgTime = dateObj;
    lastAuthor = author;

    // ── Media & Links ──
    if (
      (attachments.trim() !== "" &&
        !attachments.includes("voice-message.ogg")) ||
      content.includes("http://") ||
      content.includes("https://")
    ) {
      authorStats[author].media++;
      totalMedia++;
    }

    // ── Reactions ──
    const reactionsStr = row.Reactions || "";
    if (reactionsStr.trim()) {
      let match;
      let msgReactionCount = 0;
      const rxRegex = /([^,]+?)\s*\((\d+)\)/g;
      while ((match = rxRegex.exec(reactionsStr)) !== null) {
        const rxName = match[1].trim();
        const rxCount = parseInt(match[2], 10);
        reactionCounts[rxName] = (reactionCounts[rxName] || 0) + rxCount;
        msgReactionCount += rxCount;
        totalReactions += rxCount;
      }
      if (msgReactionCount > 0) {
        totalReactedMessages++;
        userReactionsReceived[author] =
          (userReactionsReceived[author] || 0) + msgReactionCount;
        if (!mostReactedMsg || msgReactionCount > mostReactedMsg.count) {
          mostReactedMsg = {
            author,
            content: content.substring(0, 200),
            reactions: reactionsStr,
            count: msgReactionCount,
          };
        }
      }
    }

    // ── Counting ──
    authorStats[author].msgs++;
    const hour = dateObj.getHours();
    hourCounts[hour]++;
    dayOfWeekCounts[dateObj.getDay()]++;
    heatmapData[dateObj.getDay()][hour]++;

    if (hour >= 6 && hour < 12) timePeriodCounts.morning++;
    else if (hour >= 12 && hour < 18) timePeriodCounts.afternoon++;
    else if (hour >= 18 && hour <= 23) timePeriodCounts.evening++;
    else timePeriodCounts.night++;

    const dateStr = dateObj.toISOString().split("T")[0];
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;

    // ── Words ──
    const rawWords = content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const wc = rawWords.length;
    authorStats[author].wordCounts.push(wc);
    authorStats[author].totalWords += wc;
    totalWords += wc;

    let cleanContent = content
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/<:[^:]+:\d+>/g, "");
    const words = cleanContent.toLowerCase().match(/\b[a-z']+\b/g);
    if (words) {
      words.forEach((w) => {
        if (w.length > 2 && !stopWords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    }
  });

  // Final streak
  if (lastAuthor && authorStats[lastAuthor]) {
    authorStats[lastAuthor].consecutiveStreaks.push(currentStreakCounter);
  }

  // ── Streak + Busiest Day ──
  const sortedDates = Object.keys(dateCounts).sort();
  let maxStreak = 0,
    currentStreak = 0;
  let busiestDay = { date: "—", count: 0 };

  for (let i = 0; i < sortedDates.length; i++) {
    if (dateCounts[sortedDates[i]] > busiestDay.count) {
      busiestDay = { date: sortedDates[i], count: dateCounts[sortedDates[i]] };
    }
    if (i === 0) {
      currentStreak = 1;
    } else {
      const diff =
        (new Date(sortedDates[i]) - new Date(sortedDates[i - 1])) / 86400000;
      if (Math.round(diff) === 1) currentStreak++;
      else {
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        currentStreak = 1;
      }
    }
  }
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  // ── Conversations (>1h gaps) ──
  let totalConversations = 1;
  let prevTime = null;
  validData.forEach((row) => {
    const d = new Date(row.Date);
    if (isNaN(d)) return;
    if (prevTime && d - prevTime > 1 * 3600000) totalConversations++;
    prevTime = d;
  });

  // ── Date range ──
  const firstDate = sortedDates[0] || "—";
  const lastDate = sortedDates[sortedDates.length - 1] || "—";

  // ── Show dashboard ──
  document.getElementById("upload-section").classList.add("hidden");
  document.getElementById("dashboard").classList.add("visible");
  document.getElementById("export-btn").classList.remove("hidden");

  let totalProcessedMsgs = 0;
  let topSender = { name: "—", count: 0 };
  let topStarter = { name: "—", count: 0 };

  Object.keys(authorStats).forEach((author) => {
    totalProcessedMsgs += authorStats[author].msgs;
    if (authorStats[author].msgs > topSender.count)
      topSender = { name: author, count: authorStats[author].msgs };
    if (authorStats[author].starters > topStarter.count)
      topStarter = { name: author, count: authorStats[author].starters };
  });

  // Build top-only authorStats for charts/table (top 6)
  const topAuthorStats = {};
  topAuthors.forEach((a) => (topAuthorStats[a] = authorStats[a]));

  const totalDays = sortedDates.length > 0 ? sortedDates.length : 1;
  const dailyAvg = Math.round(totalProcessedMsgs / totalDays);

  // ── Build stat cards ──
  const statsData = [
    { label: "Total Messages", value: fmtNum(totalProcessedMsgs) },
    { label: "Total Words", value: fmtNum(totalWords) },
    { label: "Active Days", value: fmtNum(sortedDates.length) },
    { label: "Daily Average", value: fmtNum(dailyAvg) + " msgs" },
    { label: "Conversations", value: fmtNum(totalConversations) },
    { label: "Longest Streak", value: maxStreak + " days" },
    {
      label: "Top Sender",
      value: topSender.name,
      sub: fmtNum(topSender.count) + " msgs",
    },
    {
      label: "Starts Most Chats",
      value: topStarter.name,
      sub: fmtNum(topStarter.count) + " times",
    },
    {
      label: "Busiest Day",
      value: busiestDay.date,
      sub: fmtNum(busiestDay.count) + " msgs",
    },
    { label: "Media & Links", value: fmtNum(totalMedia) },
    { label: "Voice Messages", value: fmtNum(totalVoiceMessages) },
    { label: "Stickers Sent", value: fmtNum(totalStickers) },
    { label: "Custom Emojis", value: fmtNum(totalEmojis) },
    { label: "Date Range", value: firstDate, sub: "to " + lastDate },
  ];

  const statsGrid = document.getElementById("stats-overview");
  statsGrid.innerHTML = statsData
    .map(
      (s) =>
        `<div class="stat-card">
                    <div class="label">${s.label}</div>
                    <div class="value" title="${s.value}">${s.value}</div>
                    ${s.sub ? `<div class="sub">${s.sub}</div>` : ""}
                </div>`,
    )
    .join("");

  // ── Store state and render table ──
  lastAuthorStats = authorStats;
  lastTotalProcessedMsgs = totalProcessedMsgs;
  lastMaxMsgs = topSender.count;
  renderTable();

  initCollapsibles();

  // ── Render Charts (use top 6 for doughnut/bar charts) ──
  renderPieChart(topAuthorStats, "pieChart", "msgs");
  renderPieChart(topAuthorStats, "startersChart", "starters");
  renderPieChart(topAuthorStats, "mediaChart", "media");
  renderMsgLengthChart(topAuthorStats);
  renderResponseTimeChart(topAuthorStats);
  renderDoubleTextChart(topAuthorStats);
  renderTimePeriodChart(timePeriodCounts);
  renderWordsChart(wordCounts);
  renderTimelineChart(dateCounts);
  renderCumulativeChart(dateCounts);
  renderDayOfWeekChart(dayOfWeekCounts);
  renderTimeOfDayChart(hourCounts);
  renderEmojiChart(customEmojiCounts);
  renderHeatmap(heatmapData);

  // ── Reaction Analytics ──
  if (totalReactions > 0) {
    document.getElementById("reactions-section").classList.remove("hidden");

    const topReactor = Object.entries(userReactionsReceived).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const reactionStats = [
      { label: "Total Reactions", value: fmtNum(totalReactions) },
      { label: "Reacted Messages", value: fmtNum(totalReactedMessages) },
      {
        label: "Unique Reactions",
        value: fmtNum(Object.keys(reactionCounts).length),
      },
      {
        label: "Most Reacted User",
        value: topReactor ? topReactor[0] : "—",
        sub: topReactor ? fmtNum(topReactor[1]) + " reactions" : "",
      },
    ];

    document.getElementById("stats-reactions").innerHTML = reactionStats
      .map(
        (s) =>
          `<div class="stat-card">
                        <div class="label">${s.label}</div>
                        <div class="value" title="${s.value}">${s.value}</div>
                        ${s.sub ? `<div class="sub">${s.sub}</div>` : ""}
                    </div>`,
      )
      .join("");

    // Most reacted message
    if (mostReactedMsg) {
      const msgEl = document.getElementById("most-reacted-msg");
      const msgPreview = mostReactedMsg.content || "[attachment/embed]";
      msgEl.innerHTML = `
                        <div class="rh-title">Most Reacted Message (${mostReactedMsg.count} reactions)</div>
                        <div class="rh-content">
                            <span class="rh-author">${mostReactedMsg.author}:</span>
                            ${msgPreview}
                            <div class="rh-reactions">${mostReactedMsg.reactions}</div>
                        </div>`;
    }

    renderTopReactionsChart(reactionCounts);
    renderReactedUsersChart(userReactionsReceived);
  } else {
    document.getElementById("reactions-section").classList.add("hidden");
  }

  // ── Call Analytics ──
  if (totalCalls > 0) {
    document.getElementById("calls-section").classList.remove("hidden");

    const allMins = allCallDurations.map((c) => c.mins);
    const longestCall = Math.max(...allMins);
    const shortestCall = Math.min(...allMins);
    const avgCallDur = (totalCallMinutes / totalCalls).toFixed(1);
    let topCaller = { name: "—", count: 0 };
    Object.entries(authorStats).forEach(([name, s]) => {
      if (s.calls > topCaller.count) topCaller = { name, count: s.calls };
    });

    const callStats = [
      { label: "Total Calls", value: fmtNum(totalCalls) },
      { label: "Total Call Time", value: fmtDuration(totalCallMinutes) },
      {
        label: "Average Call",
        value: fmtDuration(Math.round(parseFloat(avgCallDur))),
      },
      { label: "Longest Call", value: fmtDuration(longestCall) },
      { label: "Shortest Call", value: fmtDuration(shortestCall) },
      {
        label: "Most Active Caller",
        value: topCaller.name,
        sub: fmtNum(topCaller.count) + " calls",
      },
    ];

    document.getElementById("stats-calls").innerHTML = callStats
      .map(
        (s) =>
          `<div class="stat-card">
                        <div class="label">${s.label}</div>
                        <div class="value" title="${s.value}">${s.value}</div>
                        ${s.sub ? `<div class="sub">${s.sub}</div>` : ""}
                    </div>`,
      )
      .join("");

    renderPieChart(topAuthorStats, "callInitiatorChart", "calls");
    renderCallDurationDistChart(allMins);
    renderCallTimelineChart(allCallDurations);
    renderCallDayOfWeekChart(callDayOfWeekCounts);
  }
}

function renderTable() {
  if (!lastAuthorStats) return;
  const tbody = document.getElementById("user-table-body");

  const sortedEntries = Object.entries(lastAuthorStats).sort((a, b) => {
    const sA = a[1];
    const sB = b[1];
    let valA, valB;

    switch (sortCol) {
      case "name":
        valA = a[0].toLowerCase();
        valB = b[0].toLowerCase();
        break;
      case "msgs":
        valA = sA.msgs;
        valB = sB.msgs;
        break;
      case "share":
        valA = sA.msgs;
        valB = sB.msgs;
        break; // share correlates exactly with msgs
      case "words":
        valA = sA.wordCounts.length ? sA.totalWords / sA.wordCounts.length : 0;
        valB = sB.wordCounts.length ? sB.totalWords / sB.wordCounts.length : 0;
        break;
      case "resp":
        valA = sA.responseTimes.length
          ? sA.responseTimes.reduce((x, y) => x + y, 0) /
            sA.responseTimes.length
          : 999999;
        valB = sB.responseTimes.length
          ? sB.responseTimes.reduce((x, y) => x + y, 0) /
            sB.responseTimes.length
          : 999999;
        break;
      case "starts":
        valA = sA.starters;
        valB = sB.starters;
        break;
      case "media":
        valA = sA.media;
        valB = sB.media;
        break;
      case "emojis":
        valA = sA.emojis;
        valB = sB.emojis;
        break;
      case "calls":
        valA = sA.calls;
        valB = sB.calls;
        break;
      case "calltime":
        valA = sA.callMinutes;
        valB = sB.callMinutes;
        break;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = sortedEntries
    .map(([name, s]) => {
      const pct =
        lastTotalProcessedMsgs > 0
          ? ((s.msgs / lastTotalProcessedMsgs) * 100).toFixed(1)
          : "0";
      const avgWords =
        s.wordCounts.length > 0
          ? (s.totalWords / s.wordCounts.length).toFixed(1)
          : "0";
      const avgResp =
        s.responseTimes.length > 0
          ? (
              s.responseTimes.reduce((a, b) => a + b, 0) /
              s.responseTimes.length
            ).toFixed(1) + " min"
          : "—";
      const barW = lastMaxMsgs > 0 ? (s.msgs / lastMaxMsgs) * 100 : 0;
      const callTime = s.callMinutes > 0 ? fmtDuration(s.callMinutes) : "—";
      return `<tr>
                    <td class="user-name">${name}</td>
                    <td>${fmtNum(s.msgs)}</td>
                    <td class="bar-cell">
                        <span class="user-bar" style="width:${barW}%"></span>
                        <span style="font-size:0.72rem;color:var(--text-muted);margin-left:4px">${pct}%</span>
                    </td>
                    <td>${avgWords}</td>
                    <td>${avgResp}</td>
                    <td>${fmtNum(s.starters)}</td>
                    <td>${fmtNum(s.media)}</td>
                    <td>${fmtNum(s.emojis)}</td>
                    <td>${fmtNum(s.calls)}</td>
                    <td>${callTime}</td>
                </tr>`;
    })
    .join("");
}

function destroyChart(id) {
  if (charts[id]) charts[id].destroy();
}

/* ── Shared ── */
function barOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    },
    ...extra,
  };
}

/* ── Charts ── */
function renderPieChart(authorStats, canvasId, dataKey) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  const labels = Object.keys(authorStats).filter(
    (a) => authorStats[a][dataKey] > 0,
  );
  const data = labels.map((a) => authorStats[a][dataKey]);
  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: "#2b2d31",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: tickColor, padding: 12, font: { size: 11 } },
        },
      },
    },
  });
}

function renderDoubleTextChart(authorStats) {
  destroyChart("doubleTextChart");
  const ctx = document.getElementById("doubleTextChart").getContext("2d");
  const labels = Object.keys(authorStats).filter(
    (a) => authorStats[a].consecutiveStreaks.length > 0,
  );
  const data = labels.map((a) => {
    const arr = authorStats[a].consecutiveStreaks;
    return (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2);
  });
  charts["doubleTextChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avg consecutive",
          data,
          backgroundColor: palette[0],
          borderRadius: 3,
        },
      ],
    },
    options: barOpts(),
  });
}

function renderTimePeriodChart(timePeriodCounts) {
  destroyChart("timePeriodChart");
  const ctx = document.getElementById("timePeriodChart").getContext("2d");
  const labels = [
    "Night (12–6 AM)",
    "Morning (6 AM–12 PM)",
    "Afternoon (12–6 PM)",
    "Evening (6 PM–12 AM)",
  ];
  const data = [
    timePeriodCounts.night,
    timePeriodCounts.morning,
    timePeriodCounts.afternoon,
    timePeriodCounts.evening,
  ];
  charts["timePeriodChart"] = new Chart(ctx, {
    type: "polarArea",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: palette.slice(0, 4).map((c) => c + "aa"),
          borderColor: "#2b2d31",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: tickColor, font: { size: 11 }, padding: 10 },
        },
      },
      scales: { r: { ticks: { display: false }, grid: { color: gridColor } } },
    },
  });
}

function renderMsgLengthChart(authorStats) {
  destroyChart("msgLengthChart");
  const ctx = document.getElementById("msgLengthChart").getContext("2d");
  const labels = Object.keys(authorStats).filter(
    (a) => authorStats[a].msgs > 0,
  );
  const avgData = labels.map((a) => {
    const arr = authorStats[a].wordCounts;
    return arr.length
      ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)
      : 0;
  });
  const medianData = labels.map((a) => getMedian(authorStats[a].wordCounts));
  charts["msgLengthChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Average",
          data: avgData,
          backgroundColor: palette[0],
          borderRadius: 3,
        },
        {
          label: "Median",
          data: medianData,
          backgroundColor: palette[4],
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: tickColor, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: tickColor } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor } },
      },
    },
  });
}

function renderResponseTimeChart(authorStats) {
  destroyChart("responseTimeChart");
  const ctx = document.getElementById("responseTimeChart").getContext("2d");
  const labels = Object.keys(authorStats).filter(
    (a) => authorStats[a].responseTimes.length > 0,
  );
  const data = labels.map((a) => {
    const arr = authorStats[a].responseTimes;
    return arr.length
      ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)
      : 0;
  });
  charts["responseTimeChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Minutes",
          data,
          backgroundColor: palette[3],
          borderRadius: 3,
        },
      ],
    },
    options: barOpts(),
  });
}

function renderWordsChart(wordCounts) {
  destroyChart("wordsChart");
  const ctx = document.getElementById("wordsChart").getContext("2d");
  const sorted = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  charts["wordsChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((i) => i[0]),
      datasets: [
        {
          data: sorted.map((i) => i[1]),
          backgroundColor: palette[1],
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor } },
        y: {
          grid: { display: false },
          ticks: { color: "#f2f3f5", font: { weight: "600", size: 11 } },
        },
      },
    },
  });
}

function renderEmojiChart(emojiCounts) {
  destroyChart("emojiChart");
  const ctx = document.getElementById("emojiChart").getContext("2d");
  const sorted = Object.entries(emojiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  if (sorted.length === 0) {
    // Hide the chart card if no emojis
    ctx.canvas.parentElement.parentElement.style.display = "none";
    return;
  }
  charts["emojiChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((i) => ":" + i[0] + ":"),
      datasets: [
        {
          data: sorted.map((i) => i[1]),
          backgroundColor: palette[4],
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor } },
        y: {
          grid: { display: false },
          ticks: { color: "#f2f3f5", font: { weight: "600", size: 11 } },
        },
      },
    },
  });
}

function renderTimelineChart(dateCounts) {
  destroyChart("timelineChart");
  const ctx = document.getElementById("timelineChart").getContext("2d");
  const sorted = Object.keys(dateCounts).sort();
  const data = sorted.map((d) => dateCounts[d]);
  charts["timelineChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: sorted,
      datasets: [
        {
          label: "Messages",
          data,
          borderColor: palette[0],
          backgroundColor: "rgba(88,101,242,0.15)",
          borderWidth: 1.5,
          fill: true,
          tension: 0.3,
          pointRadius: data.length > 30 ? 0 : 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 10 },
        },
        y: { grid: { color: gridColor }, ticks: { color: tickColor } },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  });
}

function renderCumulativeChart(dateCounts) {
  destroyChart("cumulativeChart");
  const ctx = document.getElementById("cumulativeChart").getContext("2d");
  const sorted = Object.keys(dateCounts).sort();

  let total = 0;
  const data = sorted.map((d) => {
    total += dateCounts[d];
    return total;
  });

  charts["cumulativeChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels: sorted,
      datasets: [
        {
          label: "Total Messages",
          data,
          borderColor: palette[4],
          backgroundColor: "rgba(235,69,158,0.15)",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, callback: (v) => fmtNum(v) },
        },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  });
}

function renderDayOfWeekChart(dayOfWeekCounts) {
  destroyChart("dayOfWeekChart");
  const ctx = document.getElementById("dayOfWeekChart").getContext("2d");
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  charts["dayOfWeekChart"] = new Chart(ctx, {
    type: "radar",
    data: {
      labels,
      datasets: [
        {
          label: "Messages",
          data: dayOfWeekCounts,
          backgroundColor: "rgba(88,101,242,0.25)",
          borderColor: palette[0],
          pointBackgroundColor: palette[4],
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          angleLines: { color: gridColor },
          grid: { color: gridColor },
          pointLabels: { color: "#f2f3f5", font: { size: 12 } },
          ticks: { display: false },
        },
      },
    },
  });
}

function renderTimeOfDayChart(hourCounts) {
  destroyChart("timeOfDayChart");
  const ctx = document.getElementById("timeOfDayChart").getContext("2d");
  const labels = [
    "12a",
    "1a",
    "2a",
    "3a",
    "4a",
    "5a",
    "6a",
    "7a",
    "8a",
    "9a",
    "10a",
    "11a",
    "12p",
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7p",
    "8p",
    "9p",
    "10p",
    "11p",
  ];
  charts["timeOfDayChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Messages",
          data: hourCounts,
          backgroundColor: palette[5],
          borderRadius: 2,
        },
      ],
    },
    options: barOpts({
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 12 },
        },
        y: { grid: { color: gridColor }, ticks: { color: tickColor } },
      },
    }),
  });
}

function renderCallDurationDistChart(allMins) {
  destroyChart("callDurationDistChart");
  const ctx = document.getElementById("callDurationDistChart").getContext("2d");
  // Bucket calls into duration ranges
  const buckets = {
    "< 5m": 0,
    "5–15m": 0,
    "15–30m": 0,
    "30m–1h": 0,
    "1–2h": 0,
    "2–4h": 0,
    "4h+": 0,
  };
  allMins.forEach((m) => {
    if (m < 5) buckets["< 5m"]++;
    else if (m < 15) buckets["5–15m"]++;
    else if (m < 30) buckets["15–30m"]++;
    else if (m < 60) buckets["30m–1h"]++;
    else if (m < 120) buckets["1–2h"]++;
    else if (m < 240) buckets["2–4h"]++;
    else buckets["4h+"]++;
  });
  const labels = Object.keys(buckets);
  const data = Object.values(buckets);
  charts["callDurationDistChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Calls", data, backgroundColor: palette[1], borderRadius: 3 },
      ],
    },
    options: barOpts(),
  });
}

function renderCallTimelineChart(allCallDurations) {
  destroyChart("callTimelineChart");
  const ctx = document.getElementById("callTimelineChart").getContext("2d");
  const labels = allCallDurations.map(
    (c) => c.date.toISOString().split("T")[0],
  );
  const data = allCallDurations.map((c) => c.mins);
  const pointSizes = data.map((m) => Math.max(3, Math.min(12, m / 20)));
  charts["callTimelineChart"] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Duration (min)",
          data,
          borderColor: palette[4],
          backgroundColor: "rgba(235,69,158,0.15)",
          borderWidth: 1.5,
          fill: true,
          tension: 0.2,
          pointRadius: pointSizes,
          pointBackgroundColor: palette[4],
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const c = allCallDurations[ctx.dataIndex];
              return c.author + ": " + fmtDuration(c.mins);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, maxTicksLimit: 10 },
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: tickColor, callback: (v) => fmtDuration(v) },
          title: {
            display: true,
            text: "Duration",
            color: tickColor,
            font: { size: 11 },
          },
        },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  });
}

function renderCallDayOfWeekChart(callDayOfWeekCounts) {
  destroyChart("callDayOfWeekChart");
  const ctx = document.getElementById("callDayOfWeekChart").getContext("2d");
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  charts["callDayOfWeekChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Calls",
          data: callDayOfWeekCounts,
          backgroundColor: palette[0],
          borderRadius: 3,
        },
      ],
    },
    options: barOpts(),
  });
}
function renderHeatmap(heatmapData) {
  const grid = document.getElementById("heatmap-grid");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = [
    "12a",
    "1a",
    "2a",
    "3a",
    "4a",
    "5a",
    "6a",
    "7a",
    "8a",
    "9a",
    "10a",
    "11a",
    "12p",
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7p",
    "8p",
    "9p",
    "10p",
    "11p",
  ];

  // Find max for color scaling
  let maxVal = 0;
  heatmapData.forEach((row) =>
    row.forEach((v) => {
      if (v > maxVal) maxVal = v;
    }),
  );
  if (maxVal === 0) maxVal = 1;

  let html = '<div class="hm-label"></div>';
  hours.forEach((h) => {
    html += `<div class="hm-hour">${h}</div>`;
  });

  days.forEach((day, di) => {
    html += `<div class="hm-label">${day}</div>`;
    for (let h = 0; h < 24; h++) {
      const val = heatmapData[di][h];
      const intensity = val / maxVal;
      const bg =
        val === 0
          ? "var(--grid-empty)"
          : `rgba(88,101,242,${0.15 + intensity * 0.85})`;
      html += `<div class="hm-cell" style="background:${bg}" title="${day} ${hours[h]}: ${fmtNum(val)} messages"></div>`;
    }
  });

  grid.innerHTML = html;

  // Legend
  const legend = document.getElementById("heatmap-legend");
  const steps = [0, 0.25, 0.5, 0.75, 1];
  legend.innerHTML =
    "Less " +
    steps
      .map((s) => {
        const bg =
          s === 0 ? "var(--grid-empty)" : `rgba(88,101,242,${0.15 + s * 0.85})`;
        return `<span class="hm-swatch" style="background:${bg}"></span>`;
      })
      .join("") +
    " More";
}

function renderTopReactionsChart(reactionCounts) {
  destroyChart("topReactionsChart");
  const ctx = document.getElementById("topReactionsChart").getContext("2d");
  const sorted = Object.entries(reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  charts["topReactionsChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((i) => i[0]),
      datasets: [
        {
          data: sorted.map((i) => i[1]),
          backgroundColor: palette[3],
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor } },
        y: {
          grid: { display: false },
          ticks: { color: "#f2f3f5", font: { weight: "600", size: 11 } },
        },
      },
    },
  });
}

function renderReactedUsersChart(userReactionsReceived) {
  destroyChart("reactedUsersChart");
  const ctx = document.getElementById("reactedUsersChart").getContext("2d");
  const sorted = Object.entries(userReactionsReceived)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  charts["reactedUsersChart"] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((i) => i[0]),
      datasets: [
        {
          data: sorted.map((i) => i[1]),
          backgroundColor: palette[4],
          borderRadius: 3,
        },
      ],
    },
    options: barOpts(),
  });
}

/* ── Export Dashboard ── */
async function exportDashboard() {
  const btn = document.getElementById("export-btn");
  const originalText = btn.textContent;
  btn.textContent = "Exporting...";
  btn.style.opacity = "0.7";
  btn.disabled = true;

  try {
    const dashboard = document.getElementById("dashboard");
    const canvas = await html2canvas(dashboard, {
      backgroundColor:
        getComputedStyle(document.body)
          .getPropertyValue("--bg-primary")
          .trim() || "#313338",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement("a");
    link.download = `Discord_Chat_Analysis_${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Export failed:", err);
    alert("Failed to export dashboard as PNG.");
  } finally {
    btn.textContent = originalText;
    btn.style.opacity = "1";
    btn.disabled = false;
  }
}
