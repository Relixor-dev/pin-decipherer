let current = "";
let pinLength = 4;
let maxAttempts = 8;
let selectedDifficulty = "normal";
let selectedMaxAttempts = 8;
let selectedTimerSeconds = 0;

let mutNoRepeat = false;
let mutTimeDrain = false;
let mutVirusJam = false;
let jammedDigit = null;

let gameMode = "standard";
let heistStage = 1;
let customPin = "";
let customNote = "";
let customClues = 2;
let dailyDateStr = "";
let dailySolvesCount = 0;
let guessHistory = [];
let slotPins = [];

let timerInterval = null;
let timeRemaining = 0;
let speedrunElapsed = 0;
let speedrunTimerInterval = null;

let duelRoomId = null;
let duelRole = "host";
let duelPollInterval = null;
let matchmakeInterval = null;
let duelRound = 1;
let selectedDuelLength = 4;
let selectedDuelTimer = 0;
let duelTimerLimit = 0;
let explorerModesCleared = JSON.parse(localStorage.getItem("pinDeciphererExplorer") || "[]");


let gameOver = false;
let isSubmitting = false;
let decryptUsed = false;
let soundEnabled = true;
let digitStates = {};

let winStreak = parseInt(localStorage.getItem("pinCrackerStreak") || "0", 10);
let bestStreak = parseInt(localStorage.getItem("pinCrackerBest") || "0", 10);
let totalCracked = parseInt(localStorage.getItem("pinCrackerTotal") || "0", 10);
let totalXP = parseInt(localStorage.getItem("pinCrackerXP") || "0", 10);
let maxDiffCleared = localStorage.getItem("pinCrackerMaxDiff") || "4-DIGIT";
let bestDailySpeed = parseFloat(localStorage.getItem("pinCrackerBestSpeed") || "0");
let activeTheme = localStorage.getItem("pinCrackerTheme") || "cyan";
let agentHandle = localStorage.getItem("pinCrackerHandle") || "";
let unlockedBadges = JSON.parse(localStorage.getItem("pinCrackerBadges") || "[]");

const RANKS = [
    { minXP: 0, title: "SCRIPT KIDDIE" },
    { minXP: 120, title: "PACKET SNIFFER" },
    { minXP: 300, title: "CIPHER SCOUT" },
    { minXP: 600, title: "FIREWALL BREAKER" },
    { minXP: 1050, title: "GRID INFILTRATOR" },
    { minXP: 1700, title: "SHADOW OPERATIVE" },
    { minXP: 2600, title: "VAULT PHANTOM" },
    { minXP: 3800, title: "SYSTEM ARCHITECT" },
    { minXP: 5500, title: "GHOST ROOT" },
    { minXP: 8000, title: "ZERO-DAY SOVEREIGN" }
];

const THEMES = [
    { id: "cyan", name: "CLASSIC CYAN", reqXP: 0, className: "" },
    { id: "emerald", name: "MATRIX EMERALD", reqXP: 600, className: "theme-emerald" },
    { id: "amber", name: "AMBER CRT", reqXP: 1700, className: "theme-amber" },
    { id: "crimson", name: "CRIMSON OVERDRIVE", reqXP: 5500, className: "theme-crimson" }
];

const BADGES = [
    { id: "first_blood", name: "FIRST BREACH", desc: "Crack your first vault" },
    { id: "one_shot", name: "FIRST TRY LUCK", desc: "Crack a 4+ digit PIN on Attempt #1" },
    { id: "clutch", name: "CLUTCH SPECIALIST", desc: "Win with under 2.0s remaining" },
    { id: "streak_5", name: "UNTOUCHABLE", desc: "Reach a 5-win streak" },
    { id: "extreme_6", name: "6-DIGIT MASTER", desc: "Crack a 6-digit vault" },
    { id: "virus_clear", name: "ANTIVIRUS", desc: "Win with Virus Jam enabled" },
    { id: "duelist", name: "DUELIST", desc: "Win your first Live 1v1 Duel" },
    { id: "speed_demon", name: "SPEED DEMON", desc: "Finish Daily Speedrun in under 15.0s" },
    { id: "heist_master", name: "HEIST MASTERMIND", desc: "Clear all 3 stages of Heist Ladder" },
    { id: "centurion", name: "CENTURION", desc: "Crack 100 total vaults" },
    { id: "explorer", name: "EXPLORER", desc: "Complete Daily Vault, Daily Speedrun, Heist Ladder, and win a 1v1 Duel" }
];

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function playTone(freq, duration, type, volume) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(volume || 0.065, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.01);
        osc.onended = function() { osc.disconnect(); gain.disconnect(); };
    } catch (e) {}
}

function playHover() { if (!gameOver) playTone(920, 0.022, "sine", 0.018); }
function playWinSound() {
    playTone(523.25, 0.12, "triangle", 0.08);
    setTimeout(function() { playTone(659.25, 0.12, "triangle", 0.08); }, 110);
    setTimeout(function() { playTone(783.99, 0.25, "triangle", 0.08); }, 220);
}
function playLoseSound() {
    playTone(220, 0.2, "sawtooth", 0.07);
    setTimeout(function() { playTone(165, 0.35, "sawtooth", 0.07); }, 180);
}

function getRankTitle(xp) {
    let currentTitle = RANKS.slice(0, 1).pop().title;
    RANKS.forEach(function(r) { if (xp >= r.minXP) currentTitle = r.title; });
    return currentTitle;
}

function applySavedTheme() {
    document.body.classList.remove("theme-emerald", "theme-amber", "theme-crimson");
    const found = THEMES.find(function(t) { return t.id === activeTheme; });
    if (found && found.className && totalXP >= found.reqXP) {
        document.body.classList.add(found.className);
    }
}

function triggerCalcEffect(className) {
    const card = document.getElementById("calculator-card");
    if (!card) return;
    card.classList.remove("shake-alarm", "pulse-win");
    void card.offsetWidth;
    card.classList.add(className);
}

async function pollQueueStatus() {
    const startScreen = document.getElementById("start-screen");
    const btn = document.getElementById("live-duel-btn");
    if (!btn || (startScreen && startScreen.classList.contains("hidden"))) return;
    try {
        const res = await fetch("/duel/status");
        const data = await res.json();
        if (data.in_queue > 0) {
            btn.innerHTML = 'LIVE 1V1 DUEL<span class="btn-sub">(1 IN QUEUE)</span>';
            btn.classList.add("has-queue");
        } else {
            btn.innerText = "LIVE 1V1 DUEL";
            btn.classList.remove("has-queue");
        }
    } catch (e) {}
}

