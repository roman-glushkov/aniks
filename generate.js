// generate.js
const fs = require("fs");
const path = require("path");

// ==== Настройки ====
const CONFIG_PATH = "./config/config.js";
const IMAGES_DIR = "./images";

const IMAGE_EXT = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".bmp",
];
const VIDEO_EXT = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];
// ====================

function scan(dir, extensions) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Папка не найдена: ${dir}`);
    process.exit(1);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => extensions.includes(path.extname(f).toLowerCase()))
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    )
    .map((f) => `${dir}/${f}`.replace(/^\.\//, ""));
}

// Форматирует массив в красивый многострочный вид с отступом
function formatArray(items, indent) {
  if (items.length === 0) return "[]";
  const pad = " ".repeat(indent);
  return (
    "[\n" +
    items.map((i) => `${pad}"${i}",`).join("\n") +
    "\n" +
    " ".repeat(indent - 2) +
    "]"
  );
}

// Заменяет содержимое `ключ: [...]` в исходнике
function replaceArray(source, key, items) {
  // Ищем `key:` затем `[` ... `]` (не жадный, с учётом многострочности)
  const regex = new RegExp(`(${key}\\s*:\\s*)\\[[\\s\\S]*?\\]`, "m");
  if (!regex.test(source)) {
    throw new Error(`Не найден блок "${key}" в ${CONFIG_PATH}`);
  }
  // Определяем текущий отступ, чтобы сохранить стиль
  const match = source.match(new RegExp(`${key}\\s*:\\s*\\[`, "m"));
  const lineStart = source.lastIndexOf("\n", match.index) + 1;
  const indent = match.index - lineStart + match[0].length;
  const formatted = formatArray(items, indent + 2);
  return source.replace(regex, `$1${formatted}`);
}

// ==== Main ====
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`❌ Файл конфига не найден: ${CONFIG_PATH}`);
  process.exit(1);
}

let src = fs.readFileSync(CONFIG_PATH, "utf8");

const images = scan(IMAGES_DIR, IMAGE_EXT);
const videos = scan(IMAGES_DIR, VIDEO_EXT);

src = replaceArray(src, "images", images);
src = replaceArray(src, "videos", videos);

fs.writeFileSync(CONFIG_PATH, src, "utf8");

console.log(`✅ Обновлено в ${CONFIG_PATH}`);
console.log(`   • images: ${images.length}`);
console.log(`   • videos: ${videos.length}`);
