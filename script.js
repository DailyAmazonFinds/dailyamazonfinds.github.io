/* ============================================================
   BuySahi FINAL SCRIPT.JS (Homepage Only Version)
   Sheet2 columns:
   0: Product Name
   1: Price
   2: ImageURL
   3: Code
   4: Category
============================================================ */

/* -------------------------
   CONFIG
-------------------------- */
const SHEET_ID = "1Nnil4LOj5Fkr3O8zX7KLqleOLIi8-iy3GVKoOWug9bQ";
const SHEET_NAME = "Sheet2";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/1Nnil4LOj5Fkr3O8zX7KLqleOLIi8-iy3GVKoOWug9bQ/gviz/tq?tqx=out:json&sheet=Sheet2
`;

/* -------------------------
   GLOBALS
-------------------------- */
let ALL_PRODUCTS = [];
let CATEGORIES = {};
let SWIPERS = {};
let lastLoadedAt = 0;

/* -------------------------
   FIXED HOMEPAGE ORDER
-------------------------- */
const HOMEPAGE_ORDER = [
  "trending",
  "problem-solving",
  "home organisers",
  "insta trends",
  "kitchen"
];

/* Acceptable variations → normalize into the 5 final ones */
const CATEGORY_ALIASES = {
  "problem solving": "problem-solving",
  "problem-solving": "problem-solving",
  "home organizers": "home organisers",
  "home organizer": "home organisers",
  "home organize": "home organisers",
  "home organiser": "home organisers",
  "insta trend": "insta trends",
  "insta trends": "insta trends",
  "instagram": "insta trends",
  "kitchen bestseller": "kitchen",
  "kitchen bestsellers": "kitchen"
};

/* -------------------------
   HELPERS
-------------------------- */
const escapeHtml = (v) =>
  String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const s = (v) => (v || "").toString().toLowerCase();

const debounce = (fn, wait = 160) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
};

function safeCategory(cat) {
  cat = s(cat);
  return CATEGORY_ALIASES[cat] || cat;
}

function makeId(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safeUrl(u) {
  return (u || "#").toString().replaceAll("'", "\\'");
}

/* ============================================================
   LOAD PRODUCTS FROM GOOGLE SHEET
============================================================ */
async function loadProductsFromSheet() {
  try {
    const res = await fetch(SHEET_URL, { cache: "no-store" });
    const text = await res.text();

    // Strip GViz wrapper: google.visualization.Query.setResponse(...)
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table?.rows || [];

    // Sheet2: Product Name | Price | ImageURL | Code | Category
    ALL_PRODUCTS = rows.map((r) => {
      const c = r.c || [];
      const rawCat = c[4]?.v || "trending";

      return {
        title: c[0]?.v || "",
        price: c[1]?.v || "",
        image: c[2]?.v || "",
        // No ProductLink column in Sheet2 — keep placeholder for now
        link: "#",
        code: (c[3]?.v || "").toString(),
        desc: "", // no description column in Sheet2
        category: safeCategory(rawCat)
      };
    });

    CATEGORIES = groupByCategory(ALL_PRODUCTS);
    buildCarousels();

    lastLoadedAt = Date.now();
  } catch (err) {
    console.error("❌ Failed to load sheet:", err);
    showStatus("Sheet fetch failed. Check sharing & sheet name.", true);
  }
}

/* -------------------------
   GROUP BY CATEGORY
-------------------------- */
function groupByCategory(list) {
  const out = {};
  list.forEach((p) => {
    const cat = safeCategory(p.category);
    if (!out[cat]) out[cat] = [];
    out[cat].push(p);
  });
  return out;
}

/* ============================================================
   BUILD ONLY THE SELECTED HOMEPAGE CAROUSELS
============================================================ */
function buildCarousels() {
  const parent = document.getElementById("dynamicCarousels");
  if (!parent) return;

  parent.innerHTML = "";

  HOMEPAGE_ORDER.forEach((cat) => {
    if (CATEGORIES[cat]?.length) {
      addCarouselBlock(parent, cat, CATEGORIES[cat]);
    }
  });
}

/* Create 1 carousel block */
function addCarouselBlock(parent, cat, list) {
  const id = makeId(cat);

  parent.insertAdjacentHTML(
    "beforeend",
    `
    <section class="carousel-section" id="${id}">
      <h2>${escapeHtml(capitalize(cat))}</h2>
      <div class="swiper">
        <div class="swiper-wrapper" id="${id}Wrapper"></div>
        <div class="swiper-pagination"></div>
      </div>
    </section>
  `
  );

  const wrapper = document.getElementById(`${id}Wrapper`);
  if (!wrapper) return;

  list.forEach((p) => wrapper.insertAdjacentHTML("beforeend", slideMarkup(p)));

  // Reset existing swiper if exists
  if (SWIPERS[id]) {
    try {
      SWIPERS[id].destroy(true, true);
    } catch (e) {
      console.warn("Swiper destroy error:", e);
    }
  }

  // Initialize Swiper
  setTimeout(() => {
    SWIPERS[id] = new Swiper(`#${id} .swiper`, {
      slidesPerView: "auto",
      centeredSlides: true,
      loop: true,
      spaceBetween: 14,
      autoplay: {
        delay: 2600,
        disableOnInteraction: false
      },
      pagination: {
        el: `#${id} .swiper-pagination`,
        clickable: true
      }
    });
  }, 80);
}