function stopMatchmaking() {
    if (matchmakeInterval) { clearInterval(matchmakeInterval); matchmakeInterval = null; }
    const btn = document.getElementById("matchmake-btn");
    const privateBtn = document.getElementById("private-duel-btn");
    const box = document.getElementById("duel-queue-status");
    const input = document.getElementById("duel-handle-input");
    if (input) input.disabled = false;
    if (btn) { btn.innerText = "FIND ONLINE MATCH (4D)"; btn.disabled = false; }
    if (privateBtn) privateBtn.disabled = false;
    if (box) box.classList.add("hidden");
    if (agentHandle) {
        fetch("/duel/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: agentHandle })
        });
    }
}

async function createPrivateDuelLink() {
    if (matchmakeInterval) stopMatchmaking();
    const name = getDuelCodename();
    const res = await fetch("/duel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            length: selectedDuelLength,
            timer: selectedDuelTimer
        })
    });
    const data = await res.json();
    const roomId = data.room_id;
    const url = window.location.origin + "/?duel=" + roomId;
    navigator.clipboard.writeText(url);
    playTone(740, 0.1, "triangle", 0.07);

    const btn = document.getElementById("matchmake-btn");
    const privateBtn = document.getElementById("private-duel-btn");
    const box = document.getElementById("duel-queue-status");
    const input = document.getElementById("duel-handle-input");

    if (input) input.disabled = true;
    if (btn) btn.innerText = "CANCEL PRIVATE LOBBY";
    if (privateBtn) privateBtn.disabled = true;
    box.classList.remove("hidden");
    box.innerText = "Link copied! Waiting in lobby [" + roomId + "] for friend to join...";

    let lobbyLocked = false;
    matchmakeInterval = setInterval(async function() {
        if (lobbyLocked) return;
        const syncRes = await fetch("/duel/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: roomId, role: "host", attempts: 0, won: false, elapsed: 0 })
        });
        const syncData = await syncRes.json();
        if (!lobbyLocked && syncData.ready) {
            lobbyLocked = true;
            clearInterval(matchmakeInterval);
            matchmakeInterval = null;
            if (input) input.disabled = false;
            if (btn) btn.innerText = "FIND ONLINE MATCH (4D)";
            if (privateBtn) privateBtn.disabled = false;
            box.classList.add("hidden");
            document.getElementById("duel-modal").classList.add("hidden");
            await joinDuelRoom(roomId);
        }
    }, 1500);
}

function buildDuelRematchButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reset-btn";
    btn.innerText = "REMATCH";
    btn.onclick = requestDuelRematch;
    return btn;
}

async function createPrivateDuelLink() {
    if (matchmakeInterval) stopMatchmaking();
    const name = getDuelCodename();
    const res = await fetch("/duel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            length: selectedDuelLength,
            timer: selectedDuelTimer
        })
    });
    const data = await res.json();
    const url = window.location.origin + "/?duel=" + data.room_id;
    navigator.clipboard.writeText(url);
    playTone(740, 0.1, "triangle", 0.07);
    document.getElementById("duel-modal").classList.add("hidden");
    await joinDuelRoom(data.room_id);
}

async function requestDuelRematch() {
    if (!duelRoomId) return;
    const res = await fetch("/duel/rematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: duelRoomId })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); backToMenu(); return; }
    startDuelRoundUI(data.round, data.hints);
}

function startDuelRoundUI(roundNum, hints) {
    duelRound = roundNum;
    guessHistory = [];
    gameOver = false;
    current = "";
    document.getElementById("log").innerHTML = "";

    const hintsList = document.getElementById("hints-list");
    hintsList.innerHTML = "";
    hints.forEach(function(h) {
        const li = document.createElement("li");
        li.innerText = h;
        hintsList.appendChild(li);
    });

    setKeypadDisabled(false);
    setLockStatus("DUEL R" + duelRound, "status-locked");
    resetDigitMatrix();
    buildSlotPins();
    updateScreen();
    updateAttemptsDisplay(0, 0);
    startSpeedrunStopwatch();
    startDuelPolling();
}

window.addEventListener("DOMContentLoaded", function() {
    const screenEl = document.getElementById("screen");
    pinLength = parseInt(screenEl.dataset.length, 10) || 4;
    const solvesEl = document.getElementById("stat-daily-solves");
    if (solvesEl) dailySolvesCount = parseInt(solvesEl.innerText || "0", 10);

    pollQueueStatus();
    setInterval(pollQueueStatus, 6000);

    applySavedTheme();
    buildDigitMatrix();
    buildSlotPins();
    updateStatsDisplay();
    updateScreen();

    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get("v");
    if (sharedCode) {
        try {
            const decoded = JSON.parse(atob(sharedCode));
            if (decoded.pin && decoded.pin.length >= 3 && decoded.pin.length <= 6) {
                customPin = decoded.pin;
                customNote = decoded.note || "";
                customClues = (decoded.clues !== undefined) ? parseInt(decoded.clues, 10) : 2;
                startGame("custom");
            }
        } catch (err) {}
    }

    const duelCode = params.get("duel");
    if (duelCode) {
        joinDuelRoom(duelCode);
    }
});

function buildDigitMatrix() {
    const grid = document.getElementById("digit-matrix");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i <= 9; i++) {
        const cell = document.createElement("div");
        cell.className = "matrix-cell";
        cell.id = "matrix-digit-" + i;
        cell.innerText = String(i);
        grid.appendChild(cell);
    }
}

function resetDigitMatrix() {
    digitStates = {};
    for (let i = 0; i <= 9; i++) {
        const cell = document.getElementById("matrix-digit-" + i);
        if (cell) cell.className = "matrix-cell";
    }
}

function updateDigitMatrix(guess, statuses) {
    const priority = { absent: 1, present: 2, correct: 3 };
    guess.split("").forEach(function(digit, idx) {
        const status = statuses[idx];
        const prev = digitStates[digit];
        if (!prev || priority[status] > priority[prev]) {
            digitStates[digit] = status;
            const cell = document.getElementById("matrix-digit-" + digit);
            if (cell) cell.className = "matrix-cell " + status;
        }
    });
}
function buildSlotPins() {
    const row = document.getElementById("slot-pins-row");
    if (!row) return;
    row.innerHTML = "";
    slotPins = new Array(pinLength).fill("");
    for (let i = 0; i < pinLength; i++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "scratch-slot";
        btn.innerText = "?";
        btn.title = "Click to pin suspected digit for Slot #" + (i + 1);
        btn.onclick = function() {
            playTone(700, 0.03, "sine", 0.04);
            if (slotPins[i] === "") slotPins[i] = "0";
            else if (slotPins[i] === "9") slotPins[i] = "";
            else slotPins[i] = String(parseInt(slotPins[i], 10) + 1);
            btn.innerText = slotPins[i] === "" ? "?" : slotPins[i];
            btn.classList.toggle("pinned", slotPins[i] !== "");
        };
        row.appendChild(btn);
    }
}

