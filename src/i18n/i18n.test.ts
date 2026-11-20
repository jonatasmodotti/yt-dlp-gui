import { describe, expect, it } from "vitest";
import { postprocessorLabel } from "../lib/format";
import {
  createTranslator,
  DICTIONARIES,
  detectLanguage,
  en,
  interpolate,
  LANGUAGES,
  translateText,
} from "./index";

describe("i18n", () => {
  it("keeps all dictionaries in sync with English keys and non-empty values", () => {
    const enKeys = Object.keys(en).sort();
    for (const { value: code } of LANGUAGES) {
      const dict = DICTIONARIES[code];
      expect(Object.keys(dict).sort()).toEqual(enKeys);
      for (const [key, text] of Object.entries(dict)) {
        expect(text.trim().length, `${code}.${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("interpolates placeholders and preserves unknown ones", () => {
    expect(interpolate("Download {count}", { count: 3 })).toBe("Download 3");
    expect(interpolate("{a} of {b}", { a: "1 MB" })).toBe("1 MB of {b}");
  });

  it("translates keys and interpolates parameters in English and Portuguese", () => {
    const tEn = createTranslator("en");
    const tPt = createTranslator("pt");
    expect(tEn("header.settings")).toBe("Settings");
    expect(tPt("header.settings")).toBe("Configurações");
    expect(tPt("urlBar.addedQueueOther", { count: 4 })).toBe("4 links adicionados à fila.");
  });

  it("translates known backend messages and leaves unknown text untouched", () => {
    expect(translateText("Please enter a URL", "pt")).toBe("Insira uma URL");
    expect(translateText("Please enter a URL", "en")).toBe("Please enter a URL");
    expect(translateText("custom error 123", "pt")).toBe("custom error 123");
  });

  it("detects supported languages from locale tags", () => {
    expect(detectLanguage("pt-BR")).toBe("pt");
    expect(detectLanguage("pt_PT")).toBe("pt");
    expect(detectLanguage("en-US")).toBe("en");
    expect(detectLanguage("fr-FR")).toBe("en");
  });

  it("localizes postprocessor labels when given a translator", () => {
    const tPt = createTranslator("pt");
    expect(postprocessorLabel("Merger", tPt)).toBe("Mesclando vídeo e áudio");
    expect(postprocessorLabel("FixupM4a", tPt)).toBe("Ajustando contêiner");
    expect(postprocessorLabel("Custom", tPt)).toBe("Pós-processando (Custom)");
  });
});