function slideMarkup(p) {
  return `
    <div class="swiper-slide">
      <div class="card">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">
        <div class="card-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="price">₹${escapeHtml(p.price)}</p>
          <a href="${escapeHtml(p.link)}" target="_blank" class="buy-btn">Buy Now →</a>
        </div>
      </div>
    </div>
  `;
}

function capitalize(str = "") {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ============================================================
   SEARCH SYSTEM
============================================================ */
const searchDebounce = debounce((q) => applySearch(q), 160);

function applySearch(query) {
  const box = document.getElementById("suggestionsBox");
  query = s(query);

  if (!query) {
    if (box) box.style.display = "none";
    return;
  }

  const parts = query.split(/\s+/).filter(Boolean);

  // match name, code, category, price
  const results = ALL_PRODUCTS.filter((p) => {
    const hay = s(`${p.title} ${p.code} ${p.category} ${p.price}`);
    return parts.every((t) => hay.includes(t));
  });

  renderSuggestions(results);
}

/* Render dropdown */
function renderSuggestions(list) {
  const box = document.getElementById("suggestionsBox");
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<div class="suggestion-item">No results found</div>`;
    box.style.display = "block";
    positionSuggestionsBox();
    return;
  }

  box.innerHTML = list
    .slice(0, 12)
    .map(
      (p) => `
    <div class="suggestion-item" onclick="window.open('${safeUrl(p.link)}','_blank')">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}"/>
      <div class="suggestion-content">
        <div class="suggestion-title">${escapeHtml(p.title)}</div>
        <div class="suggestion-price">₹${escapeHtml(p.price)}</div>
      </div>
    </div>`
    )
    .join("");

  box.style.display = "block";
  positionSuggestionsBox();
}

/* Position dropdown under search bar */
function positionSuggestionsBox() {
  const input = document.getElementById("searchInput");
  const box = document.getElementById("suggestionsBox");
  if (!input || !box) return;

  const rect = input.getBoundingClientRect();
  box.style.top = rect.bottom + 6 + "px";
}

/* Close on outside click */
document.addEventListener("click", (e) => {
  const box = document.getElementById("suggestionsBox");
  if (!box) return;

  if (
    !e.target.closest(".search-wrap") &&
    !e.target.closest("#suggestionsBox")
  ) {
    box.style.display = "none";
  }
});

/* Update position on scroll/resize */
window.addEventListener("scroll", positionSuggestionsBox);
window.addEventListener("resize", positionSuggestionsBox);

/* ============================================================
   STATUS POPUP (Sheet refreshed, errors, etc.)
============================================================ */
function showStatus(msg, err = false) {
  let el = document.getElementById("fetchStatus");
  if (!el) {
    el = document.createElement("div");
    el.id = "fetchStatus";
    el.style.position = "fixed";
    el.style.bottom = "20px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 18px";
    el.style.borderRadius = "10px";
    el.style.zIndex = 99999;
    el.style.fontSize = "0.9rem";
    document.body.appendChild(el);
  }
  el.innerText = msg;
  el.style.background = err ? "rgba(200,50,50,0.9)" : "rgba(20,20,20,0.9)";
  el.style.color = "#fff";
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchDebounce(e.target.value);
      positionSuggestionsBox();
    });
  }

  loadProductsFromSheet();
});