function clearVirusJam() {
    if (jammedDigit !== null) {
        const oldBtn = document.getElementById("key-btn-" + jammedDigit);
        if (oldBtn) {
            oldBtn.classList.remove("virus-jammed");
            oldBtn.disabled = gameOver;
        }
        jammedDigit = null;
    }
}

function applyVirusJam() {
    clearVirusJam();
    if (!mutVirusJam || gameOver) return;
    const randDigit = Math.floor(Math.random() * 10);
    jammedDigit = randDigit;
    const btn = document.getElementById("key-btn-" + randDigit);
    if (btn) {
        btn.classList.add("virus-jammed");
        btn.disabled = true;
    }
}

function toggleMutator(name, btnEl) {
    playTone(640, 0.05, "triangle", 0.06);
    if (name === "noRepeat") {
        mutNoRepeat = !mutNoRepeat;
        btnEl.classList.toggle("active", mutNoRepeat);
    } else if (name === "timeDrain") {
        mutTimeDrain = !mutTimeDrain;
        btnEl.classList.toggle("active", mutTimeDrain);
    } else if (name === "virusJam") {
        mutVirusJam = !mutVirusJam;
        btnEl.classList.toggle("active", mutVirusJam);
    }
}

function selectOption(groupName, val, btnEl) {
    playTone(580, 0.05, "sine", 0.06);
    
    const map = {
        difficulty: "difficulty-group",
        attempts: "attempts-group",
        timer: "timer-group",
        customClues: "custom-clues-group",
        duelLength: "duel-length-group",
        duelTimer: "duel-timer-group"
    };

    const containerId = map[groupName];
    document.querySelectorAll("#" + containerId + " .seg-btn").forEach(function(b) {
        b.classList.remove("active");
    });
    btnEl.classList.add("active");

    if (groupName === "difficulty") selectedDifficulty = val;
    else if (groupName === "attempts") selectedMaxAttempts = parseInt(val, 10);
    else if (groupName === "timer") selectedTimerSeconds = parseInt(val, 10);
    else if (groupName === "customClues") customClues = parseInt(val, 10);
    else if (groupName === "duelLength") selectedDuelLength = parseInt(val, 10);
    else if (groupName === "duelTimer") selectedDuelTimer = parseInt(val, 10);

}

function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (speedrunTimerInterval) { clearInterval(speedrunTimerInterval); speedrunTimerInterval = null; }
}

function startSpeedrunStopwatch() {
    stopTimer();
    const badge = document.getElementById("timer-badge");
    speedrunElapsed = 0;
    badge.classList.remove("hidden", "urgent");
    badge.innerText = "0.0s";
    speedrunTimerInterval = setInterval(function() {
        if (gameOver) { stopTimer(); return; }
        speedrunElapsed += 0.1;
        badge.innerText = speedrunElapsed.toFixed(1) + "s";
    }, 100);
}

function startCountdown(seconds) {
    stopTimer();
    const badge = document.getElementById("timer-badge");
    if (!seconds || seconds <= 0) {
        badge.classList.add("hidden");
        return;
    }

    timeRemaining = seconds * 10;
    badge.classList.remove("hidden", "urgent");
    badge.innerText = seconds.toFixed(1) + "s";

    timerInterval = setInterval(async function() {
        if (gameOver) { stopTimer(); return; }
        timeRemaining -= 1;
        const secs = Math.max(0, timeRemaining / 10);
        badge.innerText = secs.toFixed(1) + "s";

        if (secs <= 5.0) {
            badge.classList.add("urgent");
            if (timeRemaining % 10 === 0 && timeRemaining > 0) playTone(880, 0.04, "sine", 0.04);
        }

        if (timeRemaining <= 0) {
            stopTimer();
            await handleTimeExpired();
        }
    }, 100);
}

async function handleTimeExpired() {
    if (gameOver) return;
    gameOver = true;
    clearVirusJam();
    setKeypadDisabled(true);
    setLockStatus("TIME EXPIRED", "danger");
    triggerCalcEffect("shake-alarm");

    winStreak = 0;
    localStorage.setItem("pinCrackerStreak", "0");
    updateStatsDisplay();
    playLoseSound();

    const res = await fetch("/timeout", { method: "POST" });
    const data = await res.json();

    const screen = document.getElementById("screen");
    screen.classList.add("locked");
    screen.innerText = "CODE: " + data.secret;

    const log = document.getElementById("log");
    const entry = document.createElement("div");
    entry.className = "log-entry lose";
    const statusText = document.createElement("span");
    statusText.innerText = "TIME EXPIRED // LOCKED OUT";
    entry.appendChild(statusText);

    const timeoutActions = document.createElement("div");
    timeoutActions.className = "action-group";
    timeoutActions.appendChild(buildResetButton("RETRY", gameMode === "heist" ? 1 : null));
    timeoutActions.appendChild(buildMenuButton());
    entry.appendChild(timeoutActions);
    log.prepend(entry);
}
function openMyProfile() {
    playTone(620, 0.06, "sine", 0.06);
    renderProfileModal({
        name: agentHandle || "ANON_AGENT",
        xp: totalXP,
        cracked: totalCracked,
        bestStreak: bestStreak,
        maxDiff: maxDiffCleared,
        fastDaily: bestDailySpeed > 0 ? (bestDailySpeed.toFixed(1) + "s") : "--",
        isSelf: true
    });
    document.getElementById("profile-modal").classList.remove("hidden");
}

async function openAgentProfile(handle) {
    playTone(620, 0.06, "sine", 0.06);
    if (agentHandle && handle === agentHandle) {
        openMyProfile();
        return;
    }
    try {
        const res = await fetch("/profile/" + encodeURIComponent(handle));
        const data = await res.json();
        const p = data.profile || {};
        renderProfileModal({
            name: data.name || handle,
            xp: p.xp || 0,
            cracked: p.cracked || 0,
            bestStreak: p.bestStreak || 0,
            maxDiff: p.maxDiff || "4-DIGIT",
            fastDaily: p.fastDaily || "--",
            isSelf: false
        });
        document.getElementById("profile-modal").classList.remove("hidden");
    } catch (e) {}
}

function closeProfileModal() {
    document.getElementById("profile-modal").classList.add("hidden");
}

