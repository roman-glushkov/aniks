"use strict";

const PROFILE_FIELDS = [
  { key: "birthdate", label: "Дата рождения" },
  { key: "age", label: "Возраст", suffix: "лет" },
  { key: "height", label: "Рост", suffix: "см" },
  { key: "weight", label: "Вес", suffix: "кг" },
  { key: "hand", label: "Рабочая рука" },
  { key: "position", label: "Амплуа" },
  { key: "experience", label: "Стаж" },
  { key: "serve_type", label: "Любимая подача" },
  { key: "attack_zone", label: "Зона атаки" },
];

const STAT_ICONS = {
  Скидка: "⌁",
  Перекидка: "↗",
  Прием: "◎",
  Доводка: "⌖",
  Атака: "↟",
  Удар: "↟",
  "Атака в аут/сетку": "×",
  Забила: "◆",
  Забил: "◆",
  Подача: "⌁",
  "Не подача": "—",
  Эйс: "✦",
  "Защитные действия": "◈",
  Защита: "◈",
  Блок: "▥",
  "Плохая защита": "!",
};

const RADAR_KEYS = [
  "Атака",
  "Забито мячей",
  "Полезные действия в защите",
  "Эйсы",
  "Блок",
];
const DOUGHNUT_KEYS = [
  "Атака",
  "Удар",
  "Подача",
  "Защита",
  "Защитные действия",
  "Прием",
  "Перекидка",
  "Блок",
  "Скидка",
];
const CHART_COLORS = [
  "#54e6f2",
  "#8af0c1",
  "#5da8d8",
  "#7c8cf4",
  "#b4d9e8",
  "#4dbaa9",
  "#8b9aaa",
  "#a284f4",
  "#f4a284",
];

let radarInstance = null;
let doughnutInstance = null;
let currentData = null;
let currentPlayerIndex = 0;
let currentMatchIndex = 0;

const $ = (selector) => document.querySelector(selector);
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

async function loadData() {
  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();
    validateData(data);
    currentData = data;
    renderApp(data);
    initAmbientCanvas();
    initRevealAnimations();
  } catch (error) {
    console.error("Data loading error:", error);
    showLoadError(error);
  }
}

function validateData(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.players)) {
    throw new Error("Некорректная структура data.json. Нужен массив players.");
  }
}

function renderApp(data) {
  renderPlayerSwitcher(data.players);
  switchPlayer(0);
}

// Создает кнопки переключения игроков
function renderPlayerSwitcher(players) {
  const switcher = $("#playerSwitcher");
  switcher.replaceChildren();

  players.forEach((player, index) => {
    const btn = document.createElement("button");
    btn.className = `switch-btn ${index === 0 ? "active" : ""}`;
    btn.dataset.index = index;
    btn.textContent = player.short_name || "Player";

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".switch-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      switchPlayer(index);
    });

    switcher.append(btn);
  });
}

// Переключает всё досье на выбранного игрока
function switchPlayer(index) {
  currentPlayerIndex = index;
  currentMatchIndex = 0;
  const player = currentData.players[index];

  renderHero(player);
  renderProfile(player);
  renderMatchSelector(player.matches);

  if (player.matches && player.matches.length > 0) {
    renderMatch(player.matches[0], 0, player.matches.length);
  } else {
    // Очистка, если нет матчей
    $("#matchName").textContent = "Нет данных о матчах";
    $("#statsGrid").replaceChildren();
  }
}

function renderHero(player) {
  // Берем имя (второе слово в ФИО)
  const nameParts = String(player.full_name || "PLAYER")
    .trim()
    .split(/\s+/);
  const firstName = nameParts[1] || nameParts[0] || "PLAYER";

  $("#heroFirstName").textContent = firstName.toUpperCase();
  $("#heroFullName").textContent =
    player.full_name || "Персональное игровое досье";

  const monogram = $("#heroMonogram");
  if (monogram) {
    // Делаем инициалы (например, АТ или РГ)
    const initials = nameParts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    monogram.textContent = initials || "P.";
  }
}

