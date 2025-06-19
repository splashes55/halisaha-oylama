// 🟨 Ortak Tanımlar
const NOCODE_URL = "https://script.google.com/macros/s/AKfycbyoLcokPnnyB9yO8qcNPFnhyFSr1OVsq8zNqCT1zcf8MRT50JJSfLEjledzpmlzCsPVmg/exec"; // kendi Apps Script URL'in
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


// 🟪 Oy Verme Sayfası (vote.html)
if (location.pathname.endsWith("vote.html")) {
  (async () => {
    const urlParams = new URLSearchParams(location.search);
    const macID = urlParams.get("mac");

    // Verileri al
    const maclar = await getData(SHEET_MACLAR);
    const oyuncular = await getData(SHEET_OYUNCULAR);
    const oylar = await getData(SHEET_OYLAR);

    // Maçı bul, id karşılaştırmasını string olarak yap
    const mac = maclar.find(m => m.id.toString() === macID.toString());
    if (!mac) {
      return document.getElementById("voteContainer").innerText = "Maç bulunamadı";
    }

    // Maç bilgilerini al
    const { id, tarih, saat, yer, oyuncular: oyuncuIDs } = mac;
    const oynayanlar = oyuncuIDs.split(",");

    // Tarih kontrolü: 24 saati geçtiyse oy verilemez
    const macZamani = new Date(`${tarih}T${saat}`);
    const simdi = new Date();
    const farkSaat = (simdi - macZamani) / (1000 * 60 * 60);
    if (farkSaat > 24) {
      document.getElementById("voteContainer").innerText = "Oy verme süresi doldu.";
      return;
    }

    // Oy kullanan kişinin seçileceği dropdown
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

    // Oy verme formu
    const oyForm = document.createElement("form");
    oyForm.appendChild(kendinLabel);
    oyForm.appendChild(document.createElement("br"));

    // Oy verme alanları (başlangıçta gizli)
    oynayanlar.forEach(oid => {
      const o = oyuncular.find(p => p.id.toString() === oid.toString());
      if (o) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("oycu");
        wrapper.style.display = "none"; // gizli başta

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

    // Gönder butonu (başta gizli)
    const btn = document.createElement("button");
    btn.innerText = "Oyları Gönder";
    btn.type = "submit";
    btn.style.display = "none";
    oyForm.appendChild(btn);

    // Kendin seçildiğinde diğer oyuncular görünür ve seçilen kişi disable olur
    kendinSelect.addEventListener("change", () => {
      const kendin = kendinSelect.value;

      // Önce hepsini gizle
      document.querySelectorAll(".oycu").forEach(div => {
        div.style.display = "none";
      });

      // Eğer seçim yoksa butonu gizle ve çık
      if (!kendin) {
        btn.style.display = "none";
        return;
      }

      // Diğer oyuncular gösterilsin
      document.querySelectorAll(".oycu").forEach(div => {
        const select = div.querySelector("select");
        if (select.name === `puan_${kendin}`) {
          select.disabled = true;  // kendine oy verme
          div.style.opacity = 0.5;
        } else {
          select.disabled = false;
          div.style.opacity = 1;
        }
        div.style.display = "block";
      });

      btn.style.display = "inline-block"; // butonu göster
    });

    // Form gönderildiğinde oyları kaydet
    oyForm.onsubmit = async (e) => {
      e.preventDefault();
      const kendin = kendinSelect.value;
      if (!kendin) {
        alert("Lütfen önce kendinizi seçin.");
        return;
      }

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