function renderProfileModal(info) {
    document.getElementById("prof-name").innerText = info.name;
    document.getElementById("prof-rank").innerText = getRankTitle(info.xp);
    document.getElementById("prof-xp").innerText = info.xp + " XP";
    document.getElementById("prof-cracked").innerText = String(info.cracked);
    document.getElementById("prof-best").innerText = String(info.bestStreak);
    document.getElementById("prof-maxdiff").innerText = info.maxDiff;
    document.getElementById("prof-fast").innerText = info.fastDaily;

    const unlocksArea = document.getElementById("prof-unlocks-area");
    unlocksArea.style.display = info.isSelf ? "block" : "none";
    if (!info.isSelf) return;

    const themeGrid = document.getElementById("theme-grid");
    themeGrid.innerHTML = "";
    THEMES.forEach(function(t) {
        const unlocked = totalXP >= t.reqXP;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "theme-btn" + (unlocked ? " unlocked" : "") + (activeTheme === t.id ? " active" : "");
        btn.innerText = unlocked ? ("✓ " + t.name) : ("🔒 " + t.name + " (" + t.reqXP + " XP)");
        if (unlocked) {
            btn.onclick = function() {
                activeTheme = t.id;
                localStorage.setItem("pinCrackerTheme", t.id);
                applySavedTheme();
                renderProfileModal(info);
            };
        }
        themeGrid.appendChild(btn);
    });

    const badgesGrid = document.getElementById("badges-grid");
    badgesGrid.innerHTML = "";
    BADGES.forEach(function(b) {
        const earned = unlockedBadges.includes(b.id);
        const chip = document.createElement("div");
        chip.className = "badge-chip" + (earned ? " earned" : "");
        chip.title = b.desc;
        chip.innerText = (earned ? "★ " : "☆ ") + b.name;
        badgesGrid.appendChild(chip);
    });
}

function openRanksModal() {
    playTone(620, 0.06, "sine", 0.06);
    const list = document.getElementById("ranks-list");
    const progressText = document.getElementById("rank-progress-text");
    const barFill = document.getElementById("xp-bar-fill");
    const currentTitle = getRankTitle(totalXP);
    let nextRank = null;
    let currentFloor = 0;

    RANKS.forEach(function(r) {
        if (totalXP >= r.minXP) currentFloor = r.minXP;
        else if (!nextRank) nextRank = r;
    });

    if (nextRank) {
        const span = nextRank.minXP - currentFloor;
        const pct = Math.min(100, Math.round(((totalXP - currentFloor) / span) * 100));
        progressText.innerText = totalXP + " XP // " + (nextRank.minXP - totalXP) + " XP TO " + nextRank.title;
        barFill.style.width = pct + "%";
    } else {
        progressText.innerText = totalXP + " XP // MAX CLEARANCE REACHED";
        barFill.style.width = "100%";
    }

    list.innerHTML = "";
    RANKS.forEach(function(r) {
        const row = document.createElement("div");
        const isCurrent = (r.title === currentTitle);
        const isUnlocked = (totalXP >= r.minXP);
        row.className = "rank-row" + (isCurrent ? " current" : (isUnlocked ? " unlocked" : ""));
        row.innerHTML = "<span>" + (isCurrent ? "▶ " : (isUnlocked ? "✓ " : "🔒 ")) + r.title + "</span><span>" + r.minXP + " XP</span>";
        list.appendChild(row);
    });
    document.getElementById("ranks-modal").classList.remove("hidden");
}

function closeRanksModal() { document.getElementById("ranks-modal").classList.add("hidden"); }

let currentLbTab = "xp";

async function openLeaderboard(tab) {
    currentLbTab = tab || "xp";
    playTone(640, 0.06, "sine", 0.06);
    const input = document.getElementById("agent-handle-input");
    if (input && agentHandle) input.value = agentHandle;
    document.getElementById("leaderboard-modal").classList.remove("hidden");
    await switchLeaderboardTab(currentLbTab);
}

function closeLeaderboard() { document.getElementById("leaderboard-modal").classList.add("hidden"); }

async function switchLeaderboardTab(tab) {
    currentLbTab = tab;
    document.getElementById("lb-tab-xp").classList.toggle("active", tab === "xp");
    document.getElementById("lb-tab-speed").classList.toggle("active", tab === "speed");
    document.getElementById("lb-xp-submit").style.display = (tab === "xp") ? "flex" : "none";
    document.getElementById("lb-desc-text").innerText = (tab === "xp")
        ? "Click any agent row to inspect their dossier."
        : "Fastest solves on today's Daily Speedrun Vault!";

    const list = document.getElementById("leaderboard-list");
    list.innerHTML = '<div class="rank-row"><span>Loading global telemetry...</span></div>';
    try {
        const url = (tab === "xp") ? "/leaderboard" : "/daily_speed_lb";
        const res = await fetch(url);
        const data = await res.json();
        renderLeaderboard(data.entries || [], tab);
    } catch (e) {
        list.innerHTML = '<div class="rank-row"><span>Telemetry offline. Try again in a moment.</span></div>';
    }
}

function buildProfilePayload() {
    return {
        xp: totalXP,
        cracked: totalCracked,
        bestStreak: bestStreak,
        maxDiff: maxDiffCleared,
        fastDaily: bestDailySpeed > 0 ? (bestDailySpeed.toFixed(1) + "s") : "--"
    };
}

async function postScoreToLeaderboard() {
    const input = document.getElementById("agent-handle-input");
    const raw = (input ? input.value.trim() : "") || "ANON_AGENT";
    agentHandle = raw.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase().slice(0, 14) || "ANON_AGENT";
    localStorage.setItem("pinCrackerHandle", agentHandle);
    if (input) input.value = agentHandle;

    playTone(760, 0.1, "triangle", 0.07);
    const res = await fetch("/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agentHandle, xp: totalXP, profile: buildProfilePayload() })
    });
    const data = await res.json();
    renderLeaderboard(data.entries || [], "xp");
}

