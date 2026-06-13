import React from "react";
import { invoke } from "@tauri-apps/api/core";
import SectionCard from "../components/SectionCard";
import SectionHeader from "../components/SectionHeader";
import Slider from "../components/Slider";
import SettingRow from "../components/SettingRow";
import Toggle from "../components/Toggle";
import StyledSelect from "../components/StyledSelect";

interface PlaybackSectionProps {
  defaultVolume: number;
  setDefaultVolume: (v: number) => void;
  setPlayerVolume: (v: number) => void;
  crossfade: number;
  setCrossfade: (v: number) => void;
  gapless: boolean;
  setGapless: (v: boolean) => void;
  audioQuality: string;
  setAudioQuality: (v: string) => void;
}

const PlaybackSection: React.FC<PlaybackSectionProps> = ({
  defaultVolume,
  setDefaultVolume,
  setPlayerVolume,
  crossfade,
  setCrossfade,
  gapless,
  setGapless,
  audioQuality,
  setAudioQuality,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SectionCard>
        <SectionHeader
          icon="▶"
          title="Playback"
          desc="Audio engine & behavior"
          accent="rgba(124,106,245,0.1)"
        />
        <div style={{ padding: "4px 24px 12px" }}>
          <div
            style={{
              paddingTop: "12px",
              paddingBottom: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <Slider
              label="Default Volume"
              value={defaultVolume}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => {
                setDefaultVolume(v);
                setPlayerVolume(v);
                invoke("set_volume", { level: v / 100 }).catch(console.error);
              }}
            />
          </div>
          <div
            style={{
              paddingTop: "16px",
              paddingBottom: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <Slider
              label="Crossfade"
              value={crossfade}
              min={0}
              max={12}
              unit="s"
              onChange={setCrossfade}
            />
          </div>
          <SettingRow
            label="Gapless Playback"
            desc="Eliminate silence between tracks"
            control={
              <Toggle
                checked={gapless}
                onChange={setGapless}
                setting="gapless"
              />
            }
          />
          <SettingRow
            label="Audio Quality"
            desc="Streaming bitrate preference"
            last
            control={
              <StyledSelect
                value={audioQuality}
                onChange={setAudioQuality}
                setting="audioQuality"
                options={[
                  { value: "low", label: "Low — 96 kbps" },
                  { value: "medium", label: "Medium — 160 kbps" },
                  { value: "high", label: "High — 320 kbps" },
                  { value: "lossless", label: "Lossless — FLAC" },
                ]}
              />
            }
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default PlaybackSection;
