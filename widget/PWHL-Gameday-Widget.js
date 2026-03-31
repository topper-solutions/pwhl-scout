// PWHL Gameday Widget for Scriptable
// Shows recent PWHL scores on your iPhone Home Screen
//
// SETUP:
// 1. Install Scriptable from the App Store
// 2. Open Scriptable, tap +, paste this script
// 3. Name it PWHL Gameday
// 4. Long-press Home Screen, tap +, search Scriptable
// 5. Add a Medium widget, tap it, choose PWHL Gameday

var SCOUT_URL = "https://topper.solutions/pwhl-gameday";

var TEAM_COLORS = {
  "BOS": "#1a3c5e",
  "MTL": "#6b2d6b",
  "MIN": "#2e7d5b",
  "TOR": "#1d428a",
  "OTT": "#c8102e",
  "NYS": "#00a3e0",
  "VAN": "#00573f",
  "SEA": "#4b9cd3"
};

var TEAM_MAP = {
  "Boston": "BOS",
  "Montreal": "MTL",
  "Montr": "MTL",
  "Minnesota": "MIN",
  "Toronto": "TOR",
  "Ottawa": "OTT",
  "New York": "NYS",
  "Vancouver": "VAN",
  "Seattle": "SEA"
};

function abbr(name) {
  var keys = Object.keys(TEAM_MAP);
  for (var i = 0; i < keys.length; i++) {
    if (name.indexOf(keys[i]) !== -1) {
      return TEAM_MAP[keys[i]];
    }
  }
  return name.substring(0, 3).toUpperCase();
}

function teamColor(code) {
  return new Color(TEAM_COLORS[code] || "#666666");
}

async function fetchGames() {
  var req = new Request(SCOUT_URL);
  var html = await req.loadString();
  var games = [];

  // Split by game links
  var chunks = html.split(/href="\/pwhl-gameday\/game\//);
  chunks.shift(); // remove preamble

  for (var c = 0; c < chunks.length && games.length < 6; c++) {
    var chunk = chunks[c];
    var idMatch = chunk.match(/^(\d+)/);
    if (!idMatch) continue;

    // Get team names from alt attributes
    var alts = [];
    var altRe = /alt="([^"]+)"/g;
    var am;
    while ((am = altRe.exec(chunk)) !== null) {
      alts.push(am[1]);
    }
    if (alts.length < 2) continue;

    var awayCode = abbr(alts[0]);
    var homeCode = abbr(alts[1]);

    // Determine status
    var status = "";
    var isLive = false;
    var isScheduled = false;

    if (chunk.indexOf("Final") !== -1) {
      status = "F";
    } else if (chunk.match(/\d+:\d+\s*(AM|PM)/i)) {
      var tm = chunk.match(/(\d+:\d+\s*(AM|PM))/i);
      status = tm ? tm[1] : "TBD";
      isScheduled = true;
    } else if (chunk.match(/(1st|2nd|3rd|OT)/)) {
      var pm2 = chunk.match(/(1st|2nd|3rd|OT)/);
      status = pm2[1];
      isLive = true;
    }

    // Extract scores - digits that appear standalone
    var awayScore = "-";
    var homeScore = "-";
    if (!isScheduled) {
      // Look for standalone single or double digit numbers
      var scoreNums = [];
      var snRe = />\s*(\d{1,2})\s*</g;
      var sn;
      while ((sn = snRe.exec(chunk)) !== null) {
        scoreNums.push(sn[1]);
      }
      if (scoreNums.length >= 2) {
        awayScore = scoreNums[0];
        homeScore = scoreNums[1];
      }
    }

    games.push({
      away: awayCode,
      home: homeCode,
      awayScore: awayScore,
      homeScore: homeScore,
      status: status,
      isLive: isLive,
      isScheduled: isScheduled
    });
  }

  return games;
}

