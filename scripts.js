// 🟨 Ortak Tanımlar
const NOCODE_URL = "https://script.google.com/macros/s/AKfycbycLnSqHEEJlTvEFxQcltneDtoP4nVNcjqfJhU2nmM8fsCHWqlGuIQXB3yWr1CDbTa94A/exec"; // kendi Apps Script URL'in
const SHEET_MACLAR = "Maclar";
const SHEET_OYUNCULAR = "Oyuncular";
const SHEET_OYLAR = "Oylar";



// 🟦 Maç Listesi (index.html)
if (location.pathname.endsWith("index.html") || location.pathname === "/") {
  (async () => {
    const maclar = await getData(SHEET_MACLAR);
    console.log("maclar verisi:", maclar);
    
    const container = document.getElementById("matchList");
    container.innerHTML = "";

    if (!Array.isArray(maclar)) {
      container.innerHTML = "<p>Maç verisi alınamadı.</p>";
      return;
    }

    maclar.reverse().forEach(mac => {
      if (!mac || typeof mac !== "object") return;

      const { id, tarih, saat, yer } = mac;
      const btn = `<a href="vote.html?mac=${id}">Oy Ver</a>`;
      container.innerHTML += `<div><strong>${tarih} ${saat}</strong> - ${yer} ${btn}</div>`;
    });
  })();
}


// 🕪 Oy Verme Sayfası (vote.html)
if (location.pathname.endsWith("vote.html")) {
  (async () => {
    const urlParams = new URLSearchParams(location.search);
    const macID = urlParams.get("mac");

    const maclar = await getData(SHEET_MACLAR);
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);

    // mac.id ile arama yapıyoruz artık
    const mac = maclar.find(m => m.id === macID);
    if (!mac) return document.getElementById("voteContainer").innerText = "Maç bulunamadı";

    // Nesne yapısına göre alanlar
    const { id, tarih, saat, yer, oyuncular: oyuncuIDs } = mac;
    const oynayanlar = oyuncuIDs.split(",");

    const macZamani = new Date(tarih);
    const simdi = new Date();
    if ((simdi - macZamani) / 3600000 > 24) {
      return document.getElementById("voteContainer").innerText = "Oy verme süreci dolmuş.";
    }

    const kendinSelect = document.createElement("select");
    kendinSelect.name = "kendin";
    kendinSelect.innerHTML = `<option value="">-- Kendini Seç --</option>`;
    oynayanlar.forEach(oid => {
      // Burada oyuncular artık nesne dizisi, id alanına göre bul
      const o = oyuncular.find(p => p.id === oid);
      if (o) kendinSelect.innerHTML += `<option value="${o.id}">${o.isim}</option>`;
    });

    const oyForm = document.createElement("form");
    oyForm.appendChild(document.createTextNode("Oy kullanan kişi: "));
    oyForm.appendChild(kendinSelect);
    oyForm.appendChild(document.createElement("br"));

    const oyuncuDiv = document.createElement("div");
    oyuncuDiv.id = "oyuncuListesi";
    oyForm.appendChild(oyuncuDiv);

    const macAdamiWrapper = document.createElement("div");
    macAdamiWrapper.id = "macAdamiDiv";
    oyForm.appendChild(macAdamiWrapper);

    const btn = document.createElement("button");
    btn.innerText = "Oyları Gönder";
    btn.type = "submit";
    btn.style.display = "none";
    oyForm.appendChild(btn);

    kendinSelect.addEventListener("change", () => {
      const kendin = kendinSelect.value;
      oyuncuDiv.innerHTML = "";
      macAdamiWrapper.innerHTML = "";

      if (!kendin) {
        btn.style.display = "none";
        return;
      }

      // Oy Listesi
      oynayanlar.forEach(oid => {
        if (oid === kendin) return;
        const o = oyuncular.find(p => p.id === oid);
        if (o) {
          const div = document.createElement("div");
          div.classList.add("oycu");
          div.innerHTML = `<label>${o.isim}: <select name="puan_${oid}">
            ${[...Array(11).keys()].map(i => `<option value="${i}">${i}</option>`).join("")}
          </select></label>`;
          oyuncuDiv.appendChild(div);
        }
      });

      // Maçın Adamı
      const macAdamiLabel = document.createElement("label");
      macAdamiLabel.innerText = "🏅 Maçın Adamı: ";
      const macAdamiSelect = document.createElement("select");
      macAdamiSelect.name = "mac_adami";
      macAdamiSelect.innerHTML = `<option value="">-- Seçin --</option>`;
      oynayanlar.forEach(oid => {
        if (oid === kendin) return;
        const o = oyuncular.find(p => p.id === oid);
        if (o) macAdamiSelect.innerHTML += `<option value="${o.id}">${o.isim}</option>`;
      });
      macAdamiLabel.appendChild(macAdamiSelect);
      macAdamiWrapper.appendChild(macAdamiLabel);

      btn.style.display = "inline-block";
    });

    oyForm.onsubmit = async e => {
      e.preventDefault();
      const kendin = kendinSelect.value;
      const macAdamiID = oyForm["mac_adami"].value;
      for (let oid of oynayanlar) {
        if (oid === kendin) continue;
        const puan = oyForm[`puan_${oid}`].value;
        await postData(SHEET_OYLAR, [[macID, kendin, oid, puan, macAdamiID]]);
      }
      document.getElementById("msg").innerText = "Oylar kaydedildi.";
      oyForm.remove();
    };

    document.getElementById("voteContainer").appendChild(oyForm);
  })();
}




//-------------------------------------------------------------------------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------



// 🟫 İstatistikler (stats.html)
if (location.pathname === "/stats" || location.pathname.endsWith("stats.html")) {

  alert("İstatistik sayfası kodu çalıştı ✅");

  (async () => {
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);
    const maclar = await getData(SHEET_MACLAR);

    console.log("Oyuncular:", oyuncular);
    console.log("Oylar:", oylar);
    console.log("Maçlar:", maclar);

    const container = document.getElementById("statsContainer");
    container.innerHTML = ""; // Önceki içerik temizlensin

    // Veri kontrolü
    if (!Array.isArray(oyuncular) || !Array.isArray(oylar) || !Array.isArray(maclar)) {
      container.innerText = "Veri yüklenemedi. Lütfen Sheet ve URL yapılandırmalarınızı kontrol edin.";
      return;
    }

    // Oyuncu ID → İsim eşleşmesi
    const oyuncuMap = {};
    oyuncular.forEach(p => {
      oyuncuMap[p.id] = p.isim;
    });

    // Oyuncu ID → aldığı puanlar
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

    // Her maç için maçın adamını seç
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
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    const requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
        body: JSON.stringify(row)  // dikkat: direkt [[...]]
    };

    try {
        const response = await fetch(`${NOCODE_URL}?tabId=${sheetTabId}`, requestOptions);
        const result = await response.text();
        console.log(result);
        return result;
    } catch (error) {
        console.error('postData hatası:', error);
        throw error;
    }
}

