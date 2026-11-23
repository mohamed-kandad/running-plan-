import { Platform } from 'react-native';

/**
 * Picks an image from the device and stores it for one exercise.
 *
 * Native: the file is copied into the app's document directory, so it survives
 * restarts and works offline. Web: the image is downscaled and kept as a data
 * URL in the saved state (localStorage), since there is no app filesystem.
 *
 * Returns the stored URI / data URL, or null when the picker is cancelled.
 */

const MAX_WEB_SIDE = 900;
const MAX_NATIVE_BYTES = 12 * 1024 * 1024;

type PickedAsset = {
  uri: string;
  name?: string;
  mimeType?: string;
  file?: Blob;
  size?: number;
};

type WebImage = {
  width: number;
  height: number;
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

type WebCanvas = {
  width: number;
  height: number;
  getContext: (type: string) => {
    drawImage: (image: WebImage, x: number, y: number, w: number, h: number) => void;
  } | null;
  toDataURL: (type: string, quality?: number) => string;
};

type WebInput = {
  type: string;
  accept: string;
  style: { display: string };
  files: { 0?: Blob } | null;
  onchange: (() => void) | null;
  oncancel: (() => void) | null;
  click: () => void;
  remove: () => void;
};

type WebDocument = {
  createElement: (tag: string) => WebInput & WebCanvas;
  body: { appendChild: (node: unknown) => void };
};

type WebFileReader = {
  result: string | ArrayBuffer | null;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  readAsDataURL: (blob: Blob) => void;
};

function readAsDataUrl(blob: Blob): Promise<string> {
  const Reader = (globalThis as unknown as { FileReader: new () => WebFileReader }).FileReader;
  return new Promise((resolve, reject) => {
    const reader = new Reader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(blob);
  });
}

function downscaleDataUrl(dataUrl: string): Promise<string> {
  const IMAGE_CACHE = (globalThis as unknown as { Image: new () => WebImage }).Image;
  const doc = (globalThis as unknown as { document: { createElement: (t: string) => WebCanvas } })
    .document;
  return new Promise((resolve, reject) => {
    const image = new IMAGE_CACHE();
    image.onload = () => {
      const side = Math.max(image.width, image.height, 1);
      const scale = Math.min(1, MAX_WEB_SIDE / side);
      const canvas = doc.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not process that image.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => reject(new Error('Could not decode that image.'));
    image.src = dataUrl;
  });
}

async function processWebFile(file: Blob): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  return downscaleDataUrl(dataUrl);
}

/** Web has no document picker file object we can rely on, so own the input. */
function pickOnWeb(): Promise<string | null> {
  const doc = (globalThis as unknown as { document: WebDocument }).document;
  const input = doc.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';
  doc.body.appendChild(input);
  return new Promise((resolve, reject) => {
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      processWebFile(file).then(resolve).catch(reject);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    input.click();
  });
}

async function storeOnNative(exerciseId: string, asset: PickedAsset): Promise<string> {
  if (asset.size && asset.size > MAX_NATIVE_BYTES) {
    throw new Error('That image is too large. Choose one under 12 MB.');
  }
  const { File, Paths } = await import('expo-file-system');
  const source = new File(asset.uri);
  const bytes = await source.bytes();
  const extension = (asset.mimeType?.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
  const target = new File(Paths.document, 'exercise-images', `${exerciseId}-${Date.now()}.${extension}`);
  target.create({ intermediates: true, overwrite: true });
  target.write(bytes);
  return target.uri;
}

export async function pickExercisePhoto(exerciseId: string): Promise<string | null> {
  if (Platform.OS === 'web') return pickOnWeb();

  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: 'image/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return storeOnNative(exerciseId, result.assets[0] as unknown as PickedAsset);
}

/** Removes a previously stored native file (web data URLs live in state only). */
export async function deleteExercisePhoto(uri: string): Promise<void> {
  if (!uri.startsWith('file://')) return;
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing file is fine — the state entry is removed regardless.
  }
}
