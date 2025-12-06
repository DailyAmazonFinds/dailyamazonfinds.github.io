// assets/js/blog-product-injector.js

const BLOG_SHEET_ID = "1Nnil4LOj5Fkr3O8zX7KLqleOLIi8-iy3GVKoOWug9bQ";
const BLOG_SHEET_NAME = "Sheet2";
const BLOG_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${BLOG_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${BLOG_SHEET_NAME}`;

let BLOG_PRODUCTS = [];

async function loadBlogProducts() {
  try {
    const res = await fetch(BLOG_SHEET_URL);
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const rows = json.table.rows || [];

    BLOG_PRODUCTS = rows.map((r) => {
      const c = r.c || [];
      return {
        name: c[0]?.v || "",
        price: c[1]?.v || "",
        image: c[2]?.v || "",
        link: c[3]?.v || "",
        code: c[4]?.v || "",
        desc: c[5]?.v || "",
        category: (c[6]?.v || "").toLowerCase()
      };
    });

    injectBlogProducts();
  } catch (err) {
    console.error("Blog product load error:", err);
  }
}

function injectBlogProducts() {
  const blocks = document.querySelectorAll(".inject-products");
  blocks.forEach((block) => {
    const cat = (block.dataset.products || "").toLowerCase();
    const limit = parseInt(block.dataset.limit || "4", 10);

    const items = BLOG_PRODUCTS.filter((p) =>
      p.category.includes(cat)
    ).slice(0, limit);

    if (!items.length) {
      block.innerHTML = `<p style="opacity:0.7;font-size:0.9rem;">No products found for "${cat}".</p>`;
      return;
    }

    let html = `<div class="injected-grid">`;
    items.forEach((p) => {
      html += `
        <div class="injected-card">
          <img src="${p.image}" alt="${escapeHtml(p.name)}">
          <h3>${escapeHtml(p.name)}</h3>
          <div class="price">₹${escapeHtml(p.price)}</div>
          <a href="${p.link}" target="_blank" rel="noopener">Buy on Amazon →</a>
        </div>
      `;
    });
    html += `</div>`;
    block.innerHTML = html;
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", loadBlogProducts);
