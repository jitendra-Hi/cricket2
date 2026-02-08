/* =========================================
   1. GAME STATE & VARIABLES
   ========================================= */
let matchData = {
    currentInning: 1,
    battingTeam: 'team1',
    bowlingTeam: 'team2',
    teams: { team1: { name: "Team A" }, team2: { name: "Team B" } },
    scores: {
        1: { runs: 0, wickets: 0, balls: 0, overs: 0, team: '' },
        2: { runs: 0, wickets: 0, balls: 0, overs: 0, team: '' },
        3: { runs: 0, wickets: 0, balls: 0, overs: 0, team: '' },
        4: { runs: 0, wickets: 0, balls: 0, overs: 0, team: '' }
    },
    striker: { name: "Striker", runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { name: "Non-Striker", runs: 0, balls: 0, fours: 0, sixes: 0 },
    bowler: { name: "Bowler", runs: 0, overs: 0, balls: 0, maidens: 0, wickets: 0 },

    // Over Tracking
    ballsInOver: 0,
    currentOverRuns: [],
    overRunsTotal: 0
};

// Undo History Stack
let historyStack = [];

/* =========================================
   2. INITIALIZATION
   ========================================= */
window.onload = function() {
    document.getElementById('setupModal').style.display = 'flex';
    document.getElementById('overCompleteOverlay').style.display = 'none';
};

/* =========================================
   3. UNDO LOGIC
   ========================================= */
function saveState() {
    // Create deep copy for history
    historyStack.push(JSON.parse(JSON.stringify(matchData)));
    if (historyStack.length > 20) historyStack.shift(); // Limit stack size
}

function undoLastBall() {
    if (historyStack.length === 0) return; // Nothing to undo

    matchData = historyStack.pop();
    updateUI();

    // If undo reverts over end, hide overlay
    if (matchData.ballsInOver < 6) {
        document.getElementById('overCompleteOverlay').style.display = 'none';
        document.getElementById('bowlerModal').style.display = 'none';
    }
}

/* =========================================
   4. START MATCH
   ========================================= */
function startMatch() {
    // Get Teams
    matchData.teams.team1.name = document.getElementById('team1Input').value || "Team A";
    matchData.teams.team2.name = document.getElementById('team2Input').value || "Team B";

    // Toss Logic
    let tossWinner = document.getElementById('tossWinner').value;
    let electedTo = document.getElementById('electedTo').value;

    if (electedTo === 'bat') {
        matchData.battingTeam = tossWinner;
        matchData.bowlingTeam = (tossWinner === 'team1') ? 'team2' : 'team1';
    } else {
        matchData.battingTeam = (tossWinner === 'team1') ? 'team2' : 'team1';
        matchData.bowlingTeam = tossWinner;
    }
    matchData.scores[1].team = matchData.battingTeam;

    // Get Players
    matchData.striker.name = document.getElementById('initStriker').value || "Striker";
    matchData.nonStriker.name = document.getElementById('initNonStriker').value || "Non-Striker";
    matchData.bowler.name = document.getElementById('initBowler').value || "Bowler";

    // Update UI & Close Modal
    document.getElementById('team1Name').innerText = matchData.teams.team1.name;
    document.getElementById('team2Name').innerText = matchData.teams.team2.name;
    document.getElementById('setupModal').style.display = 'none';

    updateUI();
}

/* =========================================
   5. SCORING ENGINE
   ========================================= */
function addRuns(runs) {
    saveState();
    updateStats(runs, true);
    if(runs % 2 !== 0) swapStrike();
    checkOverEnd();
}

function addExtra(type) {
    saveState();
    let runs = 1;
    let validBall = false;

    if (type === 'wide' || type === 'no-ball') {
        validBall = false;
        matchData.currentOverRuns.push(type === 'wide' ? 'WD' : 'NB');
    } else {
        validBall = true;
        matchData.currentOverRuns.push(type === 'bye' ? 'B' : 'LB');
        swapStrike();
    }
    updateStats(runs, validBall);
    checkOverEnd();
}

function updateStats(runs, isValidBall) {
    let inn = matchData.currentInning;

    matchData.scores[inn].runs += runs;
    matchData.bowler.runs += runs;
    matchData.overRunsTotal += runs;

    if(isValidBall) {
        matchData.scores[inn].balls++;
        matchData.striker.runs += runs;
        matchData.striker.balls++;
        matchData.bowler.balls++;
        matchData.ballsInOver++;
        matchData.currentOverRuns.push(runs);

        if(runs === 4) matchData.striker.fours++;
        if(runs === 6) matchData.striker.sixes++;
    }
    updateUI();
}

/* =========================================
   6. OVER HANDLING
   ========================================= */
function checkOverEnd() {
    if (matchData.ballsInOver >= 6) {
        setTimeout(() => {
            document.getElementById('overCompleteOverlay').style.display = 'flex';
        }, 300);
    }
}

function acknowledgeOver() {
    saveState(); // Save point before changing bowler

    document.getElementById('overCompleteOverlay').style.display = 'none';

    // Maiden?
    if (matchData.overRunsTotal === 0) matchData.bowler.maidens++;

    // Update Overs
    let inn = matchData.currentInning;
    matchData.scores[inn].overs = Math.floor(matchData.scores[inn].balls / 6);
    matchData.bowler.overs++;

    // Swap Ends
    swapStrike();

    // Reset Over Data
    matchData.ballsInOver = 0;
    matchData.currentOverRuns = [];
    matchData.overRunsTotal = 0;

    // Show New Bowler Input
    document.getElementById('newBowlerName').value = "";
    document.getElementById('bowlerModal').style.display = 'flex';
    updateUI();
}

function addNewBowler() {
    let name = document.getElementById('newBowlerName').value;
    if(name) {
        matchData.bowler = { name: name, runs: 0, overs: 0, balls: 0, maidens: 0, wickets: 0 };
        document.getElementById('bowlerModal').style.display = 'none';
        updateUI();
    }
}

/* =========================================
   7. WICKET HANDLING
   ========================================= */
function showWicketModal() { document.getElementById('wicketModal').style.display = 'flex'; }
function closeWicketModal() { document.getElementById('wicketModal').style.display = 'none'; }

function confirmWicket() {
    saveState();

    let inn = matchData.currentInning;
    matchData.scores[inn].wickets++;
    matchData.scores[inn].balls++;
    matchData.bowler.wickets++;
    matchData.bowler.balls++;
    matchData.ballsInOver++;
    matchData.currentOverRuns.push('W');

    let outPos = document.getElementById('outBatsman').value;
    let newName = document.getElementById('newBatsmanAfterWicket').value || "New Batter";
    let newPlayer = { name: newName, runs:0, balls:0, fours:0, sixes:0 };

    if(outPos === 'striker') matchData.striker = newPlayer;
    else matchData.nonStriker = newPlayer;

    closeWicketModal();
    checkOverEnd();
    updateUI();
}

/* =========================================
   8. DECLARE & SAVE
   ========================================= */
function declareInnings() {
    // Logic: Inning 1,2,3 -> Next Inning. Inning 4 -> Result.
    if(matchData.currentInning < 4) {
        // We use a custom modal or just simple confirm since alerts are blocked?
        // NOTE: Standard 'confirm' might be blocked in some WebViews, but usually works better than prompt.
        // Ideally, we'd use a modal here too, but for simplicity:
        saveState();

        matchData.currentInning++;

        // Swap Teams
        let t = matchData.battingTeam;
        matchData.battingTeam = matchData.bowlingTeam;
        matchData.bowlingTeam = t;
        matchData.scores[matchData.currentInning].team = matchData.battingTeam;

        // Reset Players
        matchData.striker = { name: "Striker", runs: 0, balls: 0, fours: 0, sixes: 0 };
        matchData.nonStriker = { name: "Non-Striker", runs: 0, balls: 0, fours: 0, sixes: 0 };
        matchData.bowler = { name: "Bowler", runs: 0, overs: 0, balls: 0, maidens: 0, wickets: 0 };

        // Reset Over
        matchData.ballsInOver = 0;
        matchData.currentOverRuns = [];

        updateUI();
    } else {
        // Match Over
        document.getElementById('resultModal').style.display = 'flex';
    }
}

function saveMatchRecord() {
    let resultText = document.getElementById('matchResultInput').value;
    if(!resultText) return;

    let newRecord = {
        id: Date.now(),
        date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
        team1: matchData.teams.team1.name,
        team2: matchData.teams.team2.name,
        result: resultText,
        scores: matchData.scores
    };

    let history = JSON.parse(localStorage.getItem('cricketAppHistory')) || [];
    history.unshift(newRecord);
    localStorage.setItem('cricketAppHistory', JSON.stringify(history));

    document.getElementById('resultModal').style.display = 'none';
    location.reload(); // Restart App
}

/* =========================================
   9. UI & UTILS
   ========================================= */
function updateUI() {
    let inn = matchData.currentInning;
    let s = matchData.scores[inn];

    // Header
    document.getElementById('battingTeam').innerText = `${matchData.teams[matchData.battingTeam].name} (Inn ${inn})`;
    document.getElementById('mainScore').innerText = `${s.runs}/${s.wickets}`;

    let oversTxt = Math.floor(s.balls / 6) + "." + (s.balls % 6);
    document.getElementById('overs').innerText = oversTxt;

    let rr = s.balls > 0 ? (s.runs / (s.balls/6)).toFixed(2) : "0.00";
    document.getElementById('runRate').innerText = rr;

    // Striker
    document.getElementById('striker-name').innerText = matchData.striker.name + "*";
    document.getElementById('striker-score').innerText = matchData.striker.runs;
    document.getElementById('striker-balls').innerText = matchData.striker.balls;
    document.getElementById('striker-fours').innerText = matchData.striker.fours;
    document.getElementById('striker-sixes').innerText = matchData.striker.sixes;

    // Non Striker
    document.getElementById('nonstriker-name').innerText = matchData.nonStriker.name;
    document.getElementById('nonstriker-score').innerText = matchData.nonStriker.runs;
    document.getElementById('nonstriker-balls').innerText = matchData.nonStriker.balls;
    document.getElementById('nonstriker-fours').innerText = matchData.nonStriker.fours;
    document.getElementById('nonstriker-sixes').innerText = matchData.nonStriker.sixes;

    // Bowler
    document.getElementById('bowler-name').innerText = matchData.bowler.name;
    document.getElementById('bowler-figures').innerText = `${matchData.bowler.wickets}/${matchData.bowler.runs}`;
    let bo = Math.floor(matchData.bowler.balls / 6) + "." + (matchData.bowler.balls % 6);
    document.getElementById('bowler-overs').innerText = bo;
    document.getElementById('bowler-maidens').innerText = matchData.bowler.maidens;
    let be = matchData.bowler.balls > 0 ? (matchData.bowler.runs / (matchData.bowler.balls/6)).toFixed(2) : "0.00";
    document.getElementById('bowler-econ').innerText = be;

    // Over Bubbles
    let od = document.getElementById('currentOver');
    od.innerHTML = '';
    matchData.currentOverRuns.forEach(r => {
        let b = document.createElement('span');
        b.innerText = r;

        let bg = '#e0e0e0';
        let col = '#444';

        if(r == 4) { bg = '#90caf9'; col = '#0d47a1'; }
        if(r == 6) { bg = '#ce93d8'; col = '#4a148c'; }
        if(r == 'W') { bg = '#ef9a9a'; col = '#b71c1c'; }
        if(r == 'WD' || r == 'NB') { bg = '#fff59d'; col = '#f57f17'; }

        b.style.cssText = `display:inline-block; width:30px; height:30px; line-height:30px; background:${bg}; color:${col}; border-radius:50%; text-align:center; margin-right:6px; font-size:12px; font-weight:bold; box-shadow:inset 0 -2px 5px rgba(0,0,0,0.1);`;
        od.appendChild(b);
    });

    // Active Tab
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        if(parseInt(t.dataset.innings) === inn) t.classList.add('active');
    });

    // Trail/Lead
    updateLeadTrail(inn);
}