function renderLeaderboard(entries, tab) {
    const list = document.getElementById("leaderboard-list");
    list.innerHTML = "";
    if (!entries.length) {
        list.innerHTML = '<div class="rank-row"><span>No entries yet. Be #1!</span></div>';
        return;
    }
    entries.forEach(function(item, idx) {
        const row = document.createElement("div");
        const isMe = (agentHandle && item.name === agentHandle);
        row.className = "rank-row clickable" + (isMe ? " current" : (idx === 0 ? " unlocked" : ""));
        row.onclick = function() { openAgentProfile(item.name); };
        const rightText = (tab === "xp") ? (item.xp + " XP") : (item.time.toFixed(1) + "s");
        row.innerHTML = '<span><span class="lb-rank-num">#' + (idx + 1) + '</span>' + item.name + '</span><strong>' + rightText + '</strong>';
        list.appendChild(row);
    });
}
function updateStatsDisplay() {
    const rankTitle = getRankTitle(totalXP);
    const startRank = document.getElementById("start-rank");
    const hudRank = document.getElementById("hud-rank");
    const statXP = document.getElementById("stat-xp");
    const startStreak = document.getElementById("start-streak");
    const gameStreak = document.getElementById("game-streak");
    const statBest = document.getElementById("stat-best");
    const statCracked = document.getElementById("stat-cracked");
    const statMode = document.getElementById("stat-mode");
    const statFirewall = document.getElementById("stat-firewall");
    const hudTitle = document.getElementById("hud-mode-title");
    const dailyBtn = document.getElementById("daily-start-btn");
    const dailySolvesEl = document.getElementById("stat-daily-solves");

    if (startRank) startRank.innerText = "RANK: " + rankTitle + " (" + totalXP + " XP) ▾";
    if (hudRank) hudRank.innerText = rankTitle;
    if (statXP) statXP.innerText = totalXP + " XP";
    if (startStreak) startStreak.innerText = "STREAK: " + winStreak;
    if (gameStreak) gameStreak.innerText = "STREAK " + winStreak;
    if (statBest) statBest.innerText = String(bestStreak);
    if (statCracked) statCracked.innerText = String(totalCracked);
    if (dailyBtn) dailyBtn.innerText = "DAILY VAULT (" + dailySolvesCount + " SOLVED)";
    if (dailySolvesEl) dailySolvesEl.innerText = String(dailySolvesCount);
    if (dailyBtn) dailyBtn.innerHTML = 'DAILY VAULT<span class="btn-sub">(' + dailySolvesCount + ' SOLVED)</span>';

    const fwTags = [];
    if (mutNoRepeat && gameMode !== "daily" && gameMode !== "daily_speed" && gameMode !== "custom") fwTags.push("NO-REP");
    if (mutTimeDrain && timerInterval !== null) fwTags.push("DRAIN");
    if (mutVirusJam) fwTags.push("VIRUS");
    if (statFirewall) statFirewall.innerText = fwTags.length ? fwTags.join("+") : "STANDARD";

    const modeLabels = {
        daily: "DAILY (" + pinLength + "-DIGIT)",
        daily_speed: "DAILY SPEEDRUN",
        heist: "HEIST STAGE " + heistStage + "/3",
        progressive: "PROGRESSIVE (" + pinLength + "D)",
        custom: "FRIEND VAULT",
        standard: pinLength + "-DIGIT"
    };
    if (statMode) statMode.innerText = modeLabels[gameMode] || (pinLength + "-DIGIT");
    if (hudTitle) hudTitle.innerText = gameMode === "heist" ? ("HEIST_STAGE_" + heistStage) : (gameMode.toUpperCase() + "_VAULT");
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById("sound-btn").innerText = soundEnabled ? "SFX: ON" : "SFX: OFF";
    if (soundEnabled) playTone(520, 0.08, "sine", 0.06);
}

function openRules() { document.getElementById("rules-modal").classList.remove("hidden"); }
function closeRules() { document.getElementById("rules-modal").classList.add("hidden"); }
function openCustomModal() { document.getElementById("custom-modal").classList.remove("hidden"); }
function closeCustomModal() { document.getElementById("custom-modal").classList.add("hidden"); }

function openDuelModal() {
    playTone(640, 0.06, "sine", 0.06);
    const input = document.getElementById("duel-handle-input");
    if (input && agentHandle) input.value = agentHandle;
    document.getElementById("duel-modal").classList.remove("hidden");
}

function closeDuelModal() {
    stopMatchmaking();
    document.getElementById("duel-modal").classList.add("hidden");
}

function getDuelCodename() {
    const input = document.getElementById("duel-handle-input");
    const raw = (input ? input.value.trim() : "") || agentHandle || "AGENT_" + Math.floor(100 + Math.random() * 899);
    agentHandle = raw.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase().slice(0, 14) || "ANON_AGENT";
    localStorage.setItem("pinCrackerHandle", agentHandle);
    if (input) input.value = agentHandle;
    return agentHandle;
}

function stopMatchmaking() {
    if (matchmakeInterval) { clearInterval(matchmakeInterval); matchmakeInterval = null; }
    const btn = document.getElementById("matchmake-btn");
    const box = document.getElementById("duel-queue-status");
    if (btn) btn.innerText = "FIND ONLINE MATCH";
    if (box) box.classList.add("hidden");
    if (agentHandle) {
        fetch("/duel/cancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: agentHandle })
        });
    }
}

async function toggleMatchmaking() {
    if (matchmakeInterval) { stopMatchmaking(); return; }
    const name = getDuelCodename();
    const btn = document.getElementById("matchmake-btn");
    const box = document.getElementById("duel-queue-status");
    btn.innerText = "CANCEL SEARCH";
    box.classList.remove("hidden");
    box.innerText = "Scanning global queue for online agents...";

    const pollQueue = async function() {
        const res = await fetch("/duel/matchmake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        const data = await res.json();
        if (data.status === "matched") {
            clearInterval(matchmakeInterval);
            matchmakeInterval = null;
            box.classList.add("hidden");
            btn.innerText = "FIND ONLINE MATCH";
            document.getElementById("duel-modal").classList.add("hidden");
            await joinDuelRoom(data.room_id);
            return true;
        }
        return false;
    };
    if (!await pollQueue()) matchmakeInterval = setInterval(pollQueue, 2000);
}

async function joinDuelRoom(roomId) {
    const name = agentHandle || ("AGENT_" + Math.floor(100 + Math.random() * 899));
    const res = await fetch("/duel/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: roomId, name: name })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    gameMode = "duel";
    duelRoomId = data.room_id;
    duelRole = data.role;
    duelRound = 1;
    pinLength = data.length || 4;
    duelTimerLimit = data.timer || 0;
    maxAttempts = 0;
    guessHistory = [];
    gameOver = false;
    current = "";

    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("duel-banner").classList.remove("hidden");
    document.getElementById("log").innerHTML = "";

    const isReady = Boolean(data.host && data.guest);
    const hintsList = document.getElementById("hints-list");
    hintsList.innerHTML = "";

    if (!isReady) {
        const li = document.createElement("li");
        li.innerText = "WAITING FOR TELEMETRY";
        hintsList.appendChild(li);
        setKeypadDisabled(true);
        setLockStatus("STANDBY", "status-locked");
        document.getElementById("duel-opp-label").innerText = "VS: WAITING FOR OPPONENT...";
        document.getElementById("duel-opp-stats").innerText = "STANDBY";
    } else {
        data.hints.forEach(function(h) {
            const li = document.createElement("li");
            li.innerText = h;
            hintsList.appendChild(li);
        });
        setKeypadDisabled(false);
        setLockStatus("DUEL LIVE", "status-locked");
        if (duelTimerLimit > 0) startCountdown(duelTimerLimit);
        else startSpeedrunStopwatch();
    }

    resetDigitMatrix();
    buildSlotPins();
    updateScreen();
    updateAttemptsDisplay(0, 0);
    updateStatsDisplay();
    startDuelPolling(!isReady);
}

function startDuelPolling(waitingForOpponent) {
    if (duelPollInterval) clearInterval(duelPollInterval);
    let wasWaiting = Boolean(waitingForOpponent);

    const syncOnce = async function() {
        if (gameMode !== "duel" || !duelRoomId) { clearInterval(duelPollInterval); return; }
        const res = await fetch("/duel/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                room_id: duelRoomId,
                role: duelRole,
                attempts: guessHistory.length,
                won: false,
                elapsed: speedrunElapsed
            })
        });
        const data = await res.json();
        if (data.error) return;

        if (data.round && data.round > duelRound) {
            await requestDuelRematch();
            return;
        }

        if (wasWaiting && data.ready) {
            wasWaiting = false;
            playTone(720, 0.14, "triangle", 0.08);
            const hintsList = document.getElementById("hints-list");
            hintsList.innerHTML = "";
            (data.hints || []).forEach(function(h) {
                const li = document.createElement("li");
                li.innerText = h;
                hintsList.appendChild(li);
            });
            setKeypadDisabled(false);
            setLockStatus("DUEL LIVE", "status-locked");
            if (duelTimerLimit > 0) startCountdown(duelTimerLimit);
            else startSpeedrunStopwatch();
        }

        if (!wasWaiting) {
            document.getElementById("duel-opp-label").innerText = "VS: " + data.opponent;
            document.getElementById("duel-opp-stats").innerText = data.opponent_attempts + " GUESSES";
        }

        if (data.winner && !gameOver) {
            gameOver = true;
            stopTimer();
            clearInterval(duelPollInterval);
            setKeypadDisabled(true);
            setLockStatus("DEFEATED", "danger");
            triggerCalcEffect("shake-alarm");
            playLoseSound();

            const screen = document.getElementById("screen");
            screen.classList.add("locked");
            screen.innerText = "CODE: " + data.secret;

            const log = document.getElementById("log");
            const entry = document.createElement("div");
            entry.className = "log-entry lose";
            entry.innerHTML = "<span>" + data.winner + " CRACKED IT FIRST (" + data.win_time + "s)</span>";
            const actions = document.createElement("div");
            actions.className = "action-group";
            actions.appendChild(buildDuelRematchButton());
            actions.appendChild(buildMenuButton());
            entry.appendChild(actions);
            log.prepend(entry);
        }
    };
    syncOnce();
    duelPollInterval = setInterval(syncOnce, 1500);
}

