# Core Slider for Jellyfin

A custom featured content slider for Jellyfin Web, optimized for Desktop, Mobile, and LG WebOS TV.

> ⚠️ Tested on Jellyfin **10.10.7** — not tested on newer versions.  
> Requires **ES2017+** (compatible with older Smart TV browsers).

---

## About

The main goal of this slider was to work on **LG WebOS TV** with full remote control navigation, since [MakD's Jellyfin-Media-Bar](https://github.com/MakD/Jellyfin-Media-Bar) already covers Desktop and Mobile very well.

For this reason, it was kept lightweight and with fewer details — more features will definitely be added over time.

---

## Features

- 🎬 Displays random or curated movies/series from your Jellyfin library
- 📱 Responsive — different layouts for Desktop, Mobile, and TV
- 🖥️ LG WebOS TV support with full remote control navigation
- 🖱️ Swipe/drag support with velocity-based slide detection
- ⏸️ Smart autoplay with bounce direction (reverses at end instead of looping)
- 🎯 Autoplay pauses on drag and resets timer on manual navigation
- 🔄 Automatic show/hide based on current page
- 📋 Support for custom curated lists via a `(file-name).txt` file

---

## Installation

### Step 1 — Install the JavaScript Injector Plugin

To inject custom JS/CSS into Jellyfin Web, install the [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) plugin.

1. In Jellyfin, go to **Dashboard → Plugins → Catalog → ⚙️**
2. Click **➕** and add a new repository:
   - **Name**: JavaScript Injector Repo
   - **URL** (for Jellyfin 10.10.7):
     ```
     https://raw.githubusercontent.com/n00bcodr/jellyfin-plugins/main/10.10/manifest.json
     ```
3. Click **Save**, go to **Catalog**, find **JavaScript Injector**, and click **Install**
4. Restart your Jellyfin server

---

### Step 2 — Add the slider files

#### How to add Core Slider in your Jellyfin

Go to the **JS Injector** from your dashboard, and create a new script.

- **Script Name**: (Whatever you like)

- **Section** `// Insert your custom JavaScript code here...`: (**Paste the code from the option A or B**)

Check the checkbox **Enabled** and **Requires Authentication**

And click **Save**


You have two options:

#### Option A — CDN via Github RAW (no download needed)

Use the files directly from Github RAW — always serves the latest version from `main`:

```javascript
(function() {
    'use strict';

    // Core Slider CSS
    const styleCoreSlider = document.createElement('link');
    styleCoreSlider.rel = 'stylesheet';
    styleCoreSlider.href = 'https://raw.githubusercontent.com/Geo-ten/jellyfin-core-slider/main/assets/css/core-slider.css';

    // Core Slider JS
    const scriptCoreSlider = document.createElement('script');
    scriptCoreSlider.async = true;
    scriptCoreSlider.src = 'https://raw.githubusercontent.com/Geo-ten/jellyfin-core-slider/main/assets/js/core-slider.js';

    // Custom core slider settings
    const scriptCoreSliderSettings = document.createElement('script');
    scriptCoreSliderSettings.textContent = `
        const coreSlider = {
            animationEffectTV: true,
            qualityBackdrop: 60,
            qualityLogo: 40,
            fileNameLocation: null,
            maxOverviewLength: 230,
            maxItems: 6,
            searchType: 'Movie,Series',
            slideButtonName: 'Show more',
            slideInterval: 12000,
            retryInterval: 1000,
            enableInfoPremiereDate: true,
            enableInfoGenre: true,
            enableInfoAgeRating: true,
            enableInfoRuntime: true,
            enableInfoStarRating: true,
        };
    `;
    
    // Add CSS to the head
    document.head.appendChild(styleCoreSlider);

    // Add scripts at the end of the body
    document.body.appendChild(scriptCoreSliderSettings);
    document.body.appendChild(scriptCoreSlider);
})();
```

---

#### Option B — Self-hosted

Download the latest release and copy the files into your Jellyfin Web assets folder:

```
/jellyfin-web/assets/js/core-slider.js
/jellyfin-web/assets/css/core-slider.css
```

Then inject via the plugin:

```javascript
(function() {
    'use strict';

    // Core Slider CSS
    const styleCoreSlider = document.createElement('link');
    styleCoreSlider.rel = 'stylesheet';
    styleCoreSlider.href = './assets/css/core-slider.css';

    // Core Slider JS
    const scriptCoreSlider = document.createElement('script');
    scriptCoreSlider.async = true;
    scriptCoreSlider.src = './assets/js/core-slider.js';

    // Custom core slider settings
    const scriptCoreSliderSettings = document.createElement('script');
    scriptCoreSliderSettings.textContent = `
        const coreSlider = {
            animationEffectTV: true,
            qualityBackdrop: 60,
            qualityLogo: 40,
            fileNameLocation: null,
            maxOverviewLength: 230,
            maxItems: 6,
            searchType: 'Movie,Series',
            slideButtonName: 'Show more',
            slideInterval: 12000,
            retryInterval: 1000,
            enableInfoPremiereDate: true,
            enableInfoGenre: true,
            enableInfoAgeRating: true,
            enableInfoRuntime: true,
            enableInfoStarRating: true,
        };
    `;
    
    // Add CSS to the head
    document.head.appendChild(styleCoreSlider);

    // Add scripts at the end of the body
    document.body.appendChild(scriptCoreSliderSettings);
    document.body.appendChild(scriptCoreSlider);
})();
```

---
## Configuration

Edit `const coreSlider` at the JavaScript Injector Plugin:

```javascript
    const coreSlider = {
        animationEffectTV: true,      // Keep the same animations effect on TV
        qualityBackdrop: 60,          // Backdrop image quality (0-100)
        qualityLogo: 40,              // Backdrop image quality (0-100)
        fileNameLocation: null,       // Path to custom list (null = random items | ex. '/assets/list.txt')
        maxOverviewLength: 230,       // Max overview text length (characters)
        maxItems: 6,                  // Max number of slides to fetch
        searchType: 'Movie,Series',   // Random searchable items
        slideButtonName: 'Show more', // The button name for the info link
        slideInterval: 12000,         // Autoplay interval in ms
        retryInterval: 1000,          // Retry in ms if ApiClient is not available
        enableInfoPremiereDate: true, // Enable in the item info the premiere date
        enableInfoGenre: true,        // Enable in the item info the genre
        enableInfoAgeRating: true,    // Enable in the item info the age rating
        enableInfoRuntime: true,      // Enable in the item info the runtime/seasons
        enableInfoStarRating: true,   // Enable in the item info the community rating
    };
```

---

## Custom Curated List

You can display specific items instead of random ones.

1. Create a `(file-name).txt` file in your Jellyfin web folder:

```
My Curated List
ItemID1
ItemID2
ItemID3
```

2. Set the path in settings:

```javascript
fileNameLocation: '/jellyfin-web/(folder-name)/(file-name).txt'
```

> Item IDs can be found in the URL when browsing an item in Jellyfin.

---

## Device Support

| Device | Navigation | Swipe | Autoplay |
|--------|-----------|-------|---------|
| Desktop | Arrows + Dots | Mouse drag | ✅ |
| Mobile | Dots | Touch swipe | ✅ |
| LG WebOS TV | Remote (← → ↑ ↓ OK) | — | ✅ |

---

## LG WebOS TV — Remote Controls

| Button | Action |
|--------|--------|
| ← | Previous slide |
| → | Next slide |
| ↑ | Go to header menu |
| ↓ | Go to content below slider |
| OK | Open item details |

---

## Screenshots

<img src="/assets/images/screenshot-desktop.jpg" alt="Desktop" width="800" />
<img src="/assets/images/screenshot-tv.jpg" alt="TV" width="800" />
<img src="/assets/images/screenshot-mobile.jpg" alt="Mobile" width="300" />

---

## Credits

- Inspired by and partially based on [MakD/Jellyfin-Media-Bar](https://github.com/MakD/Jellyfin-Media-Bar)
- Built with ❤️ by [Geoten](https://www.geoten.dev)

---

## License

<a target="_blank" href="/Geo-ten/jellyfin-core-slider/blob/main/LICENSE">
    <img src="https://camo.githubusercontent.com/34ad60f034ebedc21db449989367c463968859dff01288a40076d7a3d303c569/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c6963656e73652d446f6e27745f42655f415f4469636b2d726564" alt="DBAD License" data-canonical-src="https://img.shields.io/badge/License-Don't_Be_A_Dick-red" style="max-width: 100%;">
</a>

This project is licensed under the [DBAD License](https://dbad-license.org/) — same as the original project it derives from.

| | |
|---|---|
| ✅ Personal use | Allowed |
| ✅ Modifications | Allowed (contribute back) |
| ❌ Commercial use | Not allowed |
| ❌ Redistribution | Not allowed |