function drawGame(col, game) {
  var box = col.addStack();
  box.layoutVertically();
  box.setPadding(5, 6, 5, 6);
  box.cornerRadius = 6;
  box.backgroundColor = new Color("#252540");

  // Status line
  var stLine = box.addStack();
  stLine.layoutHorizontally();
  var stText = stLine.addText(game.isLive ? "LIVE" : game.status);
  stText.font = Font.boldSystemFont(8);
  stText.textColor = game.isLive ? new Color("#ef4444") : new Color("#888888");
  stLine.addSpacer();

  box.addSpacer(3);

  // Away
  var aRow = box.addStack();
  aRow.layoutHorizontally();
  aRow.centerAlignContent();
  var aDot = aRow.addText("\u25CF ");
  aDot.font = Font.systemFont(7);
  aDot.textColor = teamColor(game.away);
  var aName = aRow.addText(game.away);
  aName.font = Font.mediumSystemFont(12);
  aName.textColor = Color.white();
  aRow.addSpacer();
  if (!game.isScheduled) {
    var aWin = !game.isLive && parseInt(game.awayScore) > parseInt(game.homeScore);
    var aScore = aRow.addText(game.awayScore);
    aScore.font = aWin ? Font.boldSystemFont(13) : Font.systemFont(12);
    aScore.textColor = aWin ? Color.white() : new Color("#aaaaaa");
  }

  box.addSpacer(1);

  // Home
  var hRow = box.addStack();
  hRow.layoutHorizontally();
  hRow.centerAlignContent();
  var hDot = hRow.addText("\u25CF ");
  hDot.font = Font.systemFont(7);
  hDot.textColor = teamColor(game.home);
  var hName = hRow.addText(game.home);
  hName.font = Font.mediumSystemFont(12);
  hName.textColor = Color.white();
  hRow.addSpacer();
  if (!game.isScheduled) {
    var hWin = !game.isLive && parseInt(game.homeScore) > parseInt(game.awayScore);
    var hScore = hRow.addText(game.homeScore);
    hScore.font = hWin ? Font.boldSystemFont(13) : Font.systemFont(12);
    hScore.textColor = hWin ? Color.white() : new Color("#aaaaaa");
  }
}

async function createWidget() {
  var w = new ListWidget();
  w.backgroundColor = new Color("#1a1a2e");
  w.setPadding(10, 10, 10, 10);
  w.url = SCOUT_URL;

  // Header
  var hdr = w.addStack();
  hdr.layoutHorizontally();
  hdr.centerAlignContent();
  var t = hdr.addText("PWHL GAMEDAY");
  t.font = Font.boldSystemFont(11);
  t.textColor = new Color("#e0e0e0");
  hdr.addSpacer();
  var now = new Date();
  var ts = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  var upd = hdr.addText(ts);
  upd.font = Font.systemFont(8);
  upd.textColor = new Color("#666666");

  w.addSpacer(6);

  try {
    var games = await fetchGames();

    // Sort: live first, then final, then scheduled
    var live = [];
    var final2 = [];
    var sched = [];
    for (var i = 0; i < games.length; i++) {
      if (games[i].isLive) live.push(games[i]);
      else if (games[i].isScheduled) sched.push(games[i]);
      else final2.push(games[i]);
    }
    var sorted = live.concat(final2).concat(sched);
    var show = sorted.slice(0, 4);

    if (show.length === 0) {
      var ng = w.addText("No games found");
      ng.font = Font.systemFont(12);
      ng.textColor = new Color("#999999");
    } else {
      var row1 = w.addStack();
      row1.layoutHorizontally();
      row1.spacing = 6;

      drawGame(row1, show[0]);
      if (show.length > 1) drawGame(row1, show[1]);

      if (show.length > 2) {
        w.addSpacer(4);
        var row2 = w.addStack();
        row2.layoutHorizontally();
        row2.spacing = 6;
        drawGame(row2, show[2]);
        if (show.length > 3) drawGame(row2, show[3]);
      }
    }
  } catch (e) {
    var err = w.addText("Could not load scores");
    err.font = Font.systemFont(11);
    err.textColor = new Color("#ef4444");
  }

  w.addSpacer();
  return w;
}

var widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();
