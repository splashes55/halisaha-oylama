// 🟨 Ortak Tanımlar
const NOCODE_URL = "https://script.google.com/macros/s/AKfycbwqykFtn0fIVawx8sqhLouaBvYk4gGxrQw3yfdIATbYQDhsf27Gsyh25hZyC0irk0O8tA/exec";
const SHEET_MACLAR = "Maclar";
const SHEET_OYUNCULAR = "Oyuncular";
const SHEET_OYLAR = "Oylar";

// URL parametresi ile admin girişi (sayfa yüklenmeden önce)
(() => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("admin") === "gizlisifre123") {
    localStorage.setItem("admin", "true");
    // Parametreyi temizle URL’den
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
})();

// Sayfa yüklendiğinde admin linklerini göster/gizle ve maçları yükle
document.addEventListener("DOMContentLoaded", () => {
  const isAdmin = localStorage.getItem("admin") === "true";

  // Admin olmayanlardan admin-only class’lı linkleri gizle
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = isAdmin ? "inline" : "none";
  });

  // 🟦 Maç Listesi (index.html)
  if (location.pathname.endsWith("index.html") || location.pathname === "/" || document.body.id === "anasayfa") {
    (async () => {
      const maclar = await getData(SHEET_MACLAR);
      console.log("maclar verisi:", maclar);
      console.log("İlk maç verisi:", maclar[0]);
      const container = document.getElementById("matchList");
      container.innerHTML = "";

      if (!Array.isArray(maclar)) {
        container.innerHTML = "<p>Maç verisi alınamadı.</p>";
        return;
      }

     maclar.reverse().forEach(mac => {
      if (!mac || typeof mac !== "object") return;

      const { id, tarih, saat, yer } = mac;

      const tarihObj = new Date(tarih);
      const tarihStr = `${(tarihObj.getUTCDate()+1).toString().padStart(2, '0')}.${(tarihObj.getUTCMonth() + 1).toString().padStart(2, '0')}.${tarihObj.getUTCFullYear()}`;

      // Saat doğrudan sayı olarak ele alınır
let saatBasla = parseInt(saat); // örn: "21"
const saatBitis = (saatBasla === 23) ? 24 : saatBasla + 1;
const saatStr = `${saatBasla}-${saatBitis}`;

const aciklama = `${yer} - ${tarihStr} tarihi ${saatStr} saatleri arasında oynanan maç`;
const btn = `<a href="vote.html?mac=${id}">Oy Ver</a>`;

container.innerHTML += `<div><strong>${aciklama}</strong> ${btn}</div>`;
    });

    })();
  }
});

