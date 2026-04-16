# Wellby Float

This is a first-pass Chrome extension that injects a small floating Wellby launcher onto regular web pages.

## What it does

- Adds a small launcher pill on the right side of most websites
- Opens the local Wellby app at `http://localhost:3000`
- Reuses the existing Wellby tab if it is already open

## Load it in Chrome

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select this folder:

```text
C:\Users\miche\projects\Hackathon-app\extension\wellby-float
```

## Notes

- This will not appear on restricted Chrome pages like `chrome://` URLs or the Chrome Web Store
- Wellby should be running locally at `http://localhost:3000`
- This first version opens/focuses the main app in a tab rather than using a side panel