function renderProfile(player) {
  $("#profileName").textContent = player.full_name || "Имя не указано";
  $("#profilePosition").textContent = player.position || "Амплуа не указано";
  $("#profileExperience").textContent =
    player.experience && player.experience !== "—"
      ? player.experience
      : "Стаж не указан";

  // Установка фото
  const photo = $("#playerPhoto");
  const fallback = $("#photoFallback");
  if (player.photo) {
    photo.src = player.photo;
    photo.style.display = "block";
    fallback.style.display = "none";
    // Если фото не загрузится (например, нет roma.jpg), сработает onerror в HTML
    fallback.textContent = player.short_name
      ? player.short_name.substring(0, 2).toUpperCase()
      : "?";
  } else {
    photo.style.display = "none";
    fallback.style.display = "flex";
    fallback.textContent = player.short_name
      ? player.short_name.substring(0, 2).toUpperCase()
      : "?";
  }

  const facts = $("#profileFacts");
  facts.replaceChildren();

  PROFILE_FIELDS.forEach((field) => {
    const rawValue = player[field.key];
    const value =
      rawValue === null ||
      rawValue === undefined ||
      rawValue === "" ||
      rawValue === "—"
        ? "—"
        : `${rawValue}${field.suffix ? ` ${field.suffix}` : ""}`;
    const wrapper = document.createElement("div");
    wrapper.className = "fact";
    const label = document.createElement("dt");
    label.textContent = field.label;
    const content = document.createElement("dd");
    content.textContent = value;
    wrapper.append(label, content);
    facts.append(wrapper);
  });
}

