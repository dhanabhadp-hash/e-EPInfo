// File: app.js
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyIPo5TKOxHgrhZRlhWmt38XNdwU-1HzVNDDgw0oZmnm4FSM2ro6ZOrKei29ZJDgO7T/exec"; // <-- 🔴 แทนที่ด้วย URL ของคุณ

let globalHeaders = [];
let globalData = [];
let currentSearchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchSheetData();
  registerServiceWorker();
});

// ลงทะเบียน PWA Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('PWA Registered:', reg.scope))
        .catch(err => console.error('PWA Failed:', err));
    });
  }
}

// ดึงข้อมูลจาก Google Apps Script
async function fetchSheetData() {
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshText = document.getElementById("refresh-text");
  const masterGrid = document.getElementById("master-grid");

  refreshBtn.disabled = true;
  refreshIcon.classList.add("animate-spin");
  refreshText.innerText = "กำลังอัปเดต...";

  try {
    const response = await fetch(GAS_WEB_APP_URL, { redirect: 'follow' });
    const result = await response.json();

    if (result.error) {
      alert("เกิดข้อผิดพลาด: " + result.error);
      return;
    }

    globalHeaders = result.headers || [];
    globalData = result.data || [];

    renderMasterGrid(globalData);
  } catch (error) {
    console.error("Fetch Error:", error);
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-12 text-red-400 bg-red-950/20 border border-red-900 rounded-2xl">
        ไม่สามารถดึงข้อมูลได้ กรุณาตรวจสอบ URL ของ Apps Script หรือการตั้งค่า Deployment
      </div>
    `;
  } finally {
    refreshBtn.disabled = false;
    refreshIcon.classList.remove("animate-spin");
    refreshText.innerText = "ดึงข้อมูล / รีเฟรช";
  }
}

// ฟังก์ชันช่วยค้นหา Key ใน Object แบบยืดหยุ่น
function getFieldValue(item, possibleKeys) {
  const itemKeys = Object.keys(item);
  for (const targetKey of possibleKeys) {
    const foundKey = itemKeys.find(k => 
      k.trim().toLowerCase() === targetKey.trim().toLowerCase() ||
      k.trim().toLowerCase().includes(targetKey.trim().toLowerCase())
    );
    if (foundKey && item[foundKey] !== undefined && item[foundKey] !== "") {
      return item[foundKey];
    }
  }
  return null;
}

// ฟังก์ชันตรวจสอบสถานะรับยาและกำหนดสไตล์ Card / Badge
function getMedicineStatusStyle(statusText) {
  if (!statusText) {
    return { badgeHtml: "", cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80" };
  }

  const status = statusText.toString().trim().toLowerCase();

  if (status.includes("รับยาแล้ว")) {
    return {
      badgeHtml: `
        <span class="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-sm">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          ยามาแล้ว
        </span>
      `,
      cardStyle: "bg-emerald-950/20 border-emerald-800/60 hover:border-emerald-400 shadow-emerald-950/20"
    };
  }

  if (status.includes("บางส่วน") || status.includes("ไม่ครบ") || status.includes("ขาด")) {
    return {
      badgeHtml: `
        <span class="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/30 shadow-sm">
          <span class="h-2 w-2 rounded-full bg-amber-400"></span>
          ยาส่งไม่ครบ
        </span>
      `,
      cardStyle: "bg-amber-950/20 border-amber-800/60 hover:border-amber-400 shadow-amber-950/20"
    };
  }

  return { badgeHtml: "", cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80" };
}

// ฟังก์ชันไฮไลท์คำค้นหา (Ctrl+F Style)
function highlightText(text, query) {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, `<mark class="bg-yellow-400 text-gray-950 font-bold px-0.5 rounded">$1</mark>`);
}

// ฟังก์ชันค้นหาข้อมูลแบบ Ctrl+F บนหน้าเว็บ
function handleSearch(query) {
  currentSearchQuery = query.trim().toLowerCase();
  
  if (!currentSearchQuery) {
    renderMasterGrid(globalData);
    return;
  }

  // ค้นหาในทุก Field ของแต่ละแถว
  const filtered = globalData.filter(item => {
    return Object.values(item).some(val => 
      String(val).toLowerCase().includes(currentSearchQuery)
    );
  });

  renderMasterGrid(filtered, currentSearchQuery);
}

function clearSearch() {
  document.getElementById("search-input").value = "";
  currentSearchQuery = "";
  renderMasterGrid(globalData);
}

// Render Master View พร้อมรองรับการไฮไลท์
function renderMasterGrid(data, searchQuery = "") {
  const masterGrid = document.getElementById("master-grid");
  document.getElementById("total-count").innerText = data.length;

  if (!data || data.length === 0) {
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-20 text-gray-400 bg-gray-900 rounded-2xl border border-gray-800">
        ไม่พบข้อมูลที่ตรงกับการค้นหา
      </div>
    `;
    return;
  }

  masterGrid.innerHTML = data.map((item) => {
    // หา Index จริงใน globalData เพื่อใช้อ้างอิงตอนกดดู Detail
    const originalIndex = globalData.findIndex(d => d._id === item._id);

    const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]) || "N/A";
    const projectName = getFieldValue(item, ["ชื่อโครงการ", "โครงการ", "รายการ", "ชื่อรายการ"]) || "ไม่ระบุชื่อโครงการ";
    const budgetVal = getFieldValue(item, ["งบประมาณโครงการ", "งบประมาณ", "จำนวนเงิน", "วงเงิน"]);
    const budget = budgetVal ? `${budgetVal} บาท` : "-";
    const statusText = getFieldValue(item, ["สถานะรับยา", "สถานะการรับยา", "สถานะยา", "สถานะ", "Status"]) || "";

    const { badgeHtml, cardStyle } = getMedicineStatusStyle(statusText);

    // ตรวจสอบว่า Card นี้ตรงกับคำค้นหาหรือไม่ เพื่อทำ Highlight Card สีพิเศษ
    let isMatched = false;
    if (searchQuery) {
      isMatched = Object.values(item).some(val => String(val).toLowerCase().includes(searchQuery));
    }

    const highlightCardClass = isMatched ? "ring-2 ring-yellow-400 shadow-yellow-500/20" : "";

    return `
      <div class="${cardStyle} ${highlightCardClass} border rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between group relative overflow-hidden">
        <div>
          <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="bg-blue-950/80 text-blue-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border border-blue-800/50">
                PO: ${highlightText(po, searchQuery)}
              </span>
              ${badgeHtml}
            </div>
            <span class="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              งบ: ${highlightText(budget, searchQuery)}
            </span>
          </div>

          <h2 class="text-base font-medium text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-300 transition">
            ${highlightText(projectName, searchQuery)}
          </h2>

          ${statusText ? `
            <div class="mt-2 text-xs text-gray-400 flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5">
              <i data-lucide="info" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0"></i>
              <span class="truncate">${highlightText(statusText, searchQuery)}</span>
            </div>
          ` : ''}
        </div>

        <button 
          onclick="openDetailModal(${originalIndex})"
          class="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800/90 hover:bg-blue-600 text-gray-200 hover:text-white py-2.5 px-4 rounded-xl text-sm font-medium transition duration-200 shadow-sm"
        >
          <i data-lucide="eye" class="w-4 h-4"></i>
          ดูรายละเอียดทั้งหมด
        </button>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

// Modal Detail & Sub-cards Chunking
function openDetailModal(dataIndex) {
  const item = globalData[dataIndex];
  if (!item) return;

  document.getElementById("modal-po").innerText = `รายละเอียดโครงการ (PO: ${getFieldValue(item, ["PO"]) || 'N/A'})`;
  document.getElementById("modal-project").innerText = getFieldValue(item, ["ชื่อโครงการ"]) || "";

  const chunkSize = 4;
  const chunks = [];
  for (let i = 0; i < globalHeaders.length; i += chunkSize) {
    chunks.push(globalHeaders.slice(i, i + chunkSize));
  }

  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = chunks.map((chunkHeaders) => {
    const copyText = chunkHeaders
      .map(col => `${col}: ${item[col] !== undefined && item[col] !== '' ? item[col] : '-'}`)
      .join('\n')
      .replace(/'/g, "\\'");

    return `
      <div class="relative bg-gray-800/80 border border-gray-700/80 rounded-xl p-4 transition-all shadow-sm">
        <button 
          onclick="copyCardText(this, \`${copyText}\`)"
          class="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition shadow"
          title="คัดลอกข้อมูลในการ์ดนี้"
        >
          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          <span>Copy</span>
        </button>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-16">
          ${chunkHeaders.map(header => {
            const val = item[header];
            const displayVal = (val !== undefined && val !== "") ? val : "-";
            return `
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-blue-400 mb-1">${header}</span>
                <div class="text-sm text-gray-200 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 break-words whitespace-pre-wrap min-h-[40px]">
                  ${highlightText(displayVal, currentSearchQuery)}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("detail-modal").classList.remove("hidden");
  lucide.createIcons();
}

function closeModal() {
  document.getElementById("detail-modal").classList.add("hidden");
}

function copyCardText(btnElement, textToCopy) {
  navigator.clipboard.writeText(textToCopy).then(() => {
    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = `
      <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>
      <span class="text-emerald-400 font-medium">คัดลอกแล้ว</span>
    `;
    lucide.createIcons();

    setTimeout(() => {
      btnElement.innerHTML = originalHTML;
      lucide.createIcons();
    }, 2000);
  });
}