// 🟪 Oy Verme Sayfası (vote.html)
if (location.pathname.endsWith("vote.html")) {
  (async () => {
    const urlParams = new URLSearchParams(location.search);
    const macID = urlParams.get("mac");

    const maclar = await getData(SHEET_MACLAR);
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);

    const mac = maclar.find(m => m.id.toString() === macID.toString());
    if (!mac) {
      return document.getElementById("voteContainer").innerText = "Maç bulunamadı";
    }

    const { id, tarih, saat, yer, oyuncular: oyuncuIDs } = mac;
    const oynayanlar = oyuncuIDs.split(",");

    const macZamani = new Date(`${tarih}T${saat}`);
    const simdi = new Date();
    const farkSaat = (simdi - macZamani) / (1000 * 60 * 60);
    if (farkSaat > 24) {
      document.getElementById("voteContainer").innerText = "Oy verme süresi doldu.";
      return;
    }

    const kendinSelect = document.createElement("select");
    kendinSelect.name = "kendin";
    kendinSelect.innerHTML = `<option value="">-- Kendini Seç --</option>`;

    oynayanlar.forEach(oid => {
      const o = oyuncular.find(p => p.id.toString() === oid.toString());
      if (o) {
        kendinSelect.innerHTML += `<option value="${o.id}">${o.isim}</option>`;
      }
    });

    const kendinLabel = document.createElement("label");
    kendinLabel.innerText = "Oy kullanan kişi:";
    kendinLabel.appendChild(kendinSelect);

    const oyForm = document.createElement("form");
    oyForm.appendChild(kendinLabel);
    oyForm.appendChild(document.createElement("br"));

    oynayanlar.forEach(oid => {
      const o = oyuncular.find(p => p.id.toString() === oid.toString());
      if (o) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("oycu");
        wrapper.style.display = "none";

        wrapper.innerHTML = `
          <label>${o.isim}:
            <select name="puan_${oid}">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </label>`;
        oyForm.appendChild(wrapper);
      }
    });

    const btn = document.createElement("button");
    btn.innerText = "Oyları Gönder";
    btn.type = "submit";
    btn.style.display = "none";
    oyForm.appendChild(btn);

    kendinSelect.addEventListener("change", () => {
      const kendin = kendinSelect.value;

      document.querySelectorAll(".oycu").forEach(div => {
        div.style.display = "none";
      });

      if (!kendin) {
        btn.style.display = "none";
        return;
      }

      document.querySelectorAll(".oycu").forEach(div => {
        const select = div.querySelector("select");
        if (select.name === `puan_${kendin}`) {
          select.disabled = true;
          div.style.opacity = 0.5;
        } else {
          select.disabled = false;
          div.style.opacity = 1;
        }
        div.style.display = "block";
      });

      btn.style.display = "inline-block";
    });

    oyForm.onsubmit = async (e) => {
      e.preventDefault();
      const kendin = kendinSelect.value;
      if (!kendin) {
        alert("Lütfen önce kendinizi seçin.");
        return;
      }

      const oylar = [];

      for (let oid of oynayanlar) {
        if (oid === kendin) continue;
        const puan = oyForm[`puan_${oid}`].value;
        oylar.push([macID, kendin, oid, puan]);
      }

      const sonuc = await postData(SHEET_OYLAR, oylar);

      if (sonuc?.success) {
        document.getElementById("msg").innerText = "✅ Oylar kaydedildi.";
        oyForm.remove();
      } else {
        document.getElementById("msg").innerText = "❌ Oylar kaydedilemedi.";
      }
    };

    document.getElementById("voteContainer").appendChild(oyForm);
  })();
}

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------

// 🟫 İstatistikler (stats.html)
if (location.pathname === "/stats" || location.pathname.endsWith("stats.html")) {
  (async () => {
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);
    const maclar = await getData(SHEET_MACLAR);

    const container = document.getElementById("statsContainer");
    container.innerHTML = "";

    if (!Array.isArray(oyuncular) || !Array.isArray(oylar) || !Array.isArray(maclar)) {
      container.innerText = "Veri yüklenemedi. Lütfen Sheet ve URL yapılandırmalarınızı kontrol edin.";
      return;
    }

    const oyuncuMap = {};
    oyuncular.forEach(p => {
      oyuncuMap[p.id] = p.isim;
    });

    const puanlar = {};

    oylar.forEach(({ mac_id, oylayan_id, oylanan_id, puan }) => {
      if (!puanlar[oylanan_id]) puanlar[oylanan_id] = [];
      puanlar[oylanan_id].push(Number(puan));
    });

    container.innerHTML += "<h2>🎯 Oyuncu Ortalama Puanları</h2>";

    for (let oid in puanlar) {
      const ort = (puanlar[oid].reduce((a, b) => a + b, 0) / puanlar[oid].length).toFixed(2);
      container.innerHTML += `<div><strong>${oyuncuMap[oid] || oid}</strong> - Ortalama: ${ort} (${puanlar[oid].length} oy)</div>`;
    }

    container.innerHTML += "<hr><h2>🏅 Maçın Adamları</h2>";

    maclar.forEach(mac => {
      const { id: macID, tarih } = mac;
      const ilgiliOylar = oylar.filter(o => o.mac_id === macID);

      const toplamlar = {};
      ilgiliOylar.forEach(({ oylanan_id, puan }) => {
        toplamlar[oylanan_id] = (toplamlar[oylanan_id] || 0) + Number(puan);
      });

      const kazanan = Object.entries(toplamlar).sort((a, b) => b[1] - a[1])[0];
      if (kazanan) {
        const isim = oyuncuMap[kazanan[0]] || kazanan[0];
        container.innerHTML += `<div><strong>${tarih}</strong> maçının adamı: 🏅 ${isim} (${kazanan[1]} puan)</div>`;
      }
    });
  })();
}