function readCustomInputs() {
    const pin = document.getElementById("custom-pin-input").value.trim();
    const note = document.getElementById("custom-note-input").value.trim();
    if (!/^\d{3,6}$/.test(pin)) {
        alert("Enter a 3, 4, 5, or 6 digit numeric PIN!");
        return null;
    }
    return { pin: pin, note: note, clues: customClues };
}

function copyCustomLink() {
    const payload = readCustomInputs();
    if (!payload) return;
    const encoded = btoa(JSON.stringify(payload));
    const url = window.location.origin + "/?v=" + encoded;
    navigator.clipboard.writeText(url);
    playTone(740, 0.1, "triangle", 0.07);
    alert("Challenge link copied to clipboard!");
}

async function launchCustomLocal() {
    const payload = readCustomInputs();
    if (!payload) return;
    customPin = payload.pin;
    customNote = payload.note;
    customClues = payload.clues;
    gameMode = "custom";
    closeCustomModal();
    await startGame("custom");
}

async function startGame(mode) {
    gameMode = mode || "standard";
    heistStage = 1;
    playTone(620, 0.1, "triangle", 0.07);
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    await resetGame();
}

function backToMenu() {
    playTone(330, 0.08, "sine", 0.06);
    stopTimer();
    clearVirusJam();
    
    if (duelPollInterval) { clearInterval(duelPollInterval); duelPollInterval = null; }
    const duelBanner = document.getElementById("duel-banner");
    if (duelBanner) duelBanner.classList.add("hidden");
    duelRoomId = null;
    
    gameOver = false;
    isSubmitting = false;
    current = "";
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
    updateStatsDisplay();
}
function updateScreen() {
    const screen = document.getElementById("screen");
    screen.classList.remove("locked");
    screen.innerText = current.padEnd(pinLength, "_");
}

function setLockStatus(text, stateClass) {
    const el = document.getElementById("lock-status");
    el.innerText = text;
    el.className = "tele-val " + stateClass;
}

function updateAttemptsDisplay(used, max) {
    const el = document.getElementById("attempts-display");
    const decryptBtn = document.getElementById("decrypt-btn");
    if (max === 0) {
        el.innerText = "∞ (USED: " + used + ")";
        el.classList.remove("danger");
        if (decryptBtn) decryptBtn.disabled = gameOver || decryptUsed;
    } else {
        const left = Math.max(0, max - used);
        el.innerText = left + " / " + max;
        el.classList.toggle("danger", left <= 2);
        if (decryptBtn) decryptBtn.disabled = gameOver || decryptUsed || left <= 1;
    }
}

function setKeypadDisabled(disabled) {
    document.querySelectorAll("#keypad button").forEach(function(btn) { btn.disabled = disabled; });
    const decryptBtn = document.getElementById("decrypt-btn");
    if (decryptBtn && disabled) decryptBtn.disabled = true;
}

function press(num) {
    if (gameOver || isSubmitting) return;
    if (jammedDigit !== null && parseInt(num, 10) === jammedDigit) {
        playTone(170, 0.09, "sawtooth", 0.05);
        triggerCalcEffect("shake-alarm");
        return;
    }
    if (mutNoRepeat && gameMode !== "daily" && gameMode !== "daily_speed" && gameMode !== "custom" && current.includes(num)) {
        playTone(190, 0.09, "sawtooth", 0.05);
        triggerCalcEffect("shake-alarm");
        return;
    }
    if (current.length < pinLength) {
        playTone(480 + parseInt(num, 10) * 25, 0.06, "sine", 0.06);
        current += num;
        updateScreen();
    }
}

function clearScreen() {
    if (gameOver || isSubmitting) return;
    playTone(260, 0.08, "sine", 0.06);
    current = "";
    updateScreen();
}

function buildTiles(guess, statuses) {
    const container = document.createElement("div");
    container.className = "tiles";
    guess.split("").forEach(function(digit, idx) {
        const tile = document.createElement("span");
        tile.className = "tile " + statuses[idx];
        tile.innerText = digit;
        container.appendChild(tile);
    });
    return container;
}

function buildResetButton(label, nextStage) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reset-btn";
    btn.innerText = label;
    btn.onclick = function() {
        if (nextStage) heistStage = nextStage;
        else if (gameMode === "heist") heistStage = 1;
        resetGame();
    };
    return btn;
}

function buildMenuButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-inline-btn";
    btn.innerText = "SETTINGS";
    btn.onclick = backToMenu;
    return btn;
}

