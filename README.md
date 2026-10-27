# Collectr – Card Variant Filter

A [Tampermonkey](https://www.tampermonkey.net/) userscript that filters card lists in the [Collectr](https://app.getcollectr.com/) web app by variant: Holofoil, Reverse Holofoil, Normal, 1st Edition, Unlimited and so on.

## Features

- **Banner above the card grid** with a checkbox for every variant on the page and a count of how many cards each has.
- **Floating dropdown** in the bottom-right corner with the same checkboxes, so the filter is always in reach while you scroll.
- **Quick buttons:** *Holo only*, *All*, *None*.
- **Remembers your choices** in `localStorage`. Variants it hasn't seen before are shown by default.
- Keeps working as more cards load (infinite scroll, the site's own filters, page changes).

Cards with no variant label (such as sealed products) are grouped under **Other / Sealed**.

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension for your browser.
2. Click the install link:
   **[collectr-variant-filter.user.js](https://raw.githubusercontent.com/kynrek/collectr-variant-filter/main/collectr-variant-filter.user.js)**
3. Tampermonkey opens an install page. Click **Install**.
4. Open or reload <https://app.getcollectr.com/>.

Tampermonkey checks this repo for updates automatically.

You can also install it from a userscript site:

- [Greasy Fork](https://greasyfork.org/en/scripts/602507-collectr-card-variant-filter)
- [OpenUserJS](https://openuserjs.org/scripts/kynrek/Collectr_%E2%80%93_Card_Variant_Filter)

## Settings

At the top of the script (Tampermonkey dashboard → the script → Edit):

| Setting | Default | What it does |
| --- | --- | --- |
| `SHOW_BANNER` | `true` | Set to `false` to hide the banner and use only the floating dropdown. |

If you change a setting, turn off automatic updates for the script in Tampermonkey (the script's **Settings** tab → **Check for updates**), or the next update will overwrite your change.

## Disclaimer

This is an unofficial, community-made script. It is not affiliated with, endorsed by, or supported by Collectr. It only changes what is shown in your own browser, and it may stop working if the Collectr site changes.

## License

[MIT](LICENSE)