function updateLeadTrail(inn) {
    let txt = "";
    let s = matchData.scores;
    if(inn === 2) {
        let diff = s[1].runs - s[2].runs;
        txt = diff > 0 ? `Trail by ${diff}` : `Lead by ${Math.abs(diff)}`;
    }
    else if(inn === 3) {
        let lead = (s[1].runs + s[3].runs) - s[2].runs;
        txt = `Lead by ${lead}`;
    }
    else if(inn === 4) {
        let target = (s[1].runs + s[3].runs) - s[2].runs + 1;
        let need = target - s[4].runs;
        txt = need > 0 ? `Need ${need} to win` : "WON!";
    }
    document.getElementById('trail').innerText = txt;
}

// Player Modals & Tabs
function swapStrike() {
    let temp = matchData.striker;
    matchData.striker = matchData.nonStriker;
    matchData.nonStriker = temp;
    updateUI();
}

function switchInning(inn) {
    // Only allow switching to past innings for viewing
    if(inn <= matchData.currentInning) {
        matchData.currentInning = inn;
        updateUI();
    }
}

function showBatsmanModal(type) {
    document.getElementById('batsmanTypeToChange').value = type;
    document.getElementById('batsmanModal').style.display = 'flex';
}
function closeBatsmanModal() { document.getElementById('batsmanModal').style.display = 'none'; }