function buildShareButton(attemptsUsed, maxTries, won) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "share-btn";
    btn.innerText = "SHARE";
    btn.onclick = function() {
        const header = gameMode === "daily_speed"
            ? "PIN DECIPHERER // Daily Speedrun (" + speedrunElapsed.toFixed(1) + "s)"
            : (gameMode === "daily" ? "PIN DECIPHERER // Daily Vault (" + dailyDateStr + ")" : "PIN DECIPHERER [" + gameMode.toUpperCase() + "]");
        const score = won ? (attemptsUsed + "/" + (maxTries || "∞")) : "X/" + (maxTries || "∞");
        const rows = guessHistory.map(function(statuses) {
            return statuses.map(function(s) {
                if (s === "correct") return "🟩";
                if (s === "present") return "🟨";
                return "⬛";
            }).join("");
        }).join("\n");
        navigator.clipboard.writeText(header + " — " + score + "\n" + rows);
        btn.innerText = "COPIED!";
        playTone(720, 0.08, "sine", 0.06);
        setTimeout(function() { btn.innerText = "SHARE"; }, 1800);
    };
    return btn;
}

async function createPrivateDuelLink() {
    const name = getDuelCodename();
    const res = await fetch("/duel/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: name,
            length: selectedDuelLength,
            timer: selectedDuelTimer
        })
    });
    const data = await res.json();
    const url = window.location.origin + "/?duel=" + data.room_id;
    navigator.clipboard.writeText(url);
    playTone(740, 0.1, "triangle", 0.07);
    alert("Private Duel link copied! Entering room now—send the link to your friend.");
    document.getElementById("duel-modal").classList.add("hidden");
    await joinDuelRoom(data.room_id);
}

function unlockBadge(id) {
    if (!unlockedBadges.includes(id)) {
        unlockedBadges.push(id);
        localStorage.setItem("pinCrackerBadges", JSON.stringify(unlockedBadges));
    }
}

function recordExplorerMode(mode) {
    if (!explorerModesCleared.includes(mode)) {
        explorerModesCleared.push(mode);
        localStorage.setItem("pinDeciphererExplorer", JSON.stringify(explorerModesCleared));
    }

    const requiredModes = ["daily", "daily_speed", "heist", "duel"];
    if (requiredModes.every(function(requiredMode) { return explorerModesCleared.includes(requiredMode); })) {
        unlockBadge("explorer");
    }
}

async function buyClue() {
    if (gameOver || isSubmitting || decryptUsed) return;
    isSubmitting = true;
    try {
        const res = await fetch("/decrypt", { method: "POST" });
        const data = await res.json();
        if (data.error) { playTone(200, 0.12, "sawtooth", 0.05); return; }
        decryptUsed = true;
        const decryptBtn = document.getElementById("decrypt-btn");
        if (decryptBtn) { decryptBtn.disabled = true; decryptBtn.innerText = "DECRYPT USED (1/1)"; }
        playTone(740, 0.12, "triangle", 0.07);
        updateAttemptsDisplay(data.attempts, data.max_attempts);

        const cell = document.getElementById("matrix-digit-" + data.digit);
        if (cell) cell.className = "matrix-cell correct";
        digitStates[data.digit] = "correct";

        const hintsList = document.getElementById("hints-list");
        const li = document.createElement("li");
        li.className = "decrypted-clue";
        li.innerText = data.clue;
        hintsList.appendChild(li);
    } finally {
        isSubmitting = false;
    }
}
async function submitGuess() {
    if (gameOver || isSubmitting || current.length !== pinLength) return;
    isSubmitting = true;
    const guess = current;
    current = "";
    updateScreen();

    try {
        const res = await fetch("/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess: guess })
        });
        const data = await res.json();
        if (data.error) { triggerCalcEffect("shake-alarm"); return; }

        guessHistory.push(data.statuses);
        updateAttemptsDisplay(data.attempts, data.max_attempts);
        updateDigitMatrix(guess, data.statuses);

        if (!data.won && !data.lost && mutTimeDrain && timerInterval !== null && data.absent > 0) {
            timeRemaining = Math.max(1, timeRemaining - (data.absent * 20));
        }

        const hintsList = document.getElementById("hints-list");
        if (data.unlocked_hint) {
            const li = document.createElement("li");
            li.className = "decrypted-clue";
            li.innerText = "[DECRYPTED] " + data.unlocked_hint;
            hintsList.appendChild(li);
        }

        const log = document.getElementById("log");
        const entry = document.createElement("div");
        entry.className = "log-entry";
        entry.appendChild(buildTiles(guess, data.statuses));
        const statusText = document.createElement("span");

        if (data.won) {
            const isHeistAdvance = (gameMode === "heist" && heistStage < 3);
            gameOver = true;
            clearVirusJam();
            if (!isHeistAdvance) stopTimer();
            setKeypadDisabled(true);
            setLockStatus(isHeistAdvance ? "STAGE CLEARED" : "BREACHED", "status-unlocked");
            triggerCalcEffect("pulse-win");

            if (typeof data.daily_solves === "number") dailySolvesCount = data.daily_solves;

            if (gameMode === "duel" && duelRoomId) {
                if (duelPollInterval) { clearInterval(duelPollInterval); duelPollInterval = null; }
                const elapsedDuel = duelTimerLimit > 0
                    ? Math.max(0.1, duelTimerLimit - (timeRemaining / 10))
                    : speedrunElapsed;
                fetch("/duel/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        room_id: duelRoomId,
                        role: duelRole,
                        attempts: data.attempts,
                        won: true,
                        elapsed: elapsedDuel
                    })
                });
            }

            let rawXP = 15 + (pinLength * 8);
            if (mutNoRepeat) rawXP += 10;
            if (mutTimeDrain && selectedTimerSeconds > 0) rawXP += 15;
            if (mutVirusJam) rawXP += 20;
            if (gameMode === "daily") rawXP += 25;
            if (gameMode === "heist" && heistStage === 3) rawXP += 45;
            const earnedXP = (gameMode === "daily_speed") ? 0 : Math.max(1, Math.round(rawXP / 3));

            if (!isHeistAdvance) {
                winStreak += 1;
                totalCracked += 1;
                totalXP += earnedXP;
                if (winStreak > bestStreak) bestStreak = winStreak;
                if (pinLength >= parseInt(maxDiffCleared, 10)) maxDiffCleared = pinLength + "-DIGIT";

                unlockBadge("first_blood");
                if (data.attempts === 1 && pinLength >= 4) unlockBadge("one_shot");
                if (timerInterval !== null && timeRemaining <= 20) unlockBadge("clutch");
                if (winStreak >= 5) unlockBadge("streak_5");
                if (pinLength === 6) unlockBadge("extreme_6");
                if (mutVirusJam) unlockBadge("virus_clear");
                if (totalCracked >= 100) unlockBadge("centurion");

                if (gameMode === "daily") recordExplorerMode("daily");
                if (gameMode === "heist" && heistStage === 3) {
                    unlockBadge("heist_master");
                    recordExplorerMode("heist");
                }
                if (gameMode === "duel") {
                    unlockBadge("duelist");
                    recordExplorerMode("duel");
                }

                if (gameMode === "daily_speed") {
                    recordExplorerMode("daily_speed");
                    const finalTime = parseFloat(speedrunElapsed.toFixed(1));
                    if (finalTime < 15.0) unlockBadge("speed_demon");
                    if (bestDailySpeed === 0 || finalTime < bestDailySpeed) {
                        bestDailySpeed = finalTime;
                        localStorage.setItem("pinCrackerBestSpeed", String(bestDailySpeed));
                    }
                    fetch("/daily_speed_lb", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: agentHandle || "ANON_AGENT", time: finalTime })
                    });
                }

                localStorage.setItem("pinCrackerStreak", String(winStreak));
                localStorage.setItem("pinCrackerBest", String(bestStreak));
                localStorage.setItem("pinCrackerTotal", String(totalCracked));
                localStorage.setItem("pinCrackerXP", String(totalXP));
                localStorage.setItem("pinCrackerMaxDiff", maxDiffCleared);

                if (agentHandle) {
                    fetch("/leaderboard", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: agentHandle, xp: totalXP, profile: buildProfilePayload() })
                    });
                }
            }
            updateStatsDisplay();
            playWinSound();

            entry.classList.add("win");
            statusText.innerText = isHeistAdvance
                ? ("STAGE " + heistStage + " BYPASSED!")
                : (gameMode === "daily_speed" ? ("TIME: " + speedrunElapsed.toFixed(1) + "s (NO XP)") : ("GRANTED +" + earnedXP + " XP"));
            entry.appendChild(statusText);

            const winActions = document.createElement("div");
            winActions.className = "action-group";
            if (isHeistAdvance) {
                winActions.appendChild(buildResetButton("STAGE " + (heistStage + 1) + " →", heistStage + 1));
            } else if (gameMode === "duel") {
                winActions.appendChild(buildShareButton(data.attempts, data.max_attempts, true));
                winActions.appendChild(buildDuelRematchButton());
                winActions.appendChild(buildMenuButton());
            } else {
                winActions.appendChild(buildShareButton(data.attempts, data.max_attempts, true));
                winActions.appendChild(buildResetButton("NEXT VAULT", gameMode === "heist" ? 1 : null));
                winActions.appendChild(buildMenuButton());
            }
            entry.appendChild(winActions);
        } else if (data.lost) {
            gameOver = true;
            clearVirusJam();
            stopTimer();
            setKeypadDisabled(true);
            setLockStatus("ALARM TRIGGERED", "danger");
            triggerCalcEffect("shake-alarm");

            winStreak = 0;
            localStorage.setItem("pinCrackerStreak", "0");
            updateStatsDisplay();
            playLoseSound();

            const screen = document.getElementById("screen");
            screen.classList.add("locked");
            screen.innerText = "CODE: " + data.secret;
            entry.classList.add("lose");
            statusText.innerText = "LOCKED OUT";
            entry.appendChild(statusText);

            const loseActions = document.createElement("div");
            loseActions.className = "action-group";
            loseActions.appendChild(buildShareButton(data.attempts, data.max_attempts, false));
            loseActions.appendChild(buildResetButton("RETRY", gameMode === "heist" ? 1 : null));
            loseActions.appendChild(buildMenuButton());
            entry.appendChild(loseActions);
        } else {
            playTone(390, 0.08, "triangle", 0.06);
            applyVirusJam();
            statusText.innerText = data.exact + " VERIFIED // " + data.misplaced + " SHIFTED" + (jammedDigit !== null ? (" [KEY " + jammedDigit + " JAMMED]") : "");
            entry.appendChild(statusText);
        }

        log.prepend(entry);
    } finally {
        isSubmitting = false;
    }
}


