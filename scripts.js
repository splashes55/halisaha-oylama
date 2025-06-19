// 🟨 Ortak Tanımlar
const NOCODE_URL = "https://script.google.com/macros/s/AKfycbzfijtnu8jf6cS9dsivzvYy6VNYyHaoIBzt-pAjAmyxDtslMHnCYRZ4k37IEu__EHeXrA/exec"; // kendi Apps Script URL'in
const SHEET_MACLAR = "Maclar";
const SHEET_OYUNCULAR = "Oyuncular";
const SHEET_OYLAR = "Oylar";

/*
async function getData(sheetTabId) {
  try {
    const res = await fetch(`${NOCODE_URL}?tabId=${sheetTabId}`);
    const json = await res.json();
    return json.data || json;
  } catch (error) {
    console.error('getData hatası:', error);
    return [];
  }
}

async function postData(sheetTabId, row) {
  try {
    const response = await fetch(`${NOCODE_URL}?tabId=${sheetTabId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row) // örn: [[macID, oylayanID, oylananID, puan, macAdamID]]
    });
    return await response.json();
  } catch (error) {
    console.error('postData hatası:', error);
  }
}
*

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

    const mac = maclar.find(m => m[0] === macID);
    if (!mac) return document.getElementById("voteContainer").innerText = "Maç bulunamadı";

    const [id, tarihRaw, saatRaw, yer, oyuncuIDs] = mac;
    const oynayanlar = oyuncuIDs.split(",");
    const macZamani = new Date(tarihRaw);
    const simdi = new Date();
    if ((simdi - macZamani) / 3600000 > 24) {
      document.getElementById("voteContainer").innerText = "Oy verme süreci dolmuş.";
      return;
    }

    const kendinSelect = document.createElement("select");
    kendinSelect.name = "kendin";
    kendinSelect.innerHTML = `<option value="">-- Kendini Seç --</option>`;
    oynayanlar.forEach(oid => {
      const o = oyuncular.find(p => p[0] === oid);
      if (o) kendinSelect.innerHTML += `<option value="${o[0]}">${o[1]}</option>`;
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
        const o = oyuncular.find(p => p[0] === oid);
        if (o) {
          const div = document.createElement("div");
          div.classList.add("oycu");
          div.innerHTML = `<label>${o[1]}: <select name="puan_${oid}">
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
        const o = oyuncular.find(p => p[0] === oid);
        if (o) macAdamiSelect.innerHTML += `<option value="${o[0]}">${o[1]}</option>`;
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


// 📦 Yardımcı Fonksiyonlar
async function getData(sheetTabId) {
    try {
        const res = await fetch(`${NOCODE_URL}?tabId=${sheetTabId}`);
        const json = await res.json();
        return json.data || json;
    } catch (error) {
        console.error('getData hatası:', error);
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

