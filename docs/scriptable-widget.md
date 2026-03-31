# PWHL Gameday iPhone Widget

Add live PWHL scores to your iPhone Home Screen using the free [Scriptable](https://scriptable.app) app. The widget shows up to four games — live scores update automatically, with winner bolded for completed games.

**[Download widget script](../widget/PWHL-Gameday-Widget.js)**

---

## Quick Reference

If you're comfortable with your iPhone, here's the short version. Detailed instructions for each step follow below.

1. **Install Scriptable** from the App Store (free, by Simon B. Støvring)
2. **Open Scriptable** and tap the **+** button to create a new script
3. **Paste** the [widget script](../widget/PWHL-Gameday-Widget.js) into the editor
4. **Name the script** by tapping the title at the top — type **PWHL Gameday**
5. **Run it once** by tapping the **▶ Play** button to test and grant permissions
6. **Add the widget:** Go to your Home Screen → long-press an empty area → tap **+** → search **Scriptable** → choose **Medium** → tap **Add Widget**
7. **Connect it:** Long-press the new widget → **Edit Widget** → tap **Script** → select **PWHL Gameday**

That's it. The widget will refresh automatically every 15–30 minutes.

---

## What You'll Need

- An iPhone running iOS 16 or later
- The **Scriptable** app (free from the App Store)
- The [widget script](../widget/PWHL-Gameday-Widget.js) — copy the raw file contents

---

## Detailed Instructions

### Part 1: Install Scriptable

1. Open the **App Store** on your iPhone.
2. Tap the **Search** tab at the bottom and type **Scriptable**.
3. Look for the app by **Simon B. Støvring** — it has a dark icon with overlapping circles.
4. Tap **Get** to download and install it. The app is completely free with no ads or in-app purchases.
5. Once installed, open Scriptable briefly to confirm it launches. You'll see an empty list — that's normal.

---

### Part 2: Add the Script to Scriptable

1. Open the [widget script](../widget/PWHL-Gameday-Widget.js) on GitHub and tap the **Raw** button to view the plain text.
2. **Select all** of the script text and tap **Copy**. Make sure you copy the entire script from the very first line to the very last line.
3. Open the **Scriptable** app.
4. Tap the **blue "+" button** in the top-right corner to create a new script.
5. You'll see a blank editor screen with a blinking cursor. **Tap and hold** in the editor area, then tap **Paste**.
6. The script text should now appear in the editor.

**Alternative: Import via AirDrop or Files**

If you have the `.js` file on your device:

1. Tap on the file.
2. If prompted, choose **Open in Scriptable**. The script will be imported automatically.
3. If that option doesn't appear, save the file to **Files → iCloud Drive → Scriptable**. The app will pick it up on its own.

---

### Part 3: Name Your Script

1. In the Scriptable editor, tap the **title area** at the very top of the screen. It will say something like "Untitled Script."
2. Delete the placeholder name and type **PWHL Gameday**.
3. Tap **Done** on the keyboard.

---

### Part 4: Test the Script

Before placing the widget on your Home Screen, run the script once inside the app. This confirms everything is working and allows the script to request any permissions it needs (such as internet access).

1. With your script open in the editor, tap the **blue Play button (▶)** in the bottom-right corner of the screen.
2. The script will run and show you a **preview** of what the widget will look like.
3. If you see scores, team names, or a "No games found" message — you're all set. Tap anywhere to dismiss the preview.
4. If you see an error message, double-check that the entire script was pasted correctly and that no text was cut off.

> **Important:** Always run a new script inside the Scriptable app at least once before adding it to your Home Screen. Some scripts need this first run to get permission to access the internet or other features.

---

### Part 5: Add the Widget to Your Home Screen

**Enter jiggle mode**

1. Go to your iPhone's **Home Screen**.
2. **Long-press** (press and hold) on any empty area of the screen until the app icons start wiggling.
3. Tap the **"+" button** that appears in the top-left corner of the screen.

**Find Scriptable**

4. A widget gallery will appear. Use the **search bar** at the top and type **Scriptable**.
5. Tap on **Scriptable** in the search results.

**Choose a widget size**

6. You'll see three size options. Swipe left and right to browse them:
   - **Small** — a compact square (shows one or two games)
   - **Medium** — a wide rectangle (recommended, shows up to four games)
   - **Large** — a tall rectangle (shows the most information)
7. Tap **"Add Widget"** below the **Medium** size.

**Place the widget**

8. The widget will appear on your Home Screen, probably showing a generic Scriptable placeholder. You can **drag it** to your preferred location while the icons are still wiggling.

---

### Part 6: Connect the Widget to Your Script

1. While still in jiggle mode (icons wiggling), **tap directly on the widget** you just added. A settings panel will slide up.
   - If you've already exited jiggle mode, long-press the widget and choose **"Edit Widget"** from the menu.
2. You'll see a configuration screen with these options:
   - **Script** — Tap this and select **PWHL Gameday**.
   - **When Interacting** — Leave this set to the default.
   - **Parameter** — Leave this blank.
3. Tap anywhere **outside** the settings panel to close it.
4. Tap **Done** in the top-right corner to exit jiggle mode.

Your widget should now load and display live data. Give it a few seconds — it needs to fetch information the first time.

---

## Troubleshooting

**The widget says "Select Script in Widget Configurator"**
You added the widget but didn't complete Part 6. Long-press the widget, tap "Edit Widget," and select **PWHL Gameday**.

**The widget shows an error or goes blank**
Open the Scriptable app and run the script with the Play button to check for errors. Make sure your iPhone has an internet connection. Confirm the entire script was pasted — a partially copied script is the most common cause of errors.

**The widget isn't updating**
Apple controls how frequently widgets refresh — roughly every 15 to 30 minutes. The widget may refresh less often if your phone is in Low Power Mode. To force a refresh, open the Scriptable app and run the script manually.

**I want to update to a newer version of the script**
Open Scriptable, tap on your existing script, select all the text and delete it, then paste the new version. Run it once with the Play button to confirm it works. The Home Screen widget will pick up the changes on its next refresh.

---

## Good to Know

**Tapping the widget** opens PWHL Gameday in Safari.

**You can have multiple Scriptable widgets** on your Home Screen, each running a different script. Repeat Parts 5 and 6 for each one and select a different script in the configuration step.

**The widget's appearance** (colors, fonts, layout) is controlled by the script. If you'd like changes, edit the script in Scriptable or open an issue on GitHub.

---

*Scriptable is a free app created by Simon B. Støvring. It is not affiliated with the PWHL or PWHL Gameday. For more information, visit [scriptable.app](https://scriptable.app).*
