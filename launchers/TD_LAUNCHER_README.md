# TD Launcher

Stable launcher flow for CJ.

## Target

`https://playonedaygames.com/trash-dice/ios-preview/`

This is the protected, stable Trash Dice preview URL. Do not point launchers at Slack links, `trycloudflare.com` tunnels, or iteration-specific preview URLs.

## Created Locally

- Desktop shortcut: `C:\Users\shove\OneDrive\Desktop\TD.lnk`
- Start Menu shortcut: `C:\Users\shove\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\TD.lnk`
- Repo shortcut backup: `launchers\TD.lnk`
- Repo fallback URL file: `launchers\TD.url`
- Repo icon: `launchers\TD.ico`

The `.lnk` shortcuts open Chrome to the stable preview URL and use the local Trash Dice icon. No password is embedded in the shortcut or URL.

## Windows Taskbar

Use the Start Menu copy for pinning:

1. Press the Windows key.
2. Search `TD`.
3. Right-click `TD`.
4. Choose `Pin to taskbar`.

If Windows does not show the pin option, open `TD` once, then right-click the running Chrome taskbar icon and check whether Windows offers a pin option for the shortcut.

## iPhone Home Screen

Use Safari, not a temporary preview link:

1. Open `https://playonedaygames.com/trash-dice/ios-preview/` in Safari.
2. Authenticate if prompted.
3. Tap Share.
4. Tap Add to Home Screen.
5. Name it `TD`.
6. Turn Open as Web App OFF if iOS shows that option.
7. Tap Add.

Keeping Open as Web App OFF helps the launcher open in Safari and share Safari's auth/session.

## Refresh Behavior

The icon can stay static. The game content updates because the shortcut points at a stable URL. When the protected preview route is updated/deployed, the desktop shortcut and iPhone Home Screen icon should load the latest deployed content without changing the shortcut.

The route currently returns `Cache-Control: no-store` when unauthenticated, which is what we want for preview refresh behavior.
