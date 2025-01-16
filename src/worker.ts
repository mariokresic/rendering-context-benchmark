import { OnMessagePayload } from "./main";

export type WorkerMessage = { pixelLocation: number, pixels: Uint8Array };

onmessage = (e: MessageEvent<OnMessagePayload>) => {
    const locationOfDirtyPixel = e.data.pixels.indexOf(255);

    const transferables = e.data.useTransferables ? [e.data.pixels.buffer] : [];

    postMessage({
        pixelLocation: locationOfDirtyPixel,
        pixels: e.data.pixels
    }, transferables);
};
