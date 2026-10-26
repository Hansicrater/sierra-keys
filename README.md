# Sierra keys

Keyboard shortcuts for [Sierra Interactive](https://www.sierrainteractive.com/) Client Admin in Brave on Omarchy.

Sierra does not ship its own shortcut map. This extension listens on the Client Admin site and clicks the same controls you would: search, the Leads menu, the lead action menu, and the dialer. **Alt+Shift+/** opens a cheatsheet. From that list you can give any action a new Alt or Ctrl chord. Your bindings stay in the browser.

Plain letters still type in fields. A chord with Alt or Ctrl still runs while a field is focused.

On any Client Admin page, Shift+arrow moves a highlight to the nearest stop in that direction. Stops are the menus above the lead list, such as Bulk Actions, statuses, agents, and Sort by, and the lead names in the list. Enter, or Shift+Enter, opens the highlighted control. In a text field that already has text, Shift+arrow still selects text. In an empty field, Shift+arrow leaves the field and moves the highlight.

## Shortcuts

| Chord | Action |
| --- | --- |
| Alt+Shift+/ | Cheatsheet |
| Alt+Shift+S | Focus search |
| Alt+Shift+M | Leads Dashboard |
| Alt+Shift+A | Add Lead |
| Alt+Shift+N | Add a note |
| Alt+Shift+T | Add a task |
| Alt+Shift+E | Send an email |
| Alt+Shift+X | Send a text |
| Alt+Enter | Send the drafted text |
| Alt+Shift+C | Log a call |
| Alt+Shift+P | Call via your personal number on the connected phone |

Alt+Shift+D and Alt+Shift+L are left for Omarchy. Those chords start Download Video and Copy URL. The cheatsheet will not let you bind them.

On a leads list, check one lead or hover its row before a note, task, email, text, call, or dial shortcut. Note, task, email, text, and log-call open the control. They do not send, save, or delete. The text shortcut opens Send Text Message from the lead's + menu, or the Text Msg button on the lead, or the Texts link on that row. Alt+Enter sends that draft. It clicks Send only when the focused box is a text composer and the message is not empty. It does not send an email. The dial shortcut chooses Personal Number when that row is in the call menu, then Call via your connected phone. It does not choose Call via Browser. If more than one connected number is showing and none is marked personal, it does not dial.

The script runs on `https://*.sierrainteractivedev.com/*`. On `sierrainteractive.com` the cheatsheet still opens, and a Client Admin chord says so.

## Install

Clone it somewhere permanent:

```bash
git clone https://github.com/Hansicrater/sierra-keys.git ~/.local/share/omarchy/browser-extensions/sierra-keys
```

Brave on Omarchy reads `~/.config/brave-flags.conf`. Add the clone to the existing `--load-extension` line, separated by a comma:

```text
--load-extension=/usr/share/omarchy/default/chromium/extensions/copy-url,/usr/share/omarchy/default/chromium/extensions/yt-dlp,/usr/share/omarchy/default/chromium/extensions/whatsapp-slim,/home/you/.local/share/omarchy/browser-extensions/sierra-keys
```

Use your own home directory in that path. Quit Brave completely and open it again. Closing the window is not enough if Brave is still running. Then open Client Admin and press Alt+Shift+/.

## Update

```bash
git -C ~/.local/share/omarchy/browser-extensions/sierra-keys pull
```

Quit Brave and open it again after pulling.

## License

MIT. See [LICENSE](LICENSE).
