# Core Slider for Jellyfin

A custom featured content slider for Jellyfin Web, optimized for Desktop, Mobile, and LG WebOS TV.

<img src="/assets/images/logo.png" alt="Logo" width="85%" height="auto" />

> Tested on Jellyfin **10.10.7** and newer verions **10.11.x**.  
> Compatible with **ES5** (Support older Smart TV browsers - Starting from Web OS 2.0).

---

## About

The main goal of this slider was to work on **LG WebOS TV** with full remote control navigation.

---

## Features

- Displays random or curated via a `(file-name).txt` movies/series from your Jellyfin library
- Responsive layouts for Desktop, Mobile, and TV
- LG WebOS TV support with full remote control navigation
- Swipe/drag support with velocity-based slide detection
- Smart autoplay with bounce direction
- Autoplay pauses on drag and resets timer on manual navigation
- Automatic show/hide based on current page
- Trailers (Local and Youtube)
- Editable settings via native Jellyfin Plugin Dashboard
- Load the files via CDN or Local method
- Build-in themes

---

### Requirements

Core Slider requires the following plugin if your user does not have the right read/write permissions for the Jellyfin app.

- Plugin: [File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation)

---

## Installation

Core Slider can be a standalone Jellyfin plugin.

1. In Jellyfin, go to Dashboard > Plugins > Catalog > ⚙️
2. Click + and give the repository a name (e.g., "Core Slider Repo").
3. Set the Repository URL to:

Important

 - If you are on Jellyfin version **10.11.x**

```
https://raw.githubusercontent.com/Geo-ten/jellyfin-plugins/main/10.11/manifest.json
```

 - If you are on Jellyfin version **10.10.7**
```
https://raw.githubusercontent.com/Geo-ten/jellyfin-plugins/main/10.10/manifest.json
```

4. Restart your Jellyfin server.
5. *(Optional)* Go to **Dashboard > Core Slider** to adjust the settings.


## Local Files

If you don't want files directly from jsDelivr or the Github RAW.

Download the latest release [core-slider-vX.X.X.zip](https://github.com/Geo-ten/jellyfin-core-slider/releases) and copy the files into your Jellyfin Web assets folder.

Change from the **Dashboard > Core Slider**:

```
Load app files from CDN/Local > Local
```

Click **Save**

---
## Configuration

All configurations can now be managed directly from the **Jellyfin Dashboard**.
Navigate to **Dashboard > Core Slider** to access the UI settings page.


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
| Desktop | Arrows + Dots | Mouse drag | ✔ |
| Mobile | Dots | Touch swipe | ✔ |
| LG WebOS TV | Remote (⬅ ➡ ⬆ ⬇ 🆗 ⏪ ⏩ ▶ ⏸ ⏹) | Remote swipe | ✔ |

---

## LG WebOS TV - Remote Controls

| Button | Action |
|--------|--------|
| ⬅ | Previous slide |
| ➡ | Next slide |
| ⬆ | Go to header menu |
| ⬇ | Go to content below slider |
| 🆗 | Open item details |
| ▶ or ⏸ | Play / Pause the trailer |
| ⏪ | Backward the trailer (-15s) |
| ⏩ | Forward the trailer (+15s) |
| ⏹ | Un/Mute the trailer |

---

## Screenshots

### Default theme
<img src="/assets/images/screenshot-desktop.webp" alt="Desktop" width="800" />
<img src="/assets/images/screenshot-mobile.webp" alt="Mobile" width="300" />

### Wide theme
<img src="/assets/images/screenshot-desktop-wide.webp" alt="Desktop" width="800" />
<img src="/assets/images/screenshot-mobile-wide.webp" alt="Mobile" width="300" />

---

## Credits

- Inspired by and partially based on .js of [MakD/Jellyfin-Media-Bar](https://github.com/MakD/Jellyfin-Media-Bar)
- C# Inspired by [Namo2/InPlayerEpisodePreview](https://github.com/Namo2/InPlayerEpisodePreview)
- Built with ❤ by [Geoten](https://www.geoten.dev)

---

## License

<a target="_blank" href="/Geo-ten/jellyfin-core-slider/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg" alt="GPLv3">
</a>

This project is licensed under the [GPLv3 License](https://www.gnu.org/licenses/gpl-3.0).
