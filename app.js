// File: app.js

// 🔴 วาง URL ของ Google Apps Script Web App ของคุณที่นี่
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwpgBQFnsxK5zyz4gyLC3Fd3P-deXRzpH84RAQURGF_2-E1axMCvB84K9CJjPcK589Y/exec";

let globalHeaders = [];
let globalData = [];

// ดึงข้อมูลเมื่อโหลดหน้าเว็บครั้งแรก
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchSheetData();
});

// ฟังก์ชันดึงข้อมูลจาก Google Apps Script
async function fetchSheetData() {
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshText = document.getElementById("refresh-text");
  const masterGrid = document.getElementById("master-grid");

  // สถานะกำลังโหลด
  refreshBtn.disabled = true;
  refreshIcon.classList.add("animate-spin");
  refreshText.innerText = "กำลังอัปเดต...";

  try {
    const response = await fetch(GAS_WEB_APP_URL);
    const result = await response.json();

    if (result.error) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + result.error);
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

// 1. Render Master View (เน้น PO, ชื่อโครงการ, งบประมาณ)
function renderMasterGrid(data) {
  const masterGrid = document.getElementById("master-grid");

  if (data.length === 0) {
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-20 text-gray-400 bg-gray-900 rounded-2xl border border-gray-800">
        ไม่พบข้อมูลในระบบ
      </div>
    `;
    return;
  }

  masterGrid.innerHTML = data.map((item, index) => {
    const po = item["PO"] || "N/A";
    const projectName = item["ชื่อโครงการ"] || "ไม่ระบุชื่อโครงการ";
    const budget = item["งบประมาณโครงการ"] ? `${item["งบประมาณโครงการ"]} บาท` : "-";

    return `
      <div class="bg-gray-900 border border-gray-800 hover:border-blue-500/80 rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between group">
        <div>
          <div class="flex justify-between items-start mb-3 gap-2">
            <span class="bg-blue-950/80 text-blue-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border border-blue-800/50">
              PO: ${po}
            </span>
            <span class="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              งบ: ${budget}
            </span>
          </div>
          <h2 class="text-base font-medium text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-300 transition">
            ${projectName}
          </h2>
        </div>

        <button 
          onclick="openDetailModal(${index})"
          class="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-blue-600 text-gray-200 hover:text-white py-2.5 px-4 rounded-xl text-sm font-medium transition duration-200 shadow-sm"
        >
          <i data-lucide="eye" class="w-4 h-4"></i>
          ดูรายละเอียดทั้งหมด
        </button>
      </div>
    `;
  }).join("");

  lucide.createIcons();
}

// 2. Render Card Detail (แบ่งข้อมูลเป็น Sub-cards กลุ่มละ 4 คอลัมน์)
function openDetailModal(dataIndex) {
  const item = globalData[dataIndex];
  if (!item) return;

  document.getElementById("modal-po").innerText = `รายละเอียดโครงการ (PO: ${item["PO"] || 'N/A'})`;
  document.getElementById("modal-project").innerText = item["ชื่อโครงการ"] || "";

  // แบ่ง คอลัมน์ ออกเป็นกลุ่มละ 4 คอลัมน์ (ปรับตัวเลขได้ตามต้องการช่วง 3-5)
  const chunkSize = 4;
  const chunks = [];
  for (let i = 0; i < globalHeaders.length; i += chunkSize) {
    chunks.push(globalHeaders.slice(i, i + chunkSize));
  }

  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = chunks.map((chunkHeaders, cardIdx) => {
    // สร้างข้อความสำหรับการ Copy
    const copyText = chunkHeaders
      .map(col => `${col}: ${item[col] !== undefined && item[col] !== '' ? item[col] : '-'}`)
      .join('\n')
      .replace(/'/g, "\\'"); // escape single quotes

    return `
      <div class="relative bg-gray-800/80 border border-gray-700/80 rounded-xl p-4 transition-all shadow-sm">
        <!-- ปุ่ม Copy มุมบนขวาของการ์ดย่อย -->
        <button 
          onclick="copyCardText(this, \`${copyText}\`)"
          class="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white text-xs px-2.5 py-1.5 rounded-lg transition shadow"
          title="คัดลอกข้อมูลในการ์ดนี้"
        >
          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          <span>Copy</span>
        </button>

        <!-- แสดงข้อมูลคอลัมน์ใน Sub-card -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-16">
          ${chunkHeaders.map(header => {
            const val = item[header];
            const displayVal = (val !== undefined && val !== "") ? val : "-";
            return `
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-blue-400 mb-1">${header}</span>
                <div class="text-sm text-gray-200 bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 break-words whitespace-pre-wrap min-h-[40px]">
                  ${displayVal}
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

// ฟังก์ชันคัดลอกข้อความใน Sub-card
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
// File: app.js

// 1. Helper Function สำหรับตรวจสอบสถานะและส่งคืน Class สี + Badge HTML
function getMedicineStatusStyle(statusText) {
  if (!statusText) {
    return {
      badgeHtml: "",
      cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80"
    };
  }

  const status = statusText.toString().trim().toLowerCase();

  // 🟢 เงื่อนไข 1: มีคำว่า "รับยาแล้ว" (รองรับกรณีมี วันที่/เวลา ต่อท้าย)
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

  // 🟡 เงื่อนไข 2: ส่งไม่ครบ / รับยาบางส่วน / ขาดส่ง
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

  // ⚪ กรณีอื่นๆ
  return {
    badgeHtml: "",
    cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80"
  };
}


// 2. ปรับปรุงฟังก์ชัน renderMasterGrid ให้ดึงสถานะมาแสดงผล
function renderMasterGrid(data) {
  const masterGrid = document.getElementById("master-grid");

  if (!data || data.length === 0) {
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-20 text-gray-400 bg-gray-900 rounded-2xl border border-gray-800">
        ไม่พบข้อมูลในระบบ
      </div>
    `;
    return;
  }

  masterGrid.innerHTML = data.map((item, index) => {
    // ดึงค่าตาม Key คอลัมน์แบบยืดหยุ่น
    const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]) || "N/A";
    const projectName = getFieldValue(item, ["ชื่อโครงการ", "โครงการ", "รายการ", "ชื่อรายการ"]) || "ไม่ระบุชื่อโครงการ";
    const budgetVal = getFieldValue(item, ["งบประมาณโครงการ", "งบประมาณ", "จำนวนเงิน", "วงเงิน"]);
    const budget = budgetVal ? `${budgetVal} บาท` : "-";

    // ดึงค่าสถานะรับยา
    const statusText = getFieldValue(item, ["สถานะรับยา", "สถานะการรับยา", "สถานะยา", "สถานะ", "Status"]) || "";
    
    // คำนวณ Style การ์ดและ Badge จากสถานะรับยา
    const { badgeHtml, cardStyle } = getMedicineStatusStyle(statusText);

    return `
      <div class="${cardStyle} border rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between group relative overflow-hidden">
        
        <div>
          <!-- Header Card: PO, Badge สถานะยา, และ งบประมาณ -->
          <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div class="flex items-center gap-2">
              <span class="bg-blue-950/80 text-blue-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border border-blue-800/50">
                PO: ${po}
              </span>
              <!-- ป้ายกำกับสถานะรับยา (ถ้ามี) -->
              ${badgeHtml}
            </div>

            <span class="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              งบ: ${budget}
            </span>
          </div>

          <!-- ชื่อโครงการ/รายการ -->
          <h2 class="text-base font-medium text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-300 transition">
            ${projectName}
          </h2>

          <!-- แสดงข้อความสถานะรับยาฉบับเต็มด้านล่างชื่อโครงการ (ถ้ามี) -->
          ${statusText ? `
            <div class="mt-2 text-xs text-gray-400 flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5">
              <i data-lucide="info" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0"></i>
              <span class="truncate">${statusText}</span>
            </div>
          ` : ''}
        </div>

        <!-- ปุ่มดูรายละเอียด -->
        <button 
          onclick="openDetailModal(${index})"
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
                
