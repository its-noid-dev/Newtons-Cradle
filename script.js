let BALL_COUNT = 5;

const gravity = 9.81;
const length = 1.25;
const ballSize = 0.50;
const spacing = ballSize;

const damping = 0.995;
const bounce = 0.9;
const maxAngle = 1.3;
const swingLimit = 1.2;
const FORCE = 2.5;
const maxSpeed = 18;
const SAMPLE_WINDOW = 100;

const BALL_IMAGE = "ball.png";
const MAX_WIDTH_FILL = 0.92;

let infinite = false;
let soundOn = true;

let pendulums = [];
let angles = [];
let speeds = [];
let groupMask = [];
let lastClick = [];

let running = false;
let dragging = false;
let draggedBall = -1;
let lastTime = 0;
let samples = [];

let scale = 200;
let topY = 20;
let pivotXs = [];

const oldPendulums = document.querySelectorAll(".pendulum");
const host = oldPendulums.length ? oldPendulums[0].parentElement : document.body;

if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
}

const hostRect0 = host.getBoundingClientRect();

let frameCenterX = host.clientWidth / 2 || 225;
let frameTop = 20;
let frameWidth = 450;
let ropeLength = 200;

if (oldPendulums.length) {
    const first = oldPendulums[0].getBoundingClientRect();
    const last = oldPendulums[oldPendulums.length - 1].getBoundingClientRect();

    frameCenterX = (first.left + last.right) / 2 - hostRect0.left;
    frameTop = first.top - hostRect0.top;
    frameWidth = Math.max(last.right - first.left, 450);
    ropeLength = first.height > 50 ? first.height : 200;
}

oldPendulums.forEach(p => p.style.display = "none");

const stage = document.createElement("div");
stage.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    z-index: 1;
    user-select: none;
    -webkit-user-select: none;
`;
host.appendChild(stage);

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

function playClick(strength) {

    if (!soundOn || !audioCtx) return;

    const t = audioCtx.currentTime;
    const volume = Math.min(1, strength / 3) * 0.35;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(2200 + Math.random() * 300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.04);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
}

const panel = document.createElement("div");
panel.style.cssText = `
    position: fixed;
    top: 12px;
    left: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(30, 30, 30, 0.85);
    color: white;
    font: 600 14px sans-serif;
    border-radius: 10px;
    z-index: 9999;
    min-width: 190px;
