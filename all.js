/* ============================================
   BuySahi – All Products Grid Page
=============================================== */

const SHEET_ID = "1Nnil4LOj5Fkr3O8zX7KLqleOLIi8-iy3GVKoOWug9bQ";
const SHEET_NAME = "Sheet2";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;

let ALL_PRODUCTS = [];
let FILTERED_PRODUCTS = [];

/* Utility */
const s = (v) => (v || "").toString().toLowerCase();
function escapeHtml(v){
  return String(v||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

/* Load Sheet Data */
async function loadAllProducts(){
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0,-2));
  const rows = json.table?.rows || [];

  ALL_PRODUCTS = rows.map(r => {
    const c = r.c || [];
    return {
      title: c[0]?.v || "",
      price: c[1]?.v || "",
      image: c[2]?.v || "",
      link: c[3]?.v || "",
      code:  c[4]?.v || "",
      desc:  c[5]?.v || "",
      category: (c[6]?.v || "other").toLowerCase()
    };
  });

  buildCategoryChips();
  renderGrid(ALL_PRODUCTS);
}

/* Build Filter Chips */
function buildCategoryChips(){
  const chips = document.getElementById("filterChips");

  const uniqueCats = [...new Set(ALL_PRODUCTS.map(p => p.category))];

  uniqueCats.forEach(cat => {
    chips.insertAdjacentHTML("beforeend", `
      <button class="chip" data-category="${cat}">${cat}</button>
    `);
  });

  chips.addEventListener("click", (e) => {
    if(!e.target.classList.contains("chip")) return;

    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    e.target.classList.add("active");

    const cat = e.target.dataset.category;
    if(cat === "all"){
      renderGrid(ALL_PRODUCTS);
    } else {
      renderGrid(ALL_PRODUCTS.filter(p => p.category === cat));
    }
  });
}

/* Render Grid */
function renderGrid(list){
  const grid = document.getElementById("allProductsGrid");
  grid.innerHTML = "";

  if(list.length === 0){
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;opacity:0.6;">No products found</p>`;
    return;
  }

  list.forEach(p => {
    grid.insertAdjacentHTML("beforeend", `
      <div class="card">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">
        <h3>${escapeHtml(p.title)}</h3>
        <div class="price">₹${escapeHtml(p.price)}</div>
        <a href="${escapeHtml(p.link)}" target="_blank">Buy Now →</a>
      </div>
    `);
  });
}

/* Search */
document.getElementById("allSearchInput").addEventListener("input", (e)=>{
  const q = s(e.target.value);
  if(!q){ renderGrid(ALL_PRODUCTS); return; }

  const parts = q.split(/\s+/).filter(Boolean);

  const filtered = ALL_PRODUCTS.filter(p => {
    const hay = s(`${p.title} ${p.code} ${p.desc} ${p.category}`);
    return parts.every(t => hay.includes(t));
  });

  renderGrid(filtered);
});

/* Init */
loadAllProducts();