//OYUNCU EKLEME
if (location.pathname === "/new-player" || location.pathname.endsWith("new-player.html")) {
  // Yeni oyuncu ekleme fonksiyonunu sadece bu sayfada tanımla
  async function addPlayer() {
    const input = document.getElementById("playerName");
    const msg = document.getElementById("msg");
    const isim = input.value.trim();

    if (!isim) {
      msg.innerText = "Lütfen bir isim girin.";
      return;
    }

    const yeniID = Date.now().toString();
    const yeniOyuncuSatiri = [[yeniID, isim]];

    msg.innerText = "Ekleniyor...";

    const sonuc = await postData(SHEET_OYUNCULAR, yeniOyuncuSatiri);

    if (sonuc?.success) {
      msg.innerText = `✅ "${isim}" başarıyla eklendi.`;
      input.value = "";
    } else {
      msg.innerText = "❌ Oyuncu eklenemedi. Lütfen tekrar deneyin.";
    }
  }

  // global scope'a açmak için:
  window.addPlayer = addPlayer;
}

//YENİ MAÇ KAYDI EKLEME
if (location.pathname === "/new-match" || location.pathname.endsWith("new-match.html")) {
  async function addMatch() {
    const msg = document.getElementById("msg");
    const tarih = document.getElementById("tarih").value;
    const saat = document.getElementById("saatSec").value;
    const yer = document.getElementById("yer").value.trim();
    const oyuncuIDs = document.getElementById("playerIds").value.trim();

    if (!tarih || !saat || !yer || !oyuncuIDs) {
      msg.innerText = "❌ Lütfen tüm alanları doldurun.";
      return;
    }

    const id = Date.now().toString(); // benzersiz ID

    const yeniMacSatiri = [[id, tarih, saat, yer, oyuncuIDs]];

    msg.innerText = "Kaydediliyor...";

    const sonuc = await postData(SHEET_MACLAR, yeniMacSatiri);

    if (sonuc?.success) {
      msg.innerText = `✅ Maç başarıyla eklendi.`;
      // Alanları sıfırla
      document.getElementById("tarih").value = "";
      document.getElementById("saatSec").value = "";
      document.getElementById("yer").value = "";
      document.getElementById("playerIds").value = "";
    } else {
      msg.innerText = "❌ Maç eklenemedi. Lütfen tekrar deneyin.";
    }
  }

  // Fonksiyonu global scope'a aç
  window.addMatch = addMatch;
}



// 📦 Yardımcı Fonksiyonlar
async function getData(sheetTabId) {
  try {
    const res = await fetch(`${NOCODE_URL}?tabId=${sheetTabId}`);
    const json = await res.json();
    return json.data || json;
  } catch (error) {
    console.error("getData hatası:", error);
    return null;
  }
}

async function postData(sheetTabId, row) {
  try {
    const proxyUrl = "https://cors-anywherepuppet.onrender.com/";
    const fullUrl = `${proxyUrl}${NOCODE_URL}?tabId=${sheetTabId}`;

    const res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });

    const json = await res.json();
    if (json.error) {
      console.error("API hata:", json.error);
      return null;
    }
    return json;
  } catch (error) {
    console.error("postData hatası:", error);
    return null;
  }
}
