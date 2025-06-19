// 🔗 SENİN NoCodeAPI bağlantını buraya yapıştır
const NOCODE_URL = "https://v1.nocodeapi.com/splashes55/google_sheets/xpifIRWdvUPEkSvU";
const SHEET_OYUNCULAR = "Oyuncular";
const SHEET_MACLAR = "Maclar";
const SHEET_OYLAR = "Oylar";

// 🟩 Oyuncu Ekleme
async function addPlayer() {
  const isim = document.getElementById("playerName").value.trim();
  if (!isim) return alert("İsim giriniz");
  const id = Date.now();
  await postData("Oyuncular", [[id, isim]]);
  document.getElementById("msg").innerText = "Oyuncu eklendi.";
}

// 🟨 Maç Ekleme
async function addMatch() {
  const tarih = document.getElementById("tarih").value;
  const saat = document.getElementById("saat").value;
  const yer = document.getElementById("yer").value.trim();
  const oyuncular = document.getElementById("playerIds").value.trim();

  if (!tarih || !saat || !yer || !oyuncular) return alert("Tüm alanları doldurun");

  const id = Date.now();
  await postData(SHEET_MACLAR, [[id, tarih, saat, yer, oyuncular]]);
  document.getElementById("msg").innerText = "Maç eklendi.";
}

// 🟦 Maç Listesi (index.html)
if (location.pathname.endsWith("index.html") || location.pathname === "/") {
  (async () => {
    const maclar = await getData(SHEET_MACLAR);
    console.log("maclar verisi:", maclar);
    const container = document.getElementById("matchList");
    container.innerHTML = "";
    maclar.reverse().forEach(mac => {
      const { id, tarih, saat, yer } = mac;
      const btn = `<a href="vote.html?mac=${id}">Oy Ver</a>`;
      container.innerHTML += `<div><strong>${tarih} ${saat}</strong> - ${yer} ${btn}</div>`;
    });
  })();
}

// 🟪 Oy Verme Sayfası (vote.html)
if (location.pathname.endsWith("vote.html")) {
  (async () => {
    const urlParams = new URLSearchParams(location.search);
    const macID = urlParams.get("mac");

    const maclar = await getData(SHEET_MACLAR);
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);

    const mac = maclar.find(m => m[0] === macID);
    if (!mac) return document.getElementById("voteContainer").innerText = "Maç bulunamadı";

    const [id, tarih, saat, yer, oyuncuIDs] = mac;
    const oynayanlar = oyuncuIDs.split(",");

    const macZamani = new Date(`${tarih}T${saat}`);
    const simdi = new Date();
    const farkSaat = (simdi - macZamani) / (1000 * 60 * 60);
    if (farkSaat > 24) {
      document.getElementById("voteContainer").innerText = "Oy verme süresi doldu.";
      return;
    }

    const oyForm = document.createElement("form");
    const kendin = prompt("Oy kullanan oyuncunun ID’si nedir?");
    oynayanlar.forEach(oid => {
      if (oid === kendin) return; // kendine oy verme
      const o = oyuncular.find(p => p[0] === oid);
      if (o) {
        oyForm.innerHTML += `
          <label>${o[1]}:
            <select name="puan_${oid}">
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </label><br>`;
      }
    });

    const btn = document.createElement("button");
    btn.innerText = "Oyları Gönder";
    btn.type = "submit";
    oyForm.appendChild(btn);

    oyForm.onsubmit = async (e) => {
      e.preventDefault();
      for (let oid of oynayanlar) {
        if (oid === kendin) continue;
        const puan = oyForm[`puan_${oid}`].value;
        await postData(SHEET_OYLAR, [[macID, kendin, oid, puan]]);
      }
      document.getElementById("msg").innerText = "Oylar kaydedildi.";
      oyForm.remove();
    };

    document.getElementById("voteContainer").appendChild(oyForm);
  })();
}

// 🟫 İstatistikler (stats.html)
if (location.pathname.endsWith("stats.html")) {
  (async () => {
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);
    const maclar = await getData(SHEET_MACLAR);

    const oyuncuMap = {};
    oyuncular.forEach(p => oyuncuMap[p[0]] = p[1]);

    const puanlar = {};

    oylar.forEach(([macID, oylayanID, oylananID, puan]) => {
      if (!puanlar[oylananID]) puanlar[oylananID] = [];
      puanlar[oylananID].push(Number(puan));
    });

    const container = document.getElementById("statsContainer");
    for (let oid in puanlar) {
      const ort = (puanlar[oid].reduce((a,b)=>a+b,0) / puanlar[oid].length).toFixed(2);
      container.innerHTML += `<div><strong>${oyuncuMap[oid] || oid}</strong> - Ortalama: ${ort}</div>`;
    }

    // Maçın adamı seçimi
    maclar.forEach(mac => {
      const [macID, tarih, saat, yer, oyuncuIDs] = mac;
      const ilgiliOylar = oylar.filter(o => o[0] === macID);
      const toplamlar = {};
      ilgiliOylar.forEach(([_,__,oylanan,puan]) => {
        toplamlar[oylanan] = (toplamlar[oylanan] || 0) + Number(puan);
      });
      const kazanan = Object.entries(toplamlar).sort((a,b)=>b[1]-a[1])[0];
      if (kazanan) {
        const isim = oyuncuMap[kazanan[0]] || kazanan[0];
        container.innerHTML += `<div>🏅 <strong>${tarih}</strong> maçının adamı: ${isim}</div>`;
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