function renderMatchSelector(matches) {
  const wrapper = $("#matchSelectWrap");
  const select = $("#matchSelect");
  select.replaceChildren();

  if (!matches || matches.length === 0) {
    wrapper.hidden = true;
    return;
  }

  matches.forEach((match, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, "0")} / ${
      match.match_name || "Матч без названия"
    }`;
    select.append(option);
  });

  wrapper.hidden = matches.length < 2;

  // Удаляем старый обработчик, чтобы не дублировался при переключении игроков
  const newSelect = select.cloneNode(true);
  select.parentNode.replaceChild(newSelect, select);

  newSelect.addEventListener("change", (event) => {
    currentMatchIndex = Number(event.target.value);
    const player = currentData.players[currentPlayerIndex];
    renderMatch(
      player.matches[currentMatchIndex],
      currentMatchIndex,
      player.matches.length
    );
  });
}

function renderMatch(match, index, total) {
  $("#matchTournament").textContent = match.tournament || "MATCH REPORT";
  $("#matchDate").textContent = match.date || "Дата не указана";
  $("#matchName").textContent = match.match_name || "Матч без названия";
  $("#matchScore").textContent = match.score || "—";
  $("#matchOrdinal").textContent = `MATCH ${String(index + 1).padStart(
    2,
    "0"
  )} / ${String(total).padStart(2, "0")}`;
  $("#statsCount").textContent = `${Object.keys(match.stats).length} METRICS`;

  renderStats(match.stats);
  renderCharts(match.stats);
  if ($("#matchSelect").options.length) $("#matchSelect").value = String(index);
}

function renderStats(stats) {
  const grid = $("#statsGrid");
  grid.replaceChildren();

  Object.entries(stats).forEach(([label, value]) => {
    const isMissing = value === null || value === undefined || value === "";
    const card = document.createElement("article");
    card.className = `stat-card${isMissing ? " stat-card--empty" : ""}`;

    const top = document.createElement("div");
    top.className = "stat-card-top";
    const icon = document.createElement("span");
    icon.className = "stat-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = STAT_ICONS[label] || "◇";
    top.append(icon);

    const title = document.createElement("h4");
    title.className = "stat-label";
    title.textContent = label;

    const bottom = document.createElement("div");
    bottom.className = "stat-bottom";
    const metric = document.createElement("strong");
    metric.className = "stat-value";
    metric.textContent = isMissing ? "—" : formatValue(value);
    bottom.append(metric);

    if (isMissing) {
      const missing = document.createElement("span");
      missing.className = "no-data";
      missing.textContent = "Нет данных";
      bottom.append(missing);
    }

    card.append(top, title, bottom);
    grid.append(card);
  });

  animateStatCards();
}

function formatValue(value) {
  if (typeof value === "number")
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
      value
    );
  return String(value);
}

function renderCharts(stats) {
  const radarCanvas = $("#radarChart");
  const doughnutCanvas = $("#doughnutChart");
  if (radarInstance) radarInstance.destroy();
  if (doughnutInstance) doughnutInstance.destroy();

  if (!window.Chart) {
    $("#chartTotal").textContent = "—";
    return;
  }

  const normalizedStats = { ...stats };

  // Приводим все к единому виду для радара
  if (
    normalizedStats["Удар"] !== undefined &&
    normalizedStats["Атака"] === undefined
  ) {
    normalizedStats["Атака"] = normalizedStats["Удар"];
  }
  if (normalizedStats["Забила"] !== undefined) {
    normalizedStats["Забито мячей"] = normalizedStats["Забила"];
  }
  if (normalizedStats["Забил"] !== undefined) {
    normalizedStats["Забито мячей"] = normalizedStats["Забил"];
  }
  if (normalizedStats["Защитные действия"] !== undefined) {
    normalizedStats["Полезные действия в защите"] =
      normalizedStats["Защитные действия"];
  }
  if (normalizedStats["Защита"] !== undefined) {
    normalizedStats["Полезные действия в защите"] = normalizedStats["Защита"];
  }

  // Нормализация для Эйсов
  if (normalizedStats["Эйс"] !== undefined) {
    normalizedStats["Эйсы"] = normalizedStats["Эйс"];
  }
  if (normalizedStats["Эйсы"] !== undefined) {
    normalizedStats["Эйсы"] = normalizedStats["Эйсы"];
  }

  // Строим данные для радара
  const radarValues = RADAR_KEYS.map((key) =>
    typeof normalizedStats[key] === "number" ? normalizedStats[key] : 0
  );
  const maxRadarValue =
    Math.max(10, ...radarValues.filter(Number.isFinite)) * 1.2;

  radarInstance = new Chart(radarCanvas, {
    type: "radar",
    data: {
      labels: RADAR_KEYS,
      datasets: [
        {
          label: "Количество действий",
          data: radarValues,
          borderColor: "#54e6f2",
          backgroundColor: "rgba(84, 230, 242, .13)",
          pointBackgroundColor: "#8af0c1",
          pointBorderColor: "#08131b",
          pointHoverRadius: 6,
          pointRadius: 3,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: prefersReducedMotion ? false : { duration: 850 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#101c29",
          borderColor: "rgba(84,230,242,.3)",
          borderWidth: 1,
          titleColor: "#edf5fb",
          bodyColor: "#a9bbc8",
          padding: 11,
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: maxRadarValue,
          angleLines: { color: "rgba(151,180,207,.12)" },
          grid: { color: "rgba(151,180,207,.12)" },
          pointLabels: {
            color: "#a7b7c5",
            font: { family: "Inter", size: 10, weight: "500" },
          },
          ticks: {
            color: "#718494",
            backdropColor: "transparent",
            stepSize: Math.max(1, Math.ceil(maxRadarValue / 4)),
            font: { size: 8 },
          },
        },
      },
    },
  });

  // Строим данные для круговой диаграммы (склеиваем одинаковые по смыслу действия)
  const DOUGHNUT_MAP = {
    Атака: "Атака",
    Удар: "Атака",
    Забила: "Забито мячей",
    Забил: "Забито мячей",
    Подача: "Подача",
    "Защитные действия": "Полезные действия в защите",
    Защита: "Полезные действия в защите",
    Прием: "Прием",
    Перекидка: "Перекидка",
    Блок: "Блок",
    Скидка: "Скидка",
  };

  const doughnutEntries = [];
  Object.entries(stats).forEach(([label, value]) => {
    if (typeof value === "number" && value > 0) {
      const mappedLabel = DOUGHNUT_MAP[label] || label;
      const existing = doughnutEntries.find((e) => e.label === mappedLabel);
      if (existing) {
        existing.value += value;
      } else {
        doughnutEntries.push({ label: mappedLabel, value: value });
      }
    }
  });

  const total = doughnutEntries.reduce((sum, entry) => sum + entry.value, 0);
  $("#chartTotal").textContent = formatValue(total);

  doughnutInstance = new Chart(doughnutCanvas, {
    type: "doughnut",
    data: {
      labels: doughnutEntries.map((entry) => entry.label),
      datasets: [
        {
          data: doughnutEntries.map((entry) => entry.value),
          backgroundColor: CHART_COLORS,
          borderColor: "#101a27",
          borderWidth: 4,
          hoverOffset: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",
      animation: prefersReducedMotion ? false : { duration: 850 },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9aabba",
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 7,
            boxHeight: 7,
            padding: 15,
            font: { family: "Inter", size: 9 },
          },
        },
        tooltip: {
          backgroundColor: "#101c29",
          borderColor: "rgba(84,230,242,.3)",
          borderWidth: 1,
          titleColor: "#edf5fb",
          bodyColor: "#a9bbc8",
          padding: 11,
        },
      },
    },
  });
}

function animateStatCards() {
  const cards = document.querySelectorAll(".stat-card");
  if (!window.anime || prefersReducedMotion) return;

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      window.anime.remove(card);
      window.anime({
        targets: card,
        scale: 1.025,
        duration: 220,
        easing: "easeOutCubic",
      });
    });
    card.addEventListener("mouseleave", () => {
      window.anime.remove(card);
      window.anime({
        targets: card,
        scale: 1,
        duration: 260,
        easing: "easeOutCubic",
      });
    });
  });
}

function initRevealAnimations() {
  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.gsap.utils.toArray(".reveal-item").forEach((element) => {
    window.gsap.fromTo(
      element,
      { y: 28, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: element, start: "top 88%", once: true },
      }
    );
  });
}

function initAmbientCanvas() {
  const canvas = $("#ambientCanvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  const points = [];
  const pointer = { x: -1000, y: -1000, active: false };
  let width = 0;
  let height = 0;
  let frameId = 0;
  const isSmallScreen = window.matchMedia("(max-width: 700px)").matches;
  const pointCount = isSmallScreen ? 27 : 64;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function seedPoints() {
    points.length = 0;
    for (let index = 0; index < pointCount; index += 1) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.3 + 0.55,
      });
    }
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    points.forEach((point, index) => {
      if (pointer.active && !prefersReducedMotion) {
        const dx = pointer.x - point.x;
        const dy = pointer.y - point.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 0) {
          const force = (190 - distance) / 19000;
          point.vx += dx * force;
          point.vy += dy * force;
        }
      }

      point.x += point.vx;
      point.y += point.vy;
      point.vx *= 0.992;
      point.vy *= 0.992;
      if (point.x < -15 || point.x > width + 15) point.vx *= -1;
      if (point.y < -15 || point.y > height + 15) point.vy *= -1;

      context.beginPath();
      context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(96, 213, 225, .55)";
      context.fill();

      for (let next = index + 1; next < points.length; next += 1) {
        const other = points[next];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance < 115) {
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = `rgba(84, 230, 242, ${
            0.095 * (1 - distance / 115)
          })`;
          context.lineWidth = 0.7;
          context.stroke();
        }
      }
    });

    if (pointer.active) {
      const gradient = context.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        180
      );
      gradient.addColorStop(0, "rgba(84, 230, 242, .075)");
      gradient.addColorStop(1, "rgba(84, 230, 242, 0)");
      context.fillStyle = gradient;
      context.fillRect(pointer.x - 180, pointer.y - 180, 360, 360);
    }

    if (!prefersReducedMotion) frameId = window.requestAnimationFrame(draw);
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  });
  canvas.addEventListener("pointerleave", () => {
    pointer.active = false;
  });
  window.addEventListener(
    "resize",
    () => {
      window.cancelAnimationFrame(frameId);
      resizeCanvas();
      seedPoints();
      if (prefersReducedMotion) draw();
      else frameId = window.requestAnimationFrame(draw);
    },
    { passive: true }
  );

  resizeCanvas();
  seedPoints();
  draw();
}

function showLoadError(error) {
  const panel = $("#loadError");
  $(
    "#loadErrorMessage"
  ).textContent = `${error.message}. Запустите index.html через локальный сервер, чтобы fetch('./data.json') работал.`;
  panel.hidden = false;
}

document.addEventListener("DOMContentLoaded", loadData);