`;
document.body.appendChild(panel);

function makeButton(onClick) {
    const b = document.createElement("button");
    b.style.cssText = `
        padding: 8px 12px;
        font: 600 14px sans-serif;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        color: white;
    `;
    b.addEventListener("click", onClick);
    panel.appendChild(b);
    return b;
}

const sliderLabel = document.createElement("label");
sliderLabel.style.cssText = "display:flex; flex-direction:column; gap:4px;";
const sliderText = document.createElement("span");
const slider = document.createElement("input");
slider.type = "range";
slider.min = 2;
slider.max = 12;
slider.step = 1;
slider.value = BALL_COUNT;
sliderLabel.appendChild(sliderText);
sliderLabel.appendChild(slider);
panel.appendChild(sliderLabel);

slider.addEventListener("input", () => {
    BALL_COUNT = parseInt(slider.value, 10);
    resetState();
    buildDOM();
    updateButtons();
});

const resetButton = makeButton(resetAll);
resetButton.textContent = "Reset (R)";
resetButton.style.background = "#c0392b";

function toggleSound() {
    soundOn = !soundOn;
    initAudio();
    updateButtons();
}

function toggleInfinite() {
    infinite = !infinite;
    updateButtons();
}

const soundButton = makeButton(toggleSound);
const infiniteButton = makeButton(toggleInfinite);

function updateButtons() {
    sliderText.textContent = `Balls: ${BALL_COUNT}`;

    soundButton.textContent = soundOn ? "Sound: On (S)" : "Sound: Off (S)";
    soundButton.style.background = soundOn ? "#2e9e4f" : "#777";

    infiniteButton.textContent = infinite ? "Infinite: On (I)" : "Infinite: Off (I)";
    infiniteButton.style.background = infinite ? "#2e9e4f" : "#777";
}

document.addEventListener("keydown", (event) => {
    const k = event.key.toLowerCase();
    if (k === "i") toggleInfinite();
    if (k === "r") resetAll();
    if (k === "s") toggleSound();
});

function resetState() {
    running = false;
    dragging = false;
    draggedBall = -1;

    angles = new Array(BALL_COUNT).fill(0);
    speeds = new Array(BALL_COUNT).fill(0);
    groupMask = new Array(BALL_COUNT).fill(false);
    lastClick = new Array(BALL_COUNT).fill(0);
}

function resetAll() {
    resetState();
    drawBalls();
}

function computeLayout() {

    topY = frameTop;

    const heightScale = ropeLength / (length + ballSize / 2);
    const widthScale = (frameWidth * MAX_WIDTH_FILL) / (BALL_COUNT * spacing);

    scale = Math.min(heightScale, widthScale);

    pivotXs = [];
    for (let i = 0; i < BALL_COUNT; i++) {
        pivotXs.push(frameCenterX + (i - (BALL_COUNT - 1) / 2) * spacing * scale);
    }
}

function buildDOM() {

    stage.innerHTML = "";
    pendulums = [];

    computeLayout();

    const r = (ballSize * scale) / 2;
    const L = length * scale;

    for (let i = 0; i < BALL_COUNT; i++) {

        const p = document.createElement("div");
        p.className = "cradle-pendulum";
        p.style.cssText = `
            position: absolute;
            left: ${pivotXs[i]}px;
            top: ${topY}px;
            width: 0;
            height: 0;
            transform-origin: 0 0;
            will-change: transform;
        `;

        const string = document.createElement("div");
        string.style.cssText = `
            position: absolute;
            left: -0.5px;
            top: 0;
            width: 1px;
            height: ${L - r}px;
            background: #9aa0a8;
        `;

        const ball = document.createElement("img");
        ball.className = "cradle-ball";
        ball.src = BALL_IMAGE;
        ball.draggable = false;
        ball.style.cssText = `
            position: absolute;
            left: ${-r}px;
            top: ${L - r}px;
            width: ${r * 2}px;
            height: ${r * 2}px;
            object-fit: contain;
            cursor: grab;
            touch-action: none;
            user-select: none;
            -webkit-user-drag: none;
        `;

        p.appendChild(string);
        p.appendChild(ball);
        stage.appendChild(p);
        pendulums.push(p);

        attachDrag(p, ball, i);
    }

    drawBalls();
}

function drawBalls() {
    for (let i = 0; i < pendulums.length; i++) {
        pendulums[i].style.transform = `rotate(${-angles[i]}rad)`;
    }
}

function startSimulation() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(update);
}

function stopSimulation() {
    running = false;
}

function setDragAngle(index, angle) {

    if (index === 0) angle = Math.min(angle, 0);
    if (index === BALL_COUNT - 1) angle = Math.max(angle, 0);

    angle = Math.max(-maxAngle, Math.min(maxAngle, angle));

    for (let j = 0; j < BALL_COUNT; j++) {

        let inGroup = false;

        if (angle < 0) inGroup = j <= index;
        else if (angle > 0) inGroup = j >= index;

        groupMask[j] = inGroup;
        angles[j] = inGroup ? angle : 0;
        speeds[j] = 0;
    }
}

function attachDrag(pendulum, ball, index) {

    ball.addEventListener("pointerdown", (event) => {

        event.preventDefault();
        initAudio();

        stopSimulation();
        speeds.fill(0);
        groupMask.fill(false);

        dragging = true;
        draggedBall = index;
        samples = [];

        ball.setPointerCapture(event.pointerId);
        ball.style.cursor = "grabbing";
    });

    ball.addEventListener("pointermove", (event) => {

        if (!dragging || draggedBall !== index) return;

        const rect = host.getBoundingClientRect();

        const dx = event.clientX - (rect.left + pivotXs[index]);
        const dy = event.clientY - (rect.top + topY);

        const rawAngle = Math.atan2(dx, dy);

        const now = performance.now();
        samples.push({ a: rawAngle, t: now });
        samples = samples.filter(s => now - s.t <= 200);

        setDragAngle(index, rawAngle);
        drawBalls();
    });

    const release = () => {

        if (!dragging || draggedBall !== index) return;

        dragging = false;
        draggedBall = -1;

        ball.style.cursor = "grab";

        const now = performance.now();
        const recent = samples.filter(s => now - s.t <= SAMPLE_WINDOW);

        let v = 0;

        if (recent.length >= 2) {
            const first = recent[0];
            const last = recent[recent.length - 1];
            const dt = (last.t - first.t) / 1000;

            if (dt > 0.001) {
                v = (last.a - first.a) / dt;
            }
        }

        v = Math.max(-maxSpeed, Math.min(maxSpeed, v * FORCE));

        for (let j = 0; j < BALL_COUNT; j++) {
            if (groupMask[j]) speeds[j] = v;
        }

        startSimulation();
    };

    ball.addEventListener("pointerup", release);
    ball.addEventListener("pointercancel", release);
}

function getPosition(i) {
    return i * spacing + length * Math.sin(angles[i]);
}

function getVelocity(i) {
    return length * Math.cos(angles[i]) * speeds[i];
}

function resolveCollisions() {

    for (let pass = 0; pass < 6; pass++) {

        for (let i = 0; i < BALL_COUNT - 1; i++) {

            const distance = getPosition(i + 1) - getPosition(i);

            if (distance > ballSize) continue;

            const v1 = getVelocity(i);
            const v2 = getVelocity(i + 1);

            if (v1 > v2) {

                const relative = v1 - v2;
                const now = performance.now();

                if (relative > 0.05 && now - lastClick[i] > 40) {
                    lastClick[i] = now;
                    playClick(relative);
                }

                speeds[i] = v2 / (length * Math.cos(angles[i]));
                speeds[i + 1] = v1 / (length * Math.cos(angles[i + 1]));
            }

            const overlap = ballSize - distance;
            if (overlap > 1e-9) {
                angles[i] -= overlap / 2 / (length * Math.cos(angles[i]));
                angles[i + 1] += overlap / 2 / (length * Math.cos(angles[i + 1]));
            }
        }
    }
}

function update(time) {

    if (!running) return;

    let dt = (time - lastTime) / 1000;
    lastTime = time;

    if (dt <= 0) {
        requestAnimationFrame(update);
        return;
    }

    dt = Math.min(dt, 1 / 30);

    const steps = 64;
    const h = dt / steps;

    const currentBounce = infinite ? 1 : bounce;

    for (let s = 0; s < steps; s++) {

        for (let i = 0; i < BALL_COUNT; i++) {
            const acceleration = -(gravity / length) * Math.sin(angles[i]);
            speeds[i] += acceleration * h;
            angles[i] += speeds[i] * h;

            if (!infinite) {
                speeds[i] *= Math.pow(damping, h);
            }

            speeds[i] = Math.max(-maxSpeed, Math.min(maxSpeed, speeds[i]));

            if (angles[i] > swingLimit) {
                angles[i] = swingLimit;
                if (speeds[i] > 0) speeds[i] = -speeds[i] * currentBounce;
            } else if (angles[i] < -swingLimit) {
                angles[i] = -swingLimit;
                if (speeds[i] < 0) speeds[i] = -speeds[i] * currentBounce;
            }
        }

        resolveCollisions();
    }

    drawBalls();

    requestAnimationFrame(update);
}

resetState();
buildDOM();
updateButtons();