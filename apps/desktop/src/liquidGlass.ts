import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import * as FS from "node:fs";
import * as Path from "node:path";

export interface GlassOptions {
  cornerRadius?: number;
  tintColor?: string;
  opaque?: boolean;
}

export type GlassMaterialVariant = number;

export const GlassMaterialVariant = {
  regular: 0,
  clear: 1,
  dock: 2,
  appIcons: 3,
  widgets: 4,
  text: 5,
  avplayer: 6,
  facetime: 7,
  controlCenter: 8,
  notificationCenter: 9,
  monogram: 10,
  bubbles: 11,
  identity: 12,
  focusBorder: 13,
  focusPlatter: 14,
  keyboard: 15,
  sidebar: 16,
  abuttedSidebar: 17,
  inspector: 18,
  control: 19,
  loupe: 20,
  slider: 21,
  camera: 22,
  cartouchePopover: 23,
} as const;

interface LiquidGlassNativeBindings {
  addView(handle: Buffer, options: GlassOptions): number;
  setVariant(id: number, variant: GlassMaterialVariant): void;
  setScrimState(id: number, scrim: number): void;
  setSubduedState(id: number, subdued: number): void;
  clearViews(): void;
}

interface NativeAddonModule {
  LiquidGlassNative: new () => LiquidGlassNativeBindings;
}

function resolveNativeAddonPath(): string | null {
  const candidate = Path.join(
    __dirname,
    "../native/liquidglass/build/Release/liquidglass.node",
  );
  return FS.existsSync(candidate) ? candidate : null;
}

const require = createRequire(__filename);

function loadNativeAddon(): NativeAddonModule | null {
  if (process.platform !== "darwin") {
    return null;
  }

  const addonPath = resolveNativeAddonPath();
  if (!addonPath) {
    return null;
  }

  try {
    return require(addonPath) as NativeAddonModule;
  } catch (error) {
    console.error("dpcode failed to load the liquid glass native addon.", error);
    return null;
  }
}

export class LiquidGlass {
  private readonly addon: LiquidGlassNativeBindings | null;
  private isGlassSupportedCache: boolean | undefined;

  readonly GlassMaterialVariant = GlassMaterialVariant;

  constructor() {
    const nativeModule = loadNativeAddon();
    this.addon = nativeModule ? new nativeModule.LiquidGlassNative() : null;
  }

  isGlassSupported(): boolean {
    if (this.isGlassSupportedCache !== undefined) {
      return this.isGlassSupportedCache;
    }

    if (process.platform !== "darwin") {
      this.isGlassSupportedCache = false;
      return this.isGlassSupportedCache;
    }

    try {
      const majorVersion = Number(
        execSync("sw_vers -productVersion").toString().trim().split(".")[0],
      );
      this.isGlassSupportedCache = majorVersion >= 26;
    } catch {
      this.isGlassSupportedCache = false;
    }

    return this.isGlassSupportedCache;
  }

  addView(handle: Buffer, options: GlassOptions = {}): number {
    if (!Buffer.isBuffer(handle)) {
      throw new Error("[liquidGlass.addView] handle must be a Buffer");
    }

    if (!this.addon) {
      return -1;
    }

    return this.addon.addView(handle, options);
  }

  unstable_setVariant(id: number, variant: GlassMaterialVariant): void {
    this.addon?.setVariant?.(id, variant);
  }

  unstable_setScrim(id: number, scrim: number): void {
    this.addon?.setScrimState?.(id, scrim);
  }

  unstable_setSubdued(id: number, subdued: number): void {
    this.addon?.setSubduedState?.(id, subdued);
  }

  clearViews(): void {
    this.addon?.clearViews?.();
  }
}

const liquidGlass = new LiquidGlass();
export default liquidGlass;