function addNewBatsman() {
    let type = document.getElementById('batsmanTypeToChange').value;
    let name = document.getElementById('newBatsmanName').value;
    if(name) {
        let p = { name: name, runs:0, balls:0, fours:0, sixes:0 };
        if(type === 'striker') matchData.striker = p;
        else matchData.nonStriker = p;
        closeBatsmanModal();
        updateUI();
    }
}

// History
function showHistory() { document.getElementById('historyContainer').style.display = 'block'; document.getElementById('mainContainer').style.display = 'none'; loadHistory(); }
function hideHistory() { document.getElementById('historyContainer').style.display = 'none'; document.getElementById('mainContainer').style.display = 'block'; }
function loadHistory() {
    let h = JSON.parse(localStorage.getItem('cricketAppHistory')) || [];
    let list = document.getElementById('historyList');
    list.innerHTML = h.length ? '' : '<p style="text-align:center;color:#888;">No history yet</p>';
    h.forEach(m => {
        let d = document.createElement('div');
        d.className = 'history-item';
        d.innerHTML = `<b>${m.date}</b><br>${m.team1} vs ${m.team2}<br><span style="color:green">${m.result}</span>`;
        d.onclick = () => {
            showFullScorecard(m);
        };
        list.appendChild(d);
    });
}
function showFullScorecard(m) {
    let c = document.getElementById('scorecardContent');
    c.innerHTML = `<h4>${m.result}</h4><hr>`;
    for(let i=1; i<=4; i++) {
        let sc = m.scores[i];
        if(sc.runs > 0 || sc.balls > 0) {
            c.innerHTML += `<div style="margin:10px 0; padding:10px; background:#f9f9f9; border-radius:5px;">
                <b>${i} Inn (${sc.team})</b>: ${sc.runs}/${sc.wickets} <small>(${Math.floor(sc.balls/6)}.${sc.balls%6} ov)</small>
            </div>`;
        }
    }
    document.getElementById('scorecardModal').style.display = 'flex';
}
function closeScorecard() { document.getElementById('scorecardModal').style.display = 'none'; }