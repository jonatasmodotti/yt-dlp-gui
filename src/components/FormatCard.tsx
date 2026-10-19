import { Clapperboard, Music, Package, SlidersHorizontal } from "lucide-react";
import type { AudioFormat } from "../bindings/AudioFormat";
import type { ThumbnailMode } from "../bindings/ThumbnailMode";
import { type TranslationKey, useI18n } from "../i18n";
import { usePrefs } from "../store/prefs";
import { Card, Field, Segmented, Select, Switch } from "./ui";

const HEIGHTS = [null, 2160, 1440, 1080, 720, 480] as const;
const THUMBNAILS: { value: ThumbnailMode; labelKey: TranslationKey }[] = [
  { value: "off", labelKey: "format.thumbnailOff" },
  { value: "save", labelKey: "format.thumbnailSave" },
  { value: "embed", labelKey: "format.thumbnailEmbed" },
  { value: "both", labelKey: "format.thumbnailBoth" },
];

export function FormatCard() {
  const o = usePrefs((s) => s.options);
  const set = usePrefs((s) => s.setOptions);
  const { t } = useI18n();
  const locked = o.bundle;

  return (
    <Card title={t("format.title")} icon={<SlidersHorizontal />}>
      <div
        className={
          o.bundle
            ? "mb-3 rounded-lg border border-accent/40 bg-accent-soft px-3"
            : "mb-3 rounded-lg border border-line px-3"
        }
      >
        <Switch
          checked={o.bundle}
          onChange={(bundle) => set({ bundle })}
          label={t("format.downloadAll")}
          description={t("format.downloadAllDesc")}
        />
      </div>

      <div className="space-y-1">
        <Field label={t("format.type")}>
          <Segmented
            label={t("format.mediaType")}
            disabled={locked}
            value={o.audioOnly && !locked ? "audio" : "video"}
            onChange={(v) => set({ audioOnly: v === "audio" })}
            options={[
              { value: "video", label: t("format.video"), icon: <Clapperboard /> },
              { value: "audio", label: t("format.audioOnly"), icon: <Music /> },
            ]}
          />
        </Field>

        {o.audioOnly && !locked ? (
          <Field label={t("format.audioFormat")}>
            <Select
              aria-label={t("format.audioFormat")}
              value={o.audioFormat}
              onChange={(e) => set({ audioFormat: e.target.value as AudioFormat })}
            >
              <option value="mp3">MP3</option>
              <option value="m4a">M4A (AAC)</option>
              <option value="wav">{t("format.wavLossless")}</option>
            </Select>
          </Field>
        ) : (
          <Field label={t("format.maxQuality")}>
            <Select
              aria-label={t("format.maxQualityAriaLabel")}
              disabled={locked}
              value={o.maxHeight ?? ""}
              onChange={(e) => set({ maxHeight: e.target.value ? Number(e.target.value) : null })}
            >
              {HEIGHTS.map((h) => (
                <option key={h ?? "best"} value={h ?? ""}>
                  {h ? `${h}p` : t("format.bestAvailable")}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {(!o.audioOnly || locked) && (
          <Switch
            checked={o.compatibleVideo}
            onChange={(compatibleVideo) => set({ compatibleVideo })}
            label={t("format.compatible")}
            description={t("format.compatibleDesc")}
          />
        )}

        <Field label={t("format.thumbnail")}>
          <Select
            aria-label={t("format.thumbnail")}
            disabled={locked}
            value={locked ? "both" : o.thumbnail}
            onChange={(e) => set({ thumbnail: e.target.value as ThumbnailMode })}
          >
            {THUMBNAILS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.labelKey)}
              </option>
            ))}
          </Select>
        </Field>

        <Switch
          checked={o.playlist}
          onChange={(playlist) => set({ playlist })}
          label={t("format.wholePlaylist")}
          description={t("format.wholePlaylistDesc")}
        />
      </div>
      {locked && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Package className="size-3.5" /> {t("format.lockedByDownloadAll")}
        </p>
      )}
    </Card>
  );
}
