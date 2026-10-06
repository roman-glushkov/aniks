(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const startDate = new Date(CONFIG.startDate);
  const quote = $("quote");
  const music = $("music");
  const soundButton = $("soundButton");
  let phraseIndex = 0;
  let musicStarted = false;

  function plural(value, one, few, many) {
    const n = Math.abs(value) % 100;
    const last = n % 10;
    if (n >= 11 && n <= 19) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  }

  function diffParts(from, to) {
    let years = to.getFullYear() - from.getFullYear();
    let anniversary = new Date(from);
    anniversary.setFullYear(from.getFullYear() + years);
    if (anniversary > to) {
      years--;
      anniversary = new Date(from);
      anniversary.setFullYear(from.getFullYear() + years);
    }

    let remaining = Math.floor((to - anniversary) / 1000);
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return { years, days, hours, minutes, seconds };
  }

  function updateTimer() {
    const now = new Date();
    if (startDate > now) return;

    const t = diffParts(startDate, now);
    $("years").textContent = t.years;
    $("days").textContent = t.days;
    $("hours").textContent = String(t.hours).padStart(2, "0");
    $("minutes").textContent = String(t.minutes).padStart(2, "0");
    $("seconds").textContent = String(t.seconds).padStart(2, "0");
  }

  function getNextAnniversary() {
    const [year, month, day] = CONFIG.anniversaryDate.split("-").map(Number);
    const now = new Date();
    let next = new Date(
      now.getFullYear(),
      month - 1,
      day,
      startDate.getHours(),
      startDate.getMinutes(),
      startDate.getSeconds()
    );

    if (next <= now) {
      next = new Date(
        now.getFullYear() + 1,
        month - 1,
        day,
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds()
      );
    }
    return next;
  }

  function updateAnniversary() {
    const next = getNextAnniversary();
    let seconds = Math.max(0, Math.floor((next - new Date()) / 1000));
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    $("anniversaryDate").textContent = next.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    $("anniversaryCountdown").textContent =
      `${days} ${plural(days, "день", "дня", "дней")} · ` +
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
  }

  function showPhrase(index) {
    quote.classList.remove("visible");
    setTimeout(() => {
      quote.textContent = CONFIG.phrases[index];
      quote.classList.add("visible");
    }, 350);
  }

  function initPhrases() {
    if (!CONFIG.phrases?.length) return;
    showPhrase(phraseIndex);
    setInterval(() => {
      phraseIndex = (phraseIndex + 1) % CONFIG.phrases.length;
      showPhrase(phraseIndex);
    }, 10000);
  }

  function buildCollage() {
    const items = [
      ...(CONFIG.images || []).map((src) => ({ type: "image", src })),
      ...(CONFIG.videos || []).map((src) => ({ type: "video", src })),
    ];

    ["collageA", "collageB"].forEach((id, copyIndex) => {
      const collage = $(id);
      collage.innerHTML = "";

      items.forEach((item, index) => {
        let element;

        if (item.type === "video") {
          element = document.createElement("video");
          element.src = item.src;
          element.muted = true;
          element.loop = true;
          element.autoplay = true;
          element.playsInline = true;
          element.preload = "metadata";
        } else {
          element = document.createElement("img");
          element.src = item.src;
          element.alt = "";
          element.loading = index < 6 ? "eager" : "lazy";
          element.decoding = "async";
        }

        element.addEventListener("error", () => element.remove());
        collage.appendChild(element);
      });

      collage.style.animationDuration = `${CONFIG.collageSpeed || 90}s`;
      if (copyIndex === 1) collage.classList.add("reverse");
    });
  }

  async function toggleMusic() {
    if (!CONFIG.music) return;

    if (music.paused) {
      try {
        await music.play();
        musicStarted = true;
        soundButton.textContent = "♫";
        soundButton.classList.add("playing");
        soundButton.setAttribute("aria-label", "Выключить музыку");
      } catch {
        soundButton.textContent = "♪";
      }
    } else {
      music.pause();
      soundButton.textContent = "♪";
      soundButton.classList.remove("playing");
    }
  }

  function initMusic() {
    if (!CONFIG.music) {
      soundButton.style.display = "none";
      return;
    }
    $("musicSource").src = CONFIG.music;
    music.load();
    soundButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMusic();
    });
  }

  function createHeart(x, y) {
    const heart = document.createElement("span");
    heart.className = "floating-heart";
    heart.textContent = Math.random() > 0.35 ? "♥" : "✦";
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    heart.style.setProperty("--dx", `${(Math.random() - 0.5) * 120}px`);
    heart.style.setProperty("--duration", `${1.1 + Math.random() * 0.8}s`);
    heart.style.setProperty("--scale", `${0.6 + Math.random() * 0.8}`);
    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 2200);
  }

  function initClickEffect() {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".sound-button")) return;

      for (let i = 0; i < 5; i++) {
        setTimeout(
          () =>
            createHeart(
              event.clientX + (Math.random() - 0.5) * 20,
              event.clientY + (Math.random() - 0.5) * 20
            ),
          i * 45
        );
      }

      if (!musicStarted && CONFIG.music) toggleMusic();
    });
  }

  function initParallax() {
    if (!matchMedia("(pointer: fine)").matches) return;

    let tx = 0,
      ty = 0,
      x = 0,
      y = 0;
    addEventListener(
      "pointermove",
      (event) => {
        tx = (event.clientX / innerWidth - 0.5) * 18;
        ty = (event.clientY / innerHeight - 0.5) * 12;
      },
      { passive: true }
    );

    function animate() {
      x += (tx - x) * 0.035;
      y += (ty - y) * 0.035;
      document.documentElement.style.setProperty("--mx", `${x}px`);
      document.documentElement.style.setProperty("--my", `${y}px`);
      requestAnimationFrame(animate);
    }
    animate();
  }

  function init() {
    buildCollage();
    initPhrases();
    initMusic();
    initClickEffect();
    initParallax();
    updateTimer();
    updateAnniversary();
    setInterval(updateTimer, 1000);
    setInterval(updateAnniversary, 1000);
  }

  init();
})();