async function resetGame() {
    isSubmitting = false;
    decryptUsed = false;
    clearVirusJam();
    const keepHeistTimer = (gameMode === "heist" && heistStage > 1 && timerInterval !== null);
    if (!keepHeistTimer) stopTimer();

    const res = await fetch("/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            mode: gameMode,
            stage: heistStage,
            difficulty: selectedDifficulty,
            max_attempts: selectedMaxAttempts,
            custom_pin: customPin,
            custom_note: customNote,
            custom_clues: customClues,
            no_repeat: mutNoRepeat
        })
    });
    const data = await res.json();

    pinLength = data.length;
    maxAttempts = data.max_attempts;
    dailyDateStr = data.daily_date || "";
    if (typeof data.daily_solves === "number") dailySolvesCount = data.daily_solves;
    guessHistory = [];
    gameOver = false;
    current = "";

    const decryptBtn = document.getElementById("decrypt-btn");
    if (decryptBtn) { decryptBtn.disabled = false; decryptBtn.innerText = "EMERGENCY DECRYPT (-1 TRY)"; }

    const boxTitle = document.getElementById("hints-box-title");
    if (boxTitle) {
        boxTitle.innerText = data.stage_label
            ? ("// " + data.stage_label)
            : (data.hidden_count > 0 ? ("// TELEMETRY (" + data.hidden_count + " ENCRYPTED)") : "// INTERCEPTED TELEMETRY");
    }

    setKeypadDisabled(false);
    setLockStatus("LOCKED", "status-locked");
    resetDigitMatrix();
    buildSlotPins();
    updateScreen();
    updateAttemptsDisplay(0, maxAttempts);

    const hintsList = document.getElementById("hints-list");
    hintsList.innerHTML = "";
    data.hints.forEach(function(h) {
        const li = document.createElement("li");
        li.innerText = h;
        hintsList.appendChild(li);
    });
    document.getElementById("log").innerHTML = "";

    if (gameMode === "daily" || gameMode === "custom") startCountdown(0);
    else if (gameMode === "daily_speed") startSpeedrunStopwatch();
    else if (gameMode === "heist") { if (!keepHeistTimer) startCountdown(60); }
    else startCountdown(selectedTimerSeconds);
    updateStatsDisplay();
}

document.addEventListener("keydown", function(e) {
    if (document.getElementById("game-screen").classList.contains("hidden")) return;
    if (document.activeElement && document.activeElement.id === "agent-notes-box") return;
    if (gameOver || isSubmitting) return;
    if (e.key >= "0" && e.key <= "9") press(e.key);
    if (e.key === "Backspace") {
        if (current.length > 0) {
            playTone(310, 0.05, "sine", 0.05);
            current = current.slice(0, -1);
            updateScreen();
        }
    }
    if (e.key === "Escape") clearScreen();
    if (e.key === "Enter") {
        e.preventDefault();
        submitGuess();
    }
});
