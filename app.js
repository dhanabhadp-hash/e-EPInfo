/**
 * e-GP Info. Web Application - Main Application Logic
 */

// 🔴 1. วาง Web App URL จาก Google Apps Script (ลงท้ายด้วย /exec)
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwpgBQFnsxK5zyz4gyLC3Fd3P-deXRzpH84RAQURGF_2-E1axMCvB84K9CJjPcK589Y/exec";

let globalHeaders = [];
let globalData = [];

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();
  fetchSheetData();
});

// ==========================================
// 1. API & Data Fetching (พร้อมระบบกรอง ArrayFormula)
// ==========================================
async function fetchSheetData() {
  const refreshBtn = document.getElementById("refresh-btn");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshText = document.getElementById("refresh-text");
  const masterGrid = document.getElementById("master-grid");

  if (!masterGrid) return;

  if (refreshBtn) refreshBtn.disabled = true;
  if (refreshIcon) refreshIcon.classList.add("animate-spin");
  if (refreshText) refreshText.innerText = "กำลังอัปเดต...";

  try {
    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL")) {
      throw new Error("ยังไม่ได้กำหนดค่า GAS_WEB_APP_URL ในไฟล์ app.js");
    }

    const response = await fetch(GAS_WEB_APP_URL, { redirect: 'follow' });

    if (!response.ok) {
      throw new Error(`HTTP Status Error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("สิทธิ์การเข้าถึงไม่ถูกต้อง! กรุณาตั้งค่า 'Who has access' ใน Apps Script เป็น 'Anyone'");
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(`Apps Script Error: ${result.error}`);
    }

    globalHeaders = result.headers || [];
    
    // กรองเอาเฉพาะแถวที่มีข้อมูลจริง ตัดแถวว่างที่เกิดจาก ArrayFormula
    const rawData = result.data || [];
    globalData = rawData.filter(item => isValidRow(item));

    renderMasterGrid(globalData);

  } catch (error) {
    console.error("[e-GP App Error]:", error);
    
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-10 px-4 text-red-400 bg-red-950/30 border border-red-900/80 rounded-2xl shadow-lg backdrop-blur-sm">
        <i data-lucide="alert-triangle" class="w-10 h-10 mx-auto mb-3 text-red-400 animate-bounce"></i>
        <p class="font-semibold text-base mb-1">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
        <p class="text-xs text-red-300 font-mono bg-black/50 py-2 px-3 rounded-lg my-2 inline-block max-w-full overflow-x-auto border border-red-800/40">
          ${error.message}
        </p>
        <p class="text-xs text-gray-400 mt-2">
          กรุณาตรวจสอบ URL ของ Apps Script และการตั้งค่า Deployment (Who has access = Anyone)
        </p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
    if (refreshIcon) refreshIcon.classList.remove("animate-spin");
    if (refreshText) refreshText.innerText = "ดึงข้อมูล / รีเฟรช";
  }
}

// ==========================================
// 2. Helper Functions
// ==========================================

/**
 * ตรวจสอบว่าแถวนั้นมีข้อมูลจริงหรือไม่ (ตัดแถวว่างจากสูตร ArrayFormula)
 */
function isValidRow(item) {
  if (!item) return false;
  
  const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]);
  const detail = getFieldValue(item, ["รายละเอียด", "รายละเอียดโครงการ", "รายการ", "ชื่อโครงการ", "โครงการ"]);
  
  const hasPo = po !== null && String(po).trim() !== "" && String(po).trim() !== "-";
  const hasDetail = detail !== null && String(detail).trim() !== "" && String(detail).trim() !== "-";

  return hasPo || hasDetail;
}

/**
 * ดึงค่าข้อมูลจาก Object ตามรายชื่อคอลัมน์ที่เป็นไปได้ (Flexible Column Mapping)
 */
function getFieldValue(item, possibleKeys) {
  if (!item) return null;
  const itemKeys = Object.keys(item);
  for (const targetKey of possibleKeys) {
    const foundKey = itemKeys.find(k => 
      k.trim().toLowerCase() === targetKey.trim().toLowerCase() ||
      k.trim().toLowerCase().includes(targetKey.trim().toLowerCase())
    );
    if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null && item[foundKey] !== "") {
      return item[foundKey];
    }
  }
  return null;
}

/**
 * วิเคราะห์สถานะรับ-ส่งยา และส่งคืน Style, Badge HTML และ Text Color
 */
function getMedicineStatusStyle(statusText) {
  if (!statusText) {
    return {
      badgeHtml: "",
      cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80",
      textColor: "text-gray-100"
    };
  }

  const status = statusText.toString().trim().toLowerCase();

  // 1. 🔵 ส่งยาแล้ว
  if (status.includes("ส่งยาแล้ว") || status.includes("จัดส่งแล้ว")) {
    return {
      badgeHtml: `
        <span class="inline-flex items-center gap-1.5 bg-sky-500/15 text-sky-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-sky-500/40 shadow-sm backdrop-blur-md">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
          </span>
          <i data-lucide="truck" class="w-3.5 h-3.5"></i>
          ส่งยาแล้ว
        </span>
      `,
      cardStyle: "bg-sky-950/30 border-sky-700/60 hover:border-sky-400 shadow-lg shadow-sky-950/40",
      textColor: "text-sky-100 font-semibold"
    };
  }

  // 2. 🟢 รับยาแล้ว
  if (status.includes("รับยาแล้ว")) {
    return {
      badgeHtml: `
        <span class="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-sm backdrop-blur-md">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
          รับยาแล้ว
        </span>
      `,
      cardStyle: "bg-emerald-950/25 border-emerald-700/60 hover:border-emerald-400 shadow-lg shadow-emerald-950/30",
      textColor: "text-emerald-100 font-semibold"
    };
  }

  // 3. 🟡 ยาส่งไม่ครบ
  if (status.includes("บางส่วน") || status.includes("ไม่ครบ") || status.includes("ขาด")) {
    return {
      badgeHtml: `
        <span class="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-500/40 shadow-sm backdrop-blur-md">
          <span class="h-2 w-2 rounded-full bg-amber-400"></span>
          <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i>
          ยาส่งไม่ครบ
        </span>
      `,
      cardStyle: "bg-amber-950/25 border-amber-700/60 hover:border-amber-400 shadow-lg shadow-amber-950/30",
      textColor: "text-amber-100 font-semibold"
    };
  }

  // 4. ⚪ สถานะทั่วไป
  return {
    badgeHtml: "",
    cardStyle: "bg-gray-900 border-gray-800 hover:border-blue-500/80",
    textColor: "text-gray-100"
  };
}

/**
 * 💡 [ฟังก์ชันใหม่]: ตรวจสอบคอลัมน์ "สถานะตรวจรับ"
 * หากพบข้อความมีคำว่า "ตรวจรับเรียบร้อย" ให้ส่งคืน Badge HTML ป้ายกำกับตรวจรับเรียบร้อย
 */
function getAcceptanceStatusBadge(acceptanceStatusText) {
  if (!acceptanceStatusText) return "";

  const status = acceptanceStatusText.toString().trim().toLowerCase();

  if (status.includes("ตรวจรับเรียบร้อย")) {
    return `
      <span class="inline-flex items-center gap-1.5 bg-teal-500/15 text-teal-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-teal-500/40 shadow-sm backdrop-blur-md">
        <i data-lucide="check-check" class="w-3.5 h-3.5 text-teal-400"></i>
        ตรวจรับเรียบร้อย
      </span>
    `;
  }

  return "";
}

// ==========================================
// 3. UI Rendering Engine
// ==========================================

/**
 * เรนเดอร์ Card View ในหน้าหลัก (Master View)
 */
function renderMasterGrid(data) {
  const masterGrid = document.getElementById("master-grid");
  if (!masterGrid) return;

  if (!data || data.length === 0) {
    masterGrid.innerHTML = `
      <div class="col-span-full text-center py-20 text-gray-400 bg-gray-900 rounded-2xl border border-gray-800">
        ไม่พบข้อมูลในระบบ
      </div>
    `;
    return;
  }

  masterGrid.innerHTML = data.map((item, index) => {
    const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]) || "N/A";
    const detailText = getFieldValue(item, ["รายละเอียด", "รายละเอียดโครงการ", "รายการ", "ชื่อโครงการ", "โครงการ"]) || "ไม่ระบุรายละเอียด";

    const budgetVal = getFieldValue(item, ["งบประมาณโครงการ", "งบประมาณ", "จำนวนเงิน", "วงเงิน"]);
    const budget = budgetVal ? `${budgetVal} บาท` : "-";

    // 1. ดึงสถานะรับ-ส่งยา
    const statusText = getFieldValue(item, ["สถานะรับยา", "สถานะการรับยา", "สถานะการจัดส่ง", "สถานะยา", "สถานะ", "Status"]) || "";
    const { badgeHtml, cardStyle, textColor } = getMedicineStatusStyle(statusText);

    // 2. 💡 [ดึงสถานะตรวจรับ]: ตรวจสอบคอลัมน์ "สถานะตรวจรับ"
    const acceptanceText = getFieldValue(item, ["สถานะตรวจรับ", "สถานะการตรวจรับ", "การตรวจรับ", "ตรวจรับ"]) || "";
    const acceptanceBadgeHtml = getAcceptanceStatusBadge(acceptanceText);

    return `
      <div class="${cardStyle} border rounded-2xl p-5 transition-all duration-200 shadow-lg flex flex-col justify-between group relative overflow-hidden">
        
        <div>
          <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="bg-blue-950/80 text-blue-300 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border border-blue-800/50">
                PO: ${po}
              </span>
              ${badgeHtml}
              ${acceptanceBadgeHtml}
            </div>

            <span class="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/40">
              งบ: ${budget}
            </span>
          </div>

          <h2 class="text-base ${textColor} mb-2 line-clamp-2 transition">
            ${detailText}
          </h2>

          ${statusText ? `
            <div class="mt-2 text-xs text-gray-300 flex items-center gap-1.5 bg-black/30 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
              <i data-lucide="info" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0"></i>
              <span class="truncate font-mono">${statusText}</span>
            </div>
          ` : ''}
        </div>

        <button 
          onclick="openDetailModal(${index})"
          class="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800/90 hover:bg-blue-600 text-gray-200 hover:text-white py-2.5 px-4 rounded-xl text-sm font-medium transition duration-200 shadow-sm border border-white/5"
        >
          <i data-lucide="eye" class="w-4 h-4"></i>
          ดูรายละเอียดทั้งหมด
        </button>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
}

/**
 * เรนเดอร์และเปิด Detail Modal
 */
function openDetailModal(dataIndex) {
  const item = globalData[dataIndex];
  if (!item) return;

  const po = getFieldValue(item, ["PO", "เลขที่ PO", "เลข PO", "PO No"]) || "N/A";
  const detailText = getFieldValue(item, ["รายละเอียด", "รายละเอียดโครงการ", "รายการ", "ชื่อโครงการ", "โครงการ"]) || "-";

  const modalPo = document.getElementById("modal-po");
  const modalProject = document.getElementById("modal-project");
  const modalBody = document.getElementById("modal-body");
  const detailModal = document.getElementById("detail-modal");

  if (modalPo) modalPo.innerText = `รายละเอียดโครงการ (PO: ${po})`;
  if (modalProject) modalProject.innerText = detailText;

  const chunkSize = 4;
  const chunks = [];
  for (let i = 0; i < globalHeaders.length; i += chunkSize) {
    chunks.push(globalHeaders.slice(i, i + chunkSize));
  }

  if (modalBody) {
    modalBody.innerHTML = chunks.map((chunkHeaders) => {
      const copyText = chunkHeaders
        .map(col => `${col}: ${item[col] !== undefined && item[col] !== '' ? item[col] : '-'}`)
        .join('\n')
        .replace(/`/g, "\\`").replace(/'/g, "\\'"); 

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
  }

  if (detailModal) detailModal.classList.remove("hidden");
  if (window.lucide) lucide.createIcons();
}

function closeModal() {
  const detailModal = document.getElementById("detail-modal");
  if (detailModal) detailModal.classList.add("hidden");
}

function copyCardText(btnElement, textToCopy) {
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    updateCopyButtonUI(btnElement);
    return;
  }

  navigator.clipboard.writeText(textToCopy).then(() => {
    updateCopyButtonUI(btnElement);
  }).catch(err => {
    console.error("Copy failed:", err);
  });
}

function updateCopyButtonUI(btnElement) {
  const originalHTML = btnElement.innerHTML;
  btnElement.innerHTML = `
    <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>
    <span class="text-emerald-400 font-medium">คัดลอกแล้ว</span>
  `;
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    btnElement.innerHTML = originalHTML;
    if (window.lucide) lucide.createIcons();
  }, 2000);
    }
