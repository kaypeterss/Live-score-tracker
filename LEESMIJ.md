# Age of Sigmar scoreboard

Live app: https://aos-score-kay-sept17.kaypeters.chatgpt.site/

Choose a table, then start a new game or continue the saved game. New games require a battleplan, both armies and two different battletactics per player. Command Points start at 4; other scores start at 0.

Current turn and next turn are displayed separately. Next advances through Top, Bot and END; choose the starting army for each new turn. Previous restores the previous turn and its active player. Turn changes appear immediately while saving to Google Sheets.

## Google Sheets

- AoS Tables: unique ID in A, name in B, Active in C. Add a new row to add a table.
- AoS Armies / AoS Battleplans: name in A, alliance/group in B, Active in C.
- AoS Battletactics: name in A, Active in B.
- Game · ID: two player columns with scores, armies and objectives. Edit other VP; total VP includes battletactic points automatically. Current turn and active army are calculated displays. Hidden column H stores game settings and previous turns; manage turns in the app.
- Archive tabs contain the original pre-table game data.

## Updating Apps Script

Replace Code.gs with dist/Code.gs in the existing bound Apps Script project. Save, then update the existing deployment using Manage deployments → Edit → New version → Deploy. Keep the existing URL and access settings.


## Shared statistics and OBS

`dist/statistics.mjs` is the common statistics implementation for the app and OBS.
Statistics are saved in `games/<table>/game/stats` within the same Firebase transaction as each score change. Transactions are idempotent; statistics do not record optimistic or rejected changes. New games reset the statistics. Existing games preserve their current totals and can import local history from the browser that originally tracked the game; missing earlier history is marked incomplete.

The timer stores timestamps only on active-player/turn transitions, and displays update once per second. The existing Firebase SDK, anonymous authentication and OBS refresh behavior are preserved.

`/obs-statistics.html?table=1` lists all individual text and chart URLs with Copy URL buttons. Choose the actual table ID. Four chart sources cover the VP race, cumulative active time, CP spending and scoring split into other VP/battletactic VP for each player. Use Browser Sources at 1000 × 420 for charts. Text sources use the existing OBS Custom CSS.

Deployment prerequisites: publish the new `game/stats` string validation in `firebase.rules.json`; deploy `dist/Code.gs` with `sheetOutputHash_` before publishing this app. The export uses a fixed-size digest so the growing statistics cannot exceed the Google Apps Script property-size limit. Do not replace the Firebase transport or remove existing rules.

Verification: `node tests/statistics.test.mjs` exercises the actual app transaction functions and the shared statistics module.
