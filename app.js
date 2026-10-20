const page = document.body;
const opening = document.querySelector("#opening");
const startButton = document.querySelector("#startJourney");
const skipButton = document.querySelector("#skipJourney");
const musicToggle = document.querySelector("#musicToggle");
const musicLabel = document.querySelector("#musicLabel");
const journeyStatus = document.querySelector("#journeyStatus");
const gardenBack = document.querySelector("#gardenBack");
const gardenFront = document.querySelector("#gardenFront");
const letterRain = document.querySelector("#letterRain");
const letterHint = document.querySelector("#letterHint");
const wishOverlay = document.querySelector("#wishOverlay");
const wishTitle = document.querySelector("#wishTitle");
const replayButton = document.querySelector("#replayJourney");
const moreFlowersButton = document.querySelector("#moreFlowers");
const petalStage = document.querySelector("#petalStage");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const JOURNEY_DURATION = 8800;
const JOURNEY_START_DELAY = 650;

const flowerColors = [
  ["#ef7897", "#f5ce6f"],
  ["#f29a72", "#8f2e50"],
  ["#f7d8df", "#c34b70"],
  ["#dca0cf", "#f3d272"],
  ["#f0c35d", "#9e3155"],
];

let journeyFrame = null;
let journeyStartTimer = null;
let journeyToken = 0;
let audioContext = null;
let masterGain = null;
let musicTimer = null;
let musicMuted = false;

function createFlower(progress = Math.random(), freePlacement = false) {
  const flower = document.createElement("span");
  const stem = document.createElement("span");
  const bloom = document.createElement("span");
  const center = document.createElement("b");
  const petalCount = Math.random() > 0.48 ? 8 : 7;
  const palette = flowerColors[Math.floor(Math.random() * flowerColors.length)];
  const useFrontLayer = freePlacement ? Math.random() > 0.45 : Math.round(progress * 20) % 2 === 0;
  const layer = useFrontLayer ? gardenFront : gardenBack;
  const x = freePlacement ? 5 + Math.random() * 90 : 4 + progress * 75 + (Math.random() * 5 - 2.5);
  const routeBottom = 12 + progress * 10;
  const bottom = freePlacement
    ? 12 + Math.random() * 25
    : routeBottom + (useFrontLayer ? -2 + Math.random() * 3 : 7 + Math.random() * 5);
  const height = 70 + Math.random() * 75;
  const scale = freePlacement ? 0.55 + Math.random() * 0.65 : 1.05 - progress * 0.35 + Math.random() * 0.18;
  const tilt = -10 + Math.random() * 20;

  flower.className = "road-flower";
  stem.className = "road-flower__stem";
  bloom.className = "road-flower__bloom";
  center.className = "road-flower__center";
  flower.style.setProperty("--flower-x", `${x}%`);
  flower.style.setProperty("--flower-bottom", `${bottom}%`);
  flower.style.setProperty("--flower-height", `${height}px`);
  flower.style.setProperty("--flower-scale", scale.toFixed(2));
  flower.style.setProperty("--flower-tilt", `${tilt.toFixed(1)}deg`);
  flower.style.setProperty("--flower-delay", `${Math.random() * 90}ms`);
  flower.style.setProperty("--flower-color", palette[0]);
  flower.style.setProperty("--flower-center", palette[1]);
  flower.style.setProperty("--petal-count", petalCount);
  for (let index = 0; index < petalCount; index += 1) {
    const petal = document.createElement("i");
    petal.className = "road-flower__petal";
    petal.style.setProperty("--petal-index", index);
    bloom.appendChild(petal);
  }
  bloom.appendChild(center);
  flower.append(stem, bloom);
  layer.appendChild(flower);
}

function clearGarden() {
  gardenBack.replaceChildren();
  gardenFront.replaceChildren();
}

