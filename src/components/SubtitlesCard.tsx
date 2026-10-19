import { Captions } from "lucide-react";
import type { SubtitleFormat } from "../bindings/SubtitleFormat";
import type { SubtitleOptions } from "../bindings/SubtitleOptions";
import { useI18n } from "../i18n";
import { useEngine } from "../store/engine";
import { usePrefs } from "../store/prefs";
import { Button, Card, Field, Segmented, Switch } from "./ui";

export function SubtitlesCard() {
  const o = usePrefs((s) => s.options);
  const setOptions = usePrefs((s) => s.setOptions);
  const openSettings = useEngine((s) => s.openSettings);
  const { t } = useI18n();
  const s = o.subtitles;
  const set = (patch: Partial<SubtitleOptions>) => setOptions({ subtitles: { ...s, ...patch } });
  const forced = o.bundle;
  const enabled = s.enabled || forced;

  return (
    <Card title={t("subtitles.title")} icon={<Captions />}>
      <Switch
        checked={enabled}
        disabled={forced}
        onChange={(enabled) => set({ enabled })}
        label={t("subtitles.download")}
        description={t("subtitles.downloadDesc")}
      />
      {enabled && (
        <div className="mt-1 space-y-1 border-t border-line pt-2">
          <Switch
            checked={s.includeAuto || forced}
            disabled={forced}
            onChange={(includeAuto) => set({ includeAuto })}
            label={t("subtitles.includeAuto")}
            description={t("subtitles.includeAutoDesc")}
          />
          <Field label={t("subtitles.languages")}>
            <Button
              variant="ghost"
              className="py-1 font-mono text-xs"
              title={t("subtitles.changeLanguageTitle")}
              onClick={() => openSettings("general")}
            >
              {s.languages.trim() || "en"} · {t("subtitles.change")}
            </Button>
          </Field>
          <Field label={t("subtitles.fileFormat")}>
            <Segmented
              label={t("subtitles.subtitleFormat")}
              disabled={forced}
              value={forced ? "srt" : s.format}
              onChange={(format: SubtitleFormat) => set({ format })}
              options={[
                { value: "srt", label: "SRT" },
                { value: "vtt", label: "VTT" },
              ]}
            />
          </Field>
          <Switch
            checked={s.embed && !forced}
            disabled={forced || o.audioOnly}
            onChange={(embed) => set({ embed })}
            label={t("subtitles.embedInVideo")}
            description={t("subtitles.embedInVideoDesc")}
          />
        </div>
      )}
    </Card>
  );
}
