# MakeCode AI — Client

This repo includes two **client-side** scripts that talk to your MakeCode AI server and paste generated code directly into the MakeCode editor.

* `client.js` — a **userscript** that injects a movable UI panel (engine picker, prompt box, Generate & Revert).
* `work.js` — a **bookmarklet** version you can paste into a browser bookmark. It shows a minimal UI and (in the original flow) asked for an API key.

> The server handles model selection and stores API keys. The client **never** needs model keys if your server is set up with an OpenRouter key.

---

## 1) `client.js` (recommended)

### What it does

* Adds a floating panel on MakeCode (`micro:bit`, `Arcade`, `Maker`).
* Lets you type a prompt, choose the target (micro:bit/Arcade/Maker), and paste the generated code back into the editor.
* The **Engine** dropdown reflects presets from your server (`/mcai/config`). When you pick a different engine, it tells the server to switch the active preset.

### Configure

Open `client.js` and set:

```js
// where your server is hosted
const BACKEND = "https://mcai.dev.tk.sg";

// only if your server enforces bearer auth (SERVER_APP_TOKEN in .env)
const APP_TOKEN = "";
```

### Install & run

1. Load MakeCode (e.g., [https://makecode.microbit.org](https://makecode.microbit.org)) and open a project (so the code editor exists).
2. Run `client.js` using your preferred userscript approach (any manager is fine).
3. Click the **AI** button to open the panel.
4. Pick **Engine** (optional — server default is already selected).
5. Pick **Target** (micro:bit, Arcade, Maker), tick **Use current code** if you want to include your existing editor code as context.
6. Type a prompt and hit **Generate & Paste**.
7. If needed, click **Revert** to restore the previous code snapshot.

### Notes

* The client reads & writes the MakeCode editor via the page’s embedded Monaco instance.
* Model presets and access are fully controlled by the server (`/mcai/config` and `resolvePreset()` mapping).
* The panel is draggable and resizable. If you resize to full height, the feedback/log area remains scrollable.

---

## 2) `work.js` (bookmarklet)

### What it does

A compact “no-install” option:

* You store the script as a bookmark.
* Clicking the bookmark injects a tiny overlay to send your prompt to the server and paste the response.

### Configure

Open `work.js` and set:

```js
const BACKEND = "https://mcai.dev.tk.sg";
const APP_TOKEN = ""; // optional, only if your server requires it
```

> The **original** `work.js` asked the user for an API key and spoke directly to a model provider. In the new architecture the **server holds the key**, so you should **remove any API-key prompt** from `work.js` and just call your server’s `/mcai/generate`.

### Make it a bookmarklet

1. Minify or wrap `work.js` like:

   ```html
   javascript:(()=>{ /* paste minified work.js here */ })();
   ```
2. Create a new bookmark and paste the whole line into the **URL** field.
3. On MakeCode, click the bookmark to open the overlay and use it.

---

## Endpoints the client calls

* `GET /mcai/config` — gets `{ activePreset, presets[] }` to populate the Engine dropdown.
* `POST /mcai/config` — sets `{ preset }` when you choose a different engine.
* `POST /mcai/generate` — body:

  ```json
  {
    "target": "microbit | arcade | maker",
    "request": "natural-language prompt",
    "currentCode": "optional, the code currently in the editor"
  }
  ```

---

## Troubleshooting

* **Panel appears but generation fails**

  * Open the browser console; look for messages like `Proxy error: OPENROUTER_API_KEY missing`.
    → Fix your server `.env` and restart the server.

* **CORS error in console**

  * Add your site to `CORS_ORIGINS` on the server (comma-separated) and restart.

* **“Unauthorized”**

  * Your server sets `SERVER_APP_TOKEN`. Put the same token in `APP_TOKEN` near the top of `client.js` (or `work.js`).

* **Buttons hidden / UI too tall**

  * Drag the panel by its header or resize from the bottom-right handle; the log area scrolls.

* **Engine list empty**

  * Ensure your server is reachable at `BACKEND` and returns presets at `/mcai/config`.
  * Check the network tab for the request/response.

---

## File map (client only)

```
client.js   # full-featured client panel (recommended)
work.js     # bookmarklet client (minimal)
```

That’s it—point the client to your server and you’re good to go.
