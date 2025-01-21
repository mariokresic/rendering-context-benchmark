import { FPS } from "yy-fps";
import { WorkerMessage } from "./worker";

const worker = new Worker(new URL("./worker.ts", import.meta.url));

const fps = new FPS({
    FPS: 120,
});

const canvas2d = document.createElement("canvas");
const canvasWebgl2 = document.createElement("canvas");

type GraphicsKey = "2d" | "webgl2";

const resolutions = {
    "1080p": [1920, 1080],
    "4k": [3840, 2160],
    "8k": [7680, 4320],
    "16k": [15360, 8640],
} as const;

type ResolutionKey = keyof typeof resolutions;

export type OnMessagePayload = {
    pixels: Uint8Array;
    useTransferables: boolean;
};

// HTML elements
const graphicsField = document.querySelector("#graphics") as HTMLFieldSetElement;
const resolutionField = document.querySelector("#resolution") as HTMLFieldSetElement;
const workersCheckbox = document.querySelector("#workers") as HTMLInputElement;
const transferablesCheckbox = document.querySelector("#transferable") as HTMLInputElement;
const playPauseButton = document.querySelector("#playPauseButton") as HTMLButtonElement;

// state
let animationFrame: number;
let randomPixelLocation: 0 | 1 = 0;
let isPlaying = false;

// input state
let selectedGraphics = graphicsField.querySelector<HTMLInputElement>("input:checked")!.value as GraphicsKey;
let selectedResolutionKey = resolutionField.querySelector<HTMLInputElement>("input:checked")!.value as ResolutionKey;
let resolution = resolutions[selectedResolutionKey];
let useWorkers = workersCheckbox.checked;
let useTransferables = transferablesCheckbox.checked;

let pixels: Uint8Array = new Uint8Array(resolution[0] * resolution[1] * 4);

// respond to worker
worker.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
    const framesInSync = e.data.pixelLocation === randomPixelLocation;

    pixels = e.data.pixels;

    if (framesInSync && isPlaying) {
        animationFrame = requestAnimationFrame(draw);
    }
});

graphicsField.addEventListener("change", (e) => {
    selectedGraphics = (e.target as HTMLInputElement).value as GraphicsKey;
    if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        console.log(`Playing ${selectedGraphics} in ${selectedResolutionKey}...`);
        animationFrame = requestAnimationFrame(draw);
    }
});
resolutionField.addEventListener("change", (e) => {
    selectedResolutionKey = (e.target as HTMLInputElement).value as ResolutionKey;
    resolution = resolutions[selectedResolutionKey];
    pixels = new Uint8Array(resolution[0] * resolution[1] * 4);

    if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        console.log(`Playing ${selectedGraphics} in ${selectedResolutionKey}...`);
        animationFrame = requestAnimationFrame(draw);
    }
});
workersCheckbox.addEventListener("change", () => {
    useWorkers = workersCheckbox.checked;
    transferablesCheckbox.disabled = !useWorkers;

    if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        console.log(`Playing ${selectedGraphics} in ${selectedResolutionKey}...`);
        animationFrame = requestAnimationFrame(draw);
    }
});
transferablesCheckbox.addEventListener("change", () => {
    useTransferables = transferablesCheckbox.checked;
    if (isPlaying) {
        cancelAnimationFrame(animationFrame);
        console.log(`Playing ${selectedGraphics} in ${selectedResolutionKey}...`);
        animationFrame = requestAnimationFrame(draw);
    }
});
playPauseButton.addEventListener("click", () => {
    if (isPlaying) {
        console.log("Paused");
        cancelAnimationFrame(animationFrame);
        playPauseButton.textContent = "Play";
    } else {
        console.log(`Playing ${selectedGraphics} in ${selectedResolutionKey}...`);
        animationFrame = requestAnimationFrame(draw);
        playPauseButton.textContent = "Pause";
    }
    isPlaying = !isPlaying;
});

function get2dContext(): CanvasRenderingContext2D {
    const context = canvas2d.getContext("2d", { willReadFrequently: true });
    if (!context) {
        throw new Error("2d context not available");
    }
    return context;
}

function getWebgl2Context(): WebGL2RenderingContext {
    const context = canvasWebgl2.getContext("webgl2", { powerPreference: "high-performance" });
    if (!context) {
        throw new Error("Webgl2 context not available");
    }
    return context;
}

function draw() {
    if (!worker) {
        return;
    }

    fps.frame();

    let ctx: CanvasRenderingContext2D | WebGL2RenderingContext;
    let canvas: HTMLCanvasElement = selectedGraphics === "2d" ? canvas2d : canvasWebgl2;

    canvas.width = resolution[0];
    canvas.height = resolution[1];

    if (selectedGraphics === "2d") {
        ctx = get2dContext();
        ctx.drawImage(canvas, 0, 0);
        pixels.set(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
    } else {
        ctx = getWebgl2Context();
        ctx.readPixels(0, 0, ctx.drawingBufferWidth, ctx.drawingBufferHeight, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
    }

    randomPixelLocation = randomPixelLocation === 0 ? 1 : 0;
    pixels[randomPixelLocation] = 255;

    if (useWorkers) {
        const transferables = useTransferables ? [pixels.buffer] : [];

        worker.postMessage({ pixels, useTransferables }, transferables);
    } else {
        animationFrame = requestAnimationFrame(draw);
    }
}