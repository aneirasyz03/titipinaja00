# 🧺 Titip Dulu ♡

**your little pondok visit-day buddy**

A practical (and cute) web app for students living in Islamic boarding schools / pondok pesantren to prepare their shopping & request list before family visiting day (*penjengukan*).

---

## Features

- 🛍️ Browse products by category (jajanan, Indomaret, toiletries, ATK, pakaian, keperluan pondok, electronics, personal needs, **Shopee Finds**, cute stuff, daily needs…)
- ➕ Add items with quantity controls
- ✨ Custom items with note
- 🛍️ **Titip dari Shopee** — paste link produk + nama + jumlah + catatan + estimasi harga
- 💸 Budget mode + remaining budget indicator
- ⭐ Favorites / “my usuals”
- 🔁 Repeat last visit list
- 🎲 Surprise me (random recommendations from the dataset)
- 👀 “Did you forget something?” friendly checklist
- 🧺 Visit day countdown (date + time)
- 💌 Share list with parents (copy / Web Share API) — termasuk link Shopee
- ☑ Packing / received progress
- 📱 Mobile-first with bottom navigation
- 💾 Everything saved in **localStorage** — no backend needed

---

## Important: Prices

Prices in `data/products.json` are **static estimates** only.

They are **not** live prices from Indomaret, Alfamart, or any store.

- Prices may vary by store, location, promotion, and date.
- Users can edit any price locally.
- Custom items let you enter the exact price yourself.

---

## Tech

- Pure HTML / CSS / JavaScript
- Static JSON data
- `localStorage` for all user data
- Works on **GitHub Pages** (relative paths, no server required)

---

## File structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── products.json
│   ├── categories.json
│   └── settings.json
├── assets/
│   ├── icons/
│   └── images/
└── README.md
```

---

## How to run locally

Just open `index.html` in a browser, or use any static server:

```bash
# example
npx serve .
```

For GitHub Pages: push this folder to a repository and enable Pages (root or `/docs`).

---

## Design

- Cream background `#FFF8F2`
- Soft pink accents `#F4C7CE` / `#D98C9A`
- Baby blue & soft gold as supporting accents
- Warm, personal, Gen-Z pondok girl vibe
- Not a corporate shop, not a template dashboard

---

## License

Feel free to use and adapt for personal / educational purposes.

Made with ♡ for pondok kids before Mama comes.
