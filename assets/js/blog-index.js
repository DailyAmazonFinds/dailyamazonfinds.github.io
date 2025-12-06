// assets/js/blog-index.js

(function () {
  const POSTS_JSON = "/blog/posts.json";
  const pageSize = 10;

  let POSTS = [];
  let filtered = [];
  let categories = new Set();
  let currentPage = 1;

  const postList = document.getElementById("postList");
  const chips = document.getElementById("categoryChips");
  const searchInput = document.getElementById("blogSearch");
  const pagination = document.getElementById("pagination");

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  function debounce(fn, wait = 220) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  async function loadPosts() {
    try {
      const res = await fetch(POSTS_JSON, { cache: "no-store" });
      POSTS = await res.json();
      POSTS.sort((a, b) => new Date(b.date) - new Date(a.date));

      POSTS.forEach((p) => (p.categories || []).forEach((c) => categories.add(c)));

      buildChips();
      applyFilters();
    } catch (err) {
      console.error("Failed to load posts.json", err);
      postList.innerHTML = `<p class="empty">Unable to load posts.</p>`;
    }
  }

  function buildChips() {
    chips.innerHTML = `<button class="chip active" data-cat="all">All</button>`;
    Array.from(categories)
      .sort()
      .forEach((c) => {
        const safe = escapeHtml(c);
        chips.insertAdjacentHTML(
          "beforeend",
          `<button class="chip" data-cat="${safe}">${escapeHtml(capitalize(c))}</button>`
        );
      });

    chips.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");

      const cat = btn.dataset.cat;
      filterByCategory(cat);
    });
  }

  function filterByCategory(cat) {
    const q = (searchInput.value || "").trim().toLowerCase();
    let list = POSTS.slice();

    if (cat !== "all") {
      list = list.filter((p) =>
        (p.categories || [])
          .map((x) => x.toLowerCase())
          .includes(cat.toLowerCase())
      );
    }

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((p) => {
        const hay = `${p.title} ${p.excerpt} ${(p.categories || []).join(" ")}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      });
    }

    filtered = list;
    currentPage = 1;
    render();
  }

  const applyFilters = debounce(() => filterByCategory(getActiveCategory()), 200);

  function getActiveCategory() {
    const active = chips.querySelector(".chip.active");
    return active ? active.dataset.cat : "all";
  }

  function render() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const page = filtered.slice(start, start + pageSize);

    if (!page.length) {
      postList.innerHTML = `<p class="empty">No posts found.</p>`;
    } else {
      postList.innerHTML = page
        .map((p) => {
          const d = new Date(p.date);
          const dateLabel = isNaN(d) ? escapeHtml(p.date) : d.toLocaleDateString();
          return `
          <article class="post-card">
            <a class="thumb" href="${escapeHtml(p.url)}">
              <img loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">
            </a>
            <div class="meta">
              <a class="title" href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a>
              <div class="meta-row">
                <time datetime="${escapeHtml(p.date)}">${dateLabel}</time>
                <span class="cats">${(p.categories || [])
                  .slice(0, 2)
                  .map((c) => escapeHtml(c))
                  .join(", ")}</span>
              </div>
              <p class="excerpt">${escapeHtml(p.excerpt || "")}</p>
            </div>
          </article>
        `;
        })
        .join("");
    }

    let pagHtml = "";
    for (let i = 1; i <= totalPages; i++) {
      pagHtml += `<button class="page ${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
    }
    pagination.innerHTML = pagHtml;
    pagination.querySelectorAll(".page").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentPage = parseInt(btn.dataset.page, 10);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
    );
  }

  searchInput.addEventListener("input", applyFilters);

  loadPosts();
})();