function celebrate(amount = 36, originX = 50, originY = 54) {
  if (prefersReducedMotion.matches) return;

  const colors = ["#ef7897", "#f29a72", "#f7d8df", "#f0c35d", "#fff4eb"];
  for (let index = 0; index < amount; index += 1) {
    const petal = document.createElement("span");
    const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.35;
    const distance = 90 + Math.random() * 270;
    petal.className = "celebration-petal";
    petal.style.setProperty("--petal-left", `${originX}%`);
    petal.style.setProperty("--petal-top", `${originY}%`);
    petal.style.setProperty("--petal-x", `${Math.cos(angle) * distance}px`);
    petal.style.setProperty("--petal-y", `${Math.sin(angle) * distance + 85}px`);
    petal.style.setProperty("--petal-spin", `${180 + Math.random() * 520}deg`);
    petal.style.setProperty("--petal-size", `${7 + Math.random() * 10}px`);
    petal.style.setProperty("--petal-color", colors[index % colors.length]);
    petal.style.animationDelay = `${Math.random() * 130}ms`;
    petalStage.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove(), { once: true });
  }
}

function scheduleNote(frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const noteGain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  noteGain.gain.setValueAtTime(0.0001, startTime);
  noteGain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.045);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(noteGain);
  noteGain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);

  const shimmer = audioContext.createOscillator();
  const shimmerGain = audioContext.createGain();
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(frequency * 2, startTime);
  shimmerGain.gain.setValueAtTime(0.0001, startTime);
  shimmerGain.gain.exponentialRampToValueAtTime(0.035, startTime + 0.03);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.8);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(masterGain);
  shimmer.start(startTime);
  shimmer.stop(startTime + duration);
}

function playMusicPhrase() {
  if (!audioContext || audioContext.state === "closed") return;
  const notes = [261.63, 329.63, 392, 329.63, 220, 261.63, 329.63, 261.63, 174.61, 220, 261.63, 220, 196, 246.94, 293.66, 196];
  const beat = 0.46;
  const start = audioContext.currentTime + 0.08;
  notes.forEach((note, index) => scheduleNote(note, start + index * beat, beat * 1.65));
}

function startMusic() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) {
    musicLabel.textContent = "Không hỗ trợ nhạc";
    musicToggle.disabled = true;
    return;
  }

  if (!audioContext) {
    audioContext = new AudioEngine();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    masterGain.connect(audioContext.destination);
    masterGain.gain.exponentialRampToValueAtTime(0.085, audioContext.currentTime + 1.2);
    playMusicPhrase();
    musicTimer = window.setInterval(playMusicPhrase, 7360);
  } else if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function setMusicMuted(shouldMute) {
  musicMuted = shouldMute;
  musicToggle.setAttribute("aria-pressed", String(!musicMuted));
  musicLabel.textContent = musicMuted ? "Nhạc: tắt" : "Nhạc: bật";
  if (masterGain && audioContext) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(musicMuted ? 0.0001 : 0.085, audioContext.currentTime, 0.08);
  }
}

function clearLetters() {
  letterRain.replaceChildren();
  letterRain.setAttribute("aria-hidden", "true");
  letterHint.setAttribute("aria-hidden", "true");
}

function openWish() {
  if (page.classList.contains("journey-complete")) return;
  page.classList.remove("journey-arrived");
  page.classList.add("journey-complete");
  letterRain.setAttribute("aria-hidden", "true");
  letterHint.setAttribute("aria-hidden", "true");
  wishOverlay.setAttribute("aria-hidden", "false");
  journeyStatus.textContent = "Lá thư đã mở — lời chúc 20/10 dành cho tất cả mọi người!";
  celebrate(44);
  window.setTimeout(() => wishTitle.focus({ preventScroll: true }), 850);
}

function createFallingLetter(index) {
  const letter = document.createElement("button");
  const envelope = document.createElement("span");
  const seal = document.createElement("i");
  const positions = [11, 25, 40, 55, 70, 85, 18, 48, 77];
  const landingHeight = window.innerHeight * (0.5 + (index % 3) * 0.085);

  letter.className = "falling-letter";
  letter.type = "button";
  letter.setAttribute("aria-label", "Mở lá thư chúc mừng ngày 20 tháng 10");
  envelope.className = "falling-letter__envelope";
  seal.className = "falling-letter__seal";
  seal.textContent = "♡";
  envelope.appendChild(seal);
  letter.appendChild(envelope);
  letter.style.setProperty("--letter-left", `${positions[index % positions.length]}%`);
  letter.style.setProperty("--fall-y", `${landingHeight}px`);
  letter.style.setProperty("--letter-drift", `${-34 + (index % 4) * 22}px`);
  letter.style.setProperty("--letter-start-rotate", `${-18 + (index % 5) * 9}deg`);
  letter.style.setProperty("--letter-end-rotate", `${-9 + (index % 4) * 6}deg`);
  letter.style.setProperty("--letter-delay", `${index * 260}ms`);
  letter.style.setProperty("--letter-duration", `${3300 + (index % 4) * 420}ms`);
  letter.addEventListener("click", openWish);
  letterRain.appendChild(letter);
}

