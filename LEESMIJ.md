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
