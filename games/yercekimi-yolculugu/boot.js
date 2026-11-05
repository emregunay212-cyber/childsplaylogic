/* Yerçekimi Yolculuğu — Unity WebGL başlatıcı (satır içi script yok: CSP). */
/* global createUnityInstance */
"use strict";
(function () {
    const canvas = document.getElementById("unity-canvas");
    const kat = document.getElementById("yy-yukleme");
    const dolu = document.getElementById("yy-dolu");
    const mesaj = document.getElementById("yy-mesaj");
    const build = "Build/yercekimi-yolculugu";

    if (typeof createUnityInstance !== "function") {
        mesaj.textContent = "Oyun yüklenemedi. Sayfayı yenileyip tekrar dene.";
        return;
    }

    createUnityInstance(canvas, {
        dataUrl: build + ".data.unityweb",
        frameworkUrl: build + ".framework.js.unityweb",
        codeUrl: build + ".wasm.unityweb",
        streamingAssetsUrl: "StreamingAssets",
        companyName: "ChildsPlayLogic",
        productName: "Yerçekimi Yolculuğu",
        productVersion: "1.0",
        // Masaüstü tarayıcı uyarı şeridini gösterme; hataları konsola yaz.
        showBanner: function (msg, type) { if (type === "error") console.error(msg); else console.warn(msg); }
    }, function (oran) {
        dolu.style.width = Math.round(oran * 100) + "%";
    }).then(function () {
        kat.classList.add("gizli");
        canvas.focus();
    }).catch(function (err) {
        console.error(err);
        mesaj.textContent = "Oyun bu tarayıcıda açılamadı (WebGL gerekli).";
    });

    // Tıklayınca klavye odağı oyuna geçsin (iframe içinde ok tuşları için).
    document.addEventListener("pointerdown", function () { canvas.focus(); });
})();
