// File: app.js

// 🔴 1. ใส่ URL ของ Google Apps Script Web App ที่ลงท้ายด้วย /exec
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwpgBQFnsxK5zyz4gyLC3Fd3P-deXRzpH84RAQURGF_2-E1axMCvB84K9CJjPcK589Y/exec";

let globalHeaders = [];
let globalData = [];

// 2. เริ่มทำงานเมื่อโหลดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchSheetData();
});

// ==========================================
// ส่วนที่ 1: การดึงข้อมูล (Fetch Data) & Error Handling
// ==========================================
async function fetchSheetData() {
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshText = document.getElementById("refresh-text");
  const masterGrid = document.getElementById("master-grid");

  // แสดงสถานะกำลังโหลด
  refreshBtn.disabled = true;
  refreshIcon.classList.add("animate-spin");
  refreshText.innerText = "กำลังอัปเดต...";

  try {
    // ใช้ redirect: 'follow' เพื่อรองรับการเปลี่ยนเส้นทางของ Google
    const response = await fetch(GAS_WEB_APP_URL, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`HTTP Status Error: ${response.status}`);
    }

    // ป้องกันกรณี Apps Script ติดสิทธิ์การเข้าถึง (จะส่งกลับมาเป็นหน้าเว็บ HTML แทน JSON)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("สิทธิ์การเข้าถึงไม่ถูกต้อง! กรุณาตั้งค่า 'Who has access' ใน Apps Script เป็น 'Anyone'");
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Apps Script Error: ${result.error}`);
    }

    globalHeaders = result.headers || [];
    globalData = result.data || [];

    renderMasterGrid(globalData);
  } catch (error) {
    console.error("Fetch Data Error Details:", error);
    
    // แสดง Error ที่ชัดเจนให้ผู้ใช้ทราบ
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-10 px-4 text-red-400 bg-red-950/30 border border-red-900/80 rounded-2xl shadow-lg">
        <i data-lucide="alert-triangle" class="w-10 h-10 mx-auto mb-3 text-red-400 animate-bounce"></i>
        <p class="font-semibold text-base mb-1">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
        <p class="text-xs text-red-300 font-mono bg-black/40 py-2 px-3 rounded-lg my-2 inline-block max-w-full overflow-x-auto">
          ${error.message}
        </p>
        <p class="text-xs text-gray-400 mt-2">
          กรุณาตรวจสอบ URL ของ Apps Script และการตั้งค่า Deploy (Who has access = Anyone)
        </p>
      </div>
    `;
    lucide.createIcons();
  } finally {
    // คืนค่าปุ่มกลับสู่สถานะปกติ
    refreshBtn.disabled = false;
    refreshIcon.classList.remove("animate-spin");
    refreshText.innerText = "ดึงข้อมูล / รีเฟรช";
  }
}

// ==========================================
// ส่วนที่ 2: Helper Functions (เครื่องมือช่วยประมวลผล)
// ==========================================

// 2.1 ค้นหาชื่อคอลัมน์แบบยืดหยุ่น (ป้องกันชื่อคอลัมน์เพี้ยน)
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

// 2.2 ตรวจสอบสถานะและส่งคืน Class สี + Badge HTML ของการ์ด
function getMedicineStatusStyle(statusText) {
  if (!statusText) {
    return {
      badgeHtml: "",
      cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80"
    };
  }

  const status = statusText.toString().trim().toLowerCase();

  // 🟢 เงื่อนไข: รับยาแล้ว
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

  // 🟡 เงื่อนไข: ส่งไม่ครบ / บางส่วน
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

// ==========================================
// ส่วนที่ 3: การแสดงผล UI (Rendering)
// ==========================================

// 3.1 Render Master View (หน้าการ์ดหลัก)
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

    // ดึงค่าสถานะรับยาเพื่อใช้เปลี่ยนสี
    const statusText = getFieldValue(item, ["สถานะรับยา", "สถานะการรับยา", "สถานะยา", "สถานะ", "Status"]) || "";
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
              ${badgeHtml}
            </div>

            <span class="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              งบ: ${budget}
            </span>
          </div>

          <!-- ชื่อโครงการ -->
          <h2 class="text-base font-medium text-gray-100 mb-2 line-clamp-2 group-hover:text-blue-300 transition">
            ${projectName}
          </h2>

          <!-- แสดงข้อความสถานะแบบเต็ม (ถ้ามี) -->
          ${statusText ? `
            <div class="mt-2 text-xs text-gray-400 flex items-center gap-1.5 bg-black/20 p-2 rounded-lg border border-white/5">
              <i data-lucide="info" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0"></i>
              <span class="truncate">${statusText}</span>
            </div>
          ` : ''}
        </div>

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

// 3.2 Render Modal Detail (หน้าต่างรายละเอียด)
function openDetailModal(dataIndex) {
  const item = globalData[dataIndex];
  if (!item) return;

  const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]) || "N/A";
  const projectName = getFieldValue(item, ["ชื่อโครงการ", "โครงการ", "รายการ", "ชื่อรายการ"]) || "";

  document.getElementById("modal-po").innerText = `รายละเอียดโครงการ (PO: ${po})`;
  document.getElementById("modal-project").innerText = projectName;

  // แบ่งข้อมูลออกเป็นกลุ่มละ 4 คอลัมน์
  const chunkSize = 4;
  const chunks = [];
  for (let i = 0; i < globalHeaders.length; i += chunkSize) {
    chunks.push(globalHeaders.slice(i, i + chunkSize));
  }

  const modalBody = document.getElementById("modal-body");
  modalBody.innerHTML = chunks.map((chunkHeaders) => {
    // เตรียม Text สำหรับปุ่ม Copy
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

// 3.3 ปิด Modal
function closeModal() {
  document.getElementById("detail-modal").classList.add("hidden");
}

// 3.4 ฟังก์ชัน Copy ข้อความในการ์ดย่อย
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