function startLetterRain() {
  clearLetters();
  letterRain.setAttribute("aria-hidden", "false");
  letterHint.setAttribute("aria-hidden", "false");
  for (let index = 0; index < 9; index += 1) createFallingLetter(index);
}

function finishJourney(token = journeyToken) {
  if (
    token !== journeyToken ||
    page.classList.contains("journey-arrived") ||
    page.classList.contains("journey-complete")
  ) return;
  if (journeyFrame) cancelAnimationFrame(journeyFrame);
  if (journeyStartTimer) window.clearTimeout(journeyStartTimer);
  journeyFrame = null;
  journeyStartTimer = null;
  page.classList.add("journey-arrived");
  journeyStatus.textContent = "Những lá thư đã đến — hãy chọn một lá để mở lời chúc!";
  startLetterRain();
  celebrate(18, 67, 48);
}

function runFlowerTrail(token) {
  const duration = JOURNEY_DURATION;
  const startTime = performance.now();
  let nextFlowerAt = 0.06;
  let statusStep = 0;

  function frame(now) {
    if (token !== journeyToken) return;
    const progress = Math.min((now - startTime) / duration, 1);

    while (progress >= nextFlowerAt && nextFlowerAt < 0.92) {
      createFlower(nextFlowerAt);
      nextFlowerAt += 0.058 + Math.random() * 0.028;
    }

    if (progress > 0.28 && statusStep === 0) {
      journeyStatus.textContent = "Những bông hoa đang nở theo bánh xe…";
      statusStep = 1;
    }
    if (progress > 0.68 && statusStep === 1) {
      journeyStatus.textContent = "Chuyến xe sắp mang những lá thư đến nơi…";
      statusStep = 2;
    }

    if (progress < 1) {
      journeyFrame = requestAnimationFrame(frame);
    } else {
      finishJourney(token);
    }
  }

  journeyFrame = requestAnimationFrame(frame);
}

function beginJourney({ firstStart = false } = {}) {
  journeyToken += 1;
  const token = journeyToken;
  if (journeyFrame) cancelAnimationFrame(journeyFrame);
  if (journeyStartTimer) window.clearTimeout(journeyStartTimer);
  clearGarden();
  clearLetters();
  petalStage.replaceChildren();
  page.classList.remove("journey-arrived", "journey-complete", "experience-started");
  wishOverlay.setAttribute("aria-hidden", "true");
  journeyStatus.textContent = "Chuyến xe hoa đang khởi hành…";

  void page.offsetWidth;
  page.classList.add("experience-started");

  if (firstStart) {
    startMusic();
    window.setTimeout(() => {
      opening.setAttribute("aria-hidden", "true");
    }, prefersReducedMotion.matches ? 20 : 1150);
  }

  journeyStartTimer = window.setTimeout(() => {
    journeyStartTimer = null;
    runFlowerTrail(token);
  }, JOURNEY_START_DELAY);
}

startButton.addEventListener("click", () => beginJourney({ firstStart: true }));

skipButton.addEventListener("click", () => {
  for (let index = 0; index < 18; index += 1) createFlower(index / 20);
  finishJourney();
});

replayButton.addEventListener("click", () => beginJourney());

moreFlowersButton.addEventListener("click", () => {
  for (let index = 0; index < 7; index += 1) createFlower(Math.random(), true);
  celebrate(18, 35, 68);
  journeyStatus.textContent = "Thêm một ôm hoa dành tặng tất cả mọi người!";
});

musicToggle.addEventListener("click", () => {
  if (!audioContext) startMusic();
  setMusicMuted(!musicMuted);
});

window.addEventListener("pagehide", () => {
  if (musicTimer) window.clearInterval(musicTimer);
  if (audioContext && audioContext.state !== "closed") audioContext.close();
});
