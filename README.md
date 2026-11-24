# 🌌 AnimeDex — Ultimate Anime & Character Discovery Portal

A high-performance, modern, cyberpunk-anime themed client application for searching characters, exploring seasonal trending anime, and saving personal favorites, powered in real-time by the official **AniList GraphQL API**.

---

## ✨ Features

- 🔐 **Dual Auth Flow:** Secure client-side authentication with session tracking (`localStorage` / `sessionStorage`), password visibility toggles, and instant demo quick-fill (`admin@gmail.com` / `123456`).
- 👥 **Character Explorer:** Real-time character search with full Japanese/English names, favorites count, and media appearance tags.
- 📈 **Trending Anime:** Real-time trending anime showcase with community ratings, episode counts, and genre tags.
- ❤️ **Personal Watchlist / Favorites:** Instant one-click bookmarking system persisted in local storage with a live navigation counter badge and toast notifications.
- 🔍 **Interactive Detail Modal:** Frosted glass overlay presenting high-resolution artwork, spoiler-free synopses, and direct links to official AniList profiles.
- ⚡ **Instant Search & Quick Tags:** Popular character tags (**Gojo**, **Luffy**, **Naruto**, **Levi**, **Zoro**, **Makima**, **Tanjiro**) for zero-latency queries.
- 🔄 **One-Click Refresh:** Dedicated refresh button with spinning icon animation to reload the latest anime data.
- 📱 **Fully Responsive:** Mobile-first layout with smooth transitions, custom scrollbars, and glassmorphism styling.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism), Vanilla JavaScript (ES6+, async/await, Fetch API).
- **Data Source:** [AniList GraphQL API v2](https://anilist.gitbook.io/anilist-apiv2-docs/).
- **Typography & Icons:** Google Fonts (`Poppins`, `Inter`), FontAwesome 6.5.2.

---

## 🚀 Getting Started

### Option 1: Direct Browser Launch
Open `login.html` directly in any modern browser (Chrome, Edge, Firefox, Brave).

### Option 2: Local HTTP Server
Run the provided `start_app.bat` or run via command line:

```bash
# Using Python
python -m http.server 8888

# Using Node.js
npx serve -p 8888
```

Then visit [http://localhost:8888/login.html](http://localhost:8888/login.html).

### Default Credentials
- **Email:** `admin@gmail.com`
- **Password:** `123456`
*(Or click the "Auto Fill" button on the sign-in screen)*

---

## 📂 Project Structure

```
AD-Anime-fixed/
│
├── login.html          # Sign-in portal (glassmorphism UI, demo auto-fill)
├── signup.html         # User registration with password validation
├── Login.css           # Authentication styling
├── Login.js            # Auth validator & session management
│
├── AD-Anime.html       # AnimeDex dashboard (tabs, search, cards, modal)
├── AD-Anime.css        # Responsive dark cyberpunk stylesheet
├── AD-Anime.js         # AniList GraphQL engine, favorites, and UI logic
│
├── start_app.bat       # Local dev server launcher
├── push_to_github.bat  # Automated GitHub deployment script
└── README.md           # Project documentation
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE). Data is provided by AniList.
