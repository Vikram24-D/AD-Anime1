// =========================================================================
// AnimeDex Engine - High Performance Client Application
// Auth Guard, AniList GraphQL Client, Tab Switching, Favorites & Modals
// =========================================================================

(function () {
  "use strict";

  // ---- 1. Authentication Route Guard ----
  function isLoggedIn() {
    return (
      localStorage.getItem("isLoggedIn") === "true" ||
      sessionStorage.getItem("isLoggedIn") === "true"
    );
  }

  if (!isLoggedIn()) {
    window.location.replace("login.html");
    return;
  }

  // Load and display current user profile
  try {
    const rawUser = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
    const user = rawUser ? JSON.parse(rawUser) : { name: "Admin", role: "Administrator" };
    const nameEl = document.getElementById("user-name");
    const roleEl = document.getElementById("user-role");
    const avatarEl = document.getElementById("user-avatar");

    if (nameEl) nameEl.textContent = user.name || "Admin";
    if (roleEl) roleEl.textContent = user.role || "Administrator";
    if (avatarEl) avatarEl.textContent = (user.name || "A").charAt(0).toUpperCase();
  } catch (err) {
    console.warn("Could not parse user profile:", err);
  }

  // Logout action
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("isLoggedIn");
      sessionStorage.removeItem("isLoggedIn");
      localStorage.removeItem("currentUser");
      sessionStorage.removeItem("currentUser");
      window.location.href = "login.html";
    });
  }

  // ---- 2. Application State ----
  const state = {
    currentTab: "characters", // 'characters' | 'trending' | 'favorites'
    searchType: "characters", // 'characters' | 'anime'
    searchQuery: "",
    page: 1,
    hasMore: false,
    items: [],
    favorites: loadFavorites()
  };

  const ANILIST_URL = "https://graphql.anilist.co";

  // DOM Elements
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-search-btn");
  const typeSelect = document.getElementById("search-type");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const sectionTitle = document.getElementById("section-title");
  const resultsCount = document.getElementById("results-count");
  const sortSelect = document.getElementById("sort-select");
  const loadMoreWrap = document.getElementById("load-more-wrap");
  const loadMoreBtn = document.getElementById("load-more-btn");
  const favCountBadge = document.getElementById("fav-count");
  const modal = document.getElementById("detail-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const modalContent = document.getElementById("modal-content");
  const toastContainer = document.getElementById("toast-container");

  // ---- 3. AniList GraphQL Queries ----
  const QUERIES = {
    POPULAR_CHARACTERS: `
      query ($page: Int) {
        Page(page: $page, perPage: 12) {
          pageInfo { hasNextPage }
          characters(sort: FAVOURITES_DESC) {
            id
            name { full native }
            image { large }
            description
            favourites
            media(perPage: 1) {
              nodes { title { english romaji } }
            }
          }
        }
      }`,

    SEARCH_CHARACTERS: `
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 12) {
          pageInfo { hasNextPage }
          characters(search: $search) {
            id
            name { full native }
            image { large }
            description
            favourites
            media(perPage: 1) {
              nodes { title { english romaji } }
            }
          }
        }
      }`,

    TRENDING_ANIME: `
      query ($page: Int) {
        Page(page: $page, perPage: 12) {
          pageInfo { hasNextPage }
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title { english romaji native }
            coverImage { large extraLarge }
            description
            averageScore
            episodes
            genres
            siteUrl
          }
        }
      }`,

    SEARCH_ANIME: `
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 12) {
          pageInfo { hasNextPage }
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { english romaji native }
            coverImage { large extraLarge }
            description
            averageScore
            episodes
            genres
            siteUrl
          }
        }
      }`
  };

  // ---- 4. Helper Utilities ----
  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cleanDescription(text) {
    if (!text) return "No description available.";
    return text
      .replace(/~!.*?!~/gs, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[_*]{2}/g, "")
      .trim();
  }

  function showToast(message, icon = "fa-check") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:#38bdf8;"></i><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // ---- 5. Favorites Persistence ----
  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem("animedex_favorites") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem("animedex_favorites", JSON.stringify(state.favorites));
    updateFavBadge();
  }

  function updateFavBadge() {
    if (favCountBadge) {
      favCountBadge.textContent = state.favorites.length;
    }
  }

  function isFavorited(id, type) {
    return state.favorites.some(f => f.id === id && f.type === type);
  }

  function toggleFavorite(item, type) {
    const existsIndex = state.favorites.findIndex(f => f.id === item.id && f.type === type);
    const itemName = item.name?.full || item.title?.english || item.title?.romaji || "Item";

    if (existsIndex >= 0) {
      state.favorites.splice(existsIndex, 1);
      saveFavorites();
      showToast(`Removed "${itemName}" from favorites.`, "fa-heart-crack");
    } else {
      const favObj = {
        id: item.id,
        type: type,
        name: item.name,
        title: item.title,
        image: item.image || { large: item.coverImage?.large },
        coverImage: item.coverImage,
        description: item.description,
        favourites: item.favourites,
        averageScore: item.averageScore,
        episodes: item.episodes,
        genres: item.genres,
        media: item.media
      };
      state.favorites.unshift(favObj);
      saveFavorites();
      showToast(`Saved "${itemName}" to favorites!`, "fa-heart");
    }

    // Refresh hearts on screen
    document.querySelectorAll(`.fav-btn[data-id="${item.id}"][data-type="${type}"]`).forEach(btn => {
      btn.classList.toggle("favorited", isFavorited(item.id, type));
    });

    if (state.currentTab === "favorites") {
      renderFavorites();
    }
  }

  // ---- 6. GraphQL API Fetcher ----
  async function fetchAniList(query, variables = {}) {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("AniList rate limit reached. Please wait a minute and try again.");
      }
      throw new Error(`AniList server error (${response.status}).`);
    }

    const json = await response.json();
    if (json.errors) {
      throw new Error(json.errors[0]?.message || "GraphQL error");
    }

    return json.data?.Page;
  }

  // ---- 7. Data Loading Logic ----
  async function loadData(append = false) {
    if (!append) {
      state.page = 1;
      state.items = [];
      resultsEl.innerHTML = "";
      statusEl.style.display = "block";
      statusEl.textContent = "Summoning anime data from AniList...";
    }

    if (loadMoreWrap) loadMoreWrap.style.display = "none";

    try {
      let pageData;
      const isSearch = state.searchQuery.trim().length > 0;

      if (state.currentTab === "trending") {
        if (isSearch) {
          pageData = await fetchAniList(QUERIES.SEARCH_ANIME, {
            search: state.searchQuery,
            page: state.page
          });
        } else {
          pageData = await fetchAniList(QUERIES.TRENDING_ANIME, { page: state.page });
        }
      } else {
        // Characters tab
        if (isSearch) {
          if (state.searchType === "anime") {
            pageData = await fetchAniList(QUERIES.SEARCH_ANIME, {
              search: state.searchQuery,
              page: state.page
            });
          } else {
            pageData = await fetchAniList(QUERIES.SEARCH_CHARACTERS, {
              search: state.searchQuery,
              page: state.page
            });
          }
        } else {
          pageData = await fetchAniList(QUERIES.POPULAR_CHARACTERS, { page: state.page });
        }
      }

      statusEl.style.display = "none";

      const fetchedList = pageData.characters || pageData.media || [];
      state.hasMore = pageData.pageInfo?.hasNextPage || false;

      if (append) {
        state.items = state.items.concat(fetchedList);
      } else {
        state.items = fetchedList;
      }

      applySort();
      renderCards(state.items, append);

      // Update Header Text & Badge
      updateHeaderInfo();

      if (state.hasMore && loadMoreWrap) {
        loadMoreWrap.style.display = "flex";
      }
    } catch (err) {
      console.error(err);
      statusEl.style.display = "block";
      statusEl.textContent = `✕ ${err.message || "Could not connect to anime database."}`;
    }
  }

  function updateHeaderInfo() {
    if (state.currentTab === "favorites") {
      sectionTitle.textContent = "My Favorites & Watchlist";
      resultsCount.textContent = `${state.favorites.length} saved`;
      return;
    }

    const query = state.searchQuery.trim();
    if (state.currentTab === "trending") {
      sectionTitle.textContent = query ? `Anime Search: "${query}"` : "Trending Anime Shows";
    } else {
      sectionTitle.textContent = query ? `Search: "${query}"` : "Popular Anime Characters";
    }

    resultsCount.textContent = `${state.items.length} items`;
  }

  // ---- 8. Rendering Engine ----
  function renderCards(items, append = false) {
    if (!append) resultsEl.innerHTML = "";

    if (!items || items.length === 0) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-ghost empty-icon"></i>
          <h4>No results found</h4>
          <p>Try searching with another name or explore popular characters.</p>
        </div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const isAnime = Boolean(item.title);
      const type = isAnime ? "anime" : "character";
      const id = item.id;

      const title = isAnime
        ? (item.title.english || item.title.romaji || "Unknown Title")
        : (item.name.full || "Unknown Character");

      const nativeTitle = isAnime
        ? (item.title.native || item.title.romaji || "")
        : (item.name.native || "");

      const imgSrc = isAnime
        ? (item.coverImage?.large || item.coverImage?.extraLarge || "")
        : (item.image?.large || "");

      const desc = cleanDescription(item.description);
      const snippet = desc.length > 130 ? desc.substring(0, 130) + "..." : desc;

      const metric = isAnime
        ? (item.averageScore ? `★ ${item.averageScore}%` : "TV")
        : (item.favourites ? `♥ ${Number(item.favourites).toLocaleString()}` : "Top");

      const mediaBadge = !isAnime && item.media?.nodes?.[0]
        ? `<span class="media-tag" title="Appears in ${escapeHtml(item.media.nodes[0].title.english || item.media.nodes[0].title.romaji)}"><i class="fa-solid fa-tv" style="margin-right:4px;"></i>${escapeHtml(item.media.nodes[0].title.english || item.media.nodes[0].title.romaji)}</span>`
        : "";

      const card = document.createElement("div");
      card.className = "anime-card";
      card.innerHTML = `
        <div class="card-media">
          <img src="${imgSrc}" alt="${escapeHtml(title)}" class="card-img" loading="lazy" />
          <button type="button" class="fav-btn ${isFavorited(id, type) ? 'favorited' : ''}" 
                  data-id="${id}" data-type="${type}" title="Toggle Favorite">
            <i class="fa-solid fa-heart"></i>
          </button>
          <div class="metric-badge">${metric}</div>
        </div>
        <div class="card-content">
          ${mediaBadge}
          <div class="card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
          ${nativeTitle ? `<div class="card-native">${escapeHtml(nativeTitle)}</div>` : ''}
          <p class="card-snippet">${escapeHtml(snippet)}</p>
          <button type="button" class="btn-detail" data-id="${id}" data-type="${type}">
            <i class="fa-solid fa-circle-info"></i> View Details
          </button>
        </div>`;

      // Event: Favorite Heart Click
      const favBtn = card.querySelector(".fav-btn");
      favBtn.addEventListener("click", e => {
        e.stopPropagation();
        toggleFavorite(item, type);
      });

      // Event: Open Details Modal
      const detailBtn = card.querySelector(".btn-detail");
      detailBtn.addEventListener("click", () => openModal(item, type));
      card.addEventListener("click", e => {
        if (!e.target.closest(".fav-btn")) {
          openModal(item, type);
        }
      });

      fragment.appendChild(card);
    });

    resultsEl.appendChild(fragment);
  }

  function renderFavorites() {
    resultsEl.innerHTML = "";
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
    statusEl.style.display = "none";

    const filterQuery = state.searchQuery.trim().toLowerCase();
    let filtered = state.favorites;

    if (filterQuery) {
      filtered = state.favorites.filter(item => {
        const title = (item.title?.english || item.title?.romaji || item.name?.full || "").toLowerCase();
        return title.includes(filterQuery);
      });
    }

    updateHeaderInfo();

    if (filtered.length === 0) {
      resultsEl.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-heart-crack empty-icon"></i>
          <h4>No Favorites Saved Yet</h4>
          <p>Click the heart icon on any character or anime card to build your personalized watchlist!</p>
        </div>`;
      return;
    }

    renderCards(filtered, false);
  }

  // ---- 9. Detail Modal ----
  function openModal(item, type) {
    const isAnime = type === "anime" || Boolean(item.title);
    const title = isAnime
      ? (item.title?.english || item.title?.romaji || "Unknown Anime")
      : (item.name?.full || "Unknown Character");

    const nativeTitle = isAnime
      ? (item.title?.native || item.title?.romaji || "")
      : (item.name?.native || "");

    const imgSrc = isAnime
      ? (item.coverImage?.extraLarge || item.coverImage?.large || "")
      : (item.image?.large || "");

    const desc = cleanDescription(item.description);

    let badges = "";
    if (isAnime) {
      if (item.averageScore) badges += `<span class="modal-badge"><i class="fa-solid fa-star" style="color:#f59e0b; margin-right:4px;"></i>Score: ${item.averageScore}%</span>`;
      if (item.episodes) badges += `<span class="modal-badge"><i class="fa-solid fa-film" style="margin-right:4px;"></i>${item.episodes} Episodes</span>`;
      if (item.genres) {
        item.genres.slice(0, 3).forEach(g => {
          badges += `<span class="modal-badge">${escapeHtml(g)}</span>`;
        });
      }
    } else {
      if (item.favourites) badges += `<span class="modal-badge"><i class="fa-solid fa-heart" style="color:#ec4899; margin-right:4px;"></i>${Number(item.favourites).toLocaleString()} Favorites</span>`;
      if (item.media?.nodes?.[0]) {
        const mediaTitle = item.media.nodes[0].title.english || item.media.nodes[0].title.romaji;
        badges += `<span class="modal-badge"><i class="fa-solid fa-tv" style="margin-right:4px;"></i>${escapeHtml(mediaTitle)}</span>`;
      }
    }

    const anilistLink = item.siteUrl || (isAnime ? `https://anilist.co/anime/${item.id}` : `https://anilist.co/character/${item.id}`);

    modalContent.innerHTML = `
      <div class="modal-layout">
        <img src="${imgSrc}" alt="${escapeHtml(title)}" class="modal-poster" />
        <div class="modal-info">
          <h2>${escapeHtml(title)}</h2>
          ${nativeTitle ? `<div class="modal-native">${escapeHtml(nativeTitle)}</div>` : ''}
          <div class="modal-badges">${badges}</div>
          <div class="modal-desc">${escapeHtml(desc).replace(/\n/g, "<br>")}</div>
          <div class="modal-actions">
            <a href="${anilistLink}" target="_blank" rel="noopener noreferrer" class="modal-btn-anilist">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> View on AniList
            </a>
            <button type="button" class="btn-detail modal-fav-btn" style="width:auto; padding:10px 18px;">
              <i class="fa-solid fa-heart"></i> ${isFavorited(item.id, type) ? 'In Favorites' : 'Add to Favorites'}
            </button>
          </div>
        </div>
      </div>`;

    const modalFavBtn = modalContent.querySelector(".modal-fav-btn");
    modalFavBtn.addEventListener("click", () => {
      toggleFavorite(item, type);
      modalFavBtn.innerHTML = `<i class="fa-solid fa-heart"></i> ${isFavorited(item.id, type) ? 'In Favorites' : 'Add to Favorites'}`;
    });

    modal.style.display = "flex";
  }

  function closeModal() {
    if (modal) modal.style.display = "none";
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeModal();
    }
  });

  // ---- 10. Search & Filter Handlers ----
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      executeSearch();
    });
  }

  function executeSearch() {
    state.searchQuery = input.value.trim();
    state.searchType = typeSelect ? typeSelect.value : "characters";

    if (clearBtn) {
      clearBtn.style.display = state.searchQuery ? "block" : "none";
    }

    if (state.currentTab === "favorites") {
      renderFavorites();
    } else {
      loadData(false);
    }
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.style.display = "none";
      state.searchQuery = "";
      if (state.currentTab === "favorites") {
        renderFavorites();
      } else {
        loadData(false);
      }
    });
  }

  // Quick tag recommendation chips
  document.querySelectorAll(".tag-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const query = this.getAttribute("data-query");
      input.value = query;
      if (clearBtn) clearBtn.style.display = "block";
      if (typeSelect) typeSelect.value = "characters";
      executeSearch();
    });
  });

  // Refresh Button Handler
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async function () {
      const icon = this.querySelector("i");
      if (icon) icon.classList.add("spin-anim");
      this.disabled = true;

      showToast("Refreshing anime data...", "fa-arrows-rotate");

      try {
        if (state.currentTab === "favorites") {
          state.favorites = loadFavorites();
          renderFavorites();
        } else {
          await loadData(false);
        }
        showToast("Content refreshed successfully!", "fa-circle-check");
      } catch (err) {
        showToast("Could not refresh data.", "fa-circle-exclamation");
      } finally {
        setTimeout(() => {
          if (icon) icon.classList.remove("spin-anim");
          refreshBtn.disabled = false;
        }, 500);
      }
    });
  }

  // Sort dropdown
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      applySort();
      renderCards(state.items, false);
    });
  }

  function applySort() {
    const sortVal = sortSelect ? sortSelect.value : "popular";
    if (sortVal === "name") {
      state.items.sort((a, b) => {
        const titleA = a.name?.full || a.title?.english || a.title?.romaji || "";
        const titleB = b.name?.full || b.title?.english || b.title?.romaji || "";
        return titleA.localeCompare(titleB);
      });
    } else {
      state.items.sort((a, b) => {
        const valA = a.favourites || a.averageScore || 0;
        const valB = b.favourites || b.averageScore || 0;
        return valB - valA;
      });
    }
  }

  // Load More Pagination
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      state.page += 1;
      loadData(true);
    });
  }

  // Tab Switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-tab");
      if (state.currentTab === targetTab) return;

      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      state.currentTab = targetTab;
      state.page = 1;

      if (targetTab === "favorites") {
        renderFavorites();
      } else {
        loadData(false);
      }
    });
  });

  // ---- 11. Initial Application Boot ----
  updateFavBadge();
  loadData(false);

})();
