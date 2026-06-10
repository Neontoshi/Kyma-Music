import { useEffect, useRef, useMemo, useState } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
} from "chart.js";

Chart.register(
  LineElement,
  PointElement,
  LineController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
);

//  Types

interface HeatmapEntry {
  /** 0–23 */
  hour: number;
  /** 0 = Mon … 6 = Sun */
  day: number;
  count: number;
}

interface ListeningLineChartProps {
  heatmap: HeatmapEntry[];
}

//  Constants

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
});

const ACCENT = "#7C6AF5";
const ACCENT_FILL = "rgba(124,106,245,0.10)";
const ACCENT_FILL_DARK = "rgba(124,106,245,0.15)";

//  Helpers

function buildHourlyData(
  heatmap: HeatmapEntry[],
  filterDay: "all" | number,
): number[] {
  const totals = Array(24).fill(0);

  if (filterDay === "all") {
    // Sum all days then average across 7
    heatmap.forEach(({ hour, count }) => {
      totals[hour] += count;
    });
    return totals.map((v) => Math.round(v / 7));
  }

  heatmap
    .filter((d) => d.day === filterDay)
    .forEach(({ hour, count }) => {
      totals[hour] += count;
    });

  return totals.map((v) => Math.round(v));
}

function getPeakHour(data: number[]): number {
  return data.indexOf(Math.max(...data));
}

//  Component

export default function ListeningLineChart({
  heatmap,
}: ListeningLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [activeDay, setActiveDay] = useState<"all" | number>("all");
  const isDark = useMemo(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    [],
  );

  const chartData = useMemo(
    () => buildHourlyData(heatmap, activeDay),
    [heatmap, activeDay],
  );

  const peak = useMemo(() => getPeakHour(chartData), [chartData]);
  const totalPlays = useMemo(
    () => chartData.reduce((a, b) => a + b, 0),
    [chartData],
  );

  //  Chart initialisation / update

  useEffect(() => {
    if (!canvasRef.current) return;

    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const tickColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";

    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels: HOUR_LABELS,
          datasets: [
            {
              label: "Plays",
              data: chartData,
              borderColor: ACCENT,
              backgroundColor: isDark ? ACCENT_FILL_DARK : ACCENT_FILL,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: ACCENT,
              pointHoverBorderColor: isDark ? "#1a1730" : "#fff",
              pointHoverBorderWidth: 2,
              fill: true,
              tension: 0.45,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          animation: { duration: 280, easing: "easeInOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#1e1c2e" : "#ffffff",
              borderColor: isDark
                ? "rgba(124,106,245,0.25)"
                : "rgba(124,106,245,0.18)",
              borderWidth: 1,
              titleColor: isDark ? "#c4b8ff" : "#534AB7",
              bodyColor: isDark ? "#ede8ff" : "#26215C",
              padding: 10,
              titleFont: { family: "'DM Mono', monospace", size: 11 },
              bodyFont: {
                family: "'DM Mono', monospace",
                size: 12,
                weight: 500,
              },
              callbacks: {
                title: (items) => HOUR_LABELS[items[0].dataIndex],
                label: (ctx) => ` ${ctx.parsed.y} plays`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: gridColor, drawTicks: false },
              border: { display: false },
              ticks: {
                color: tickColor,
                font: { family: "'DM Mono', monospace", size: 10 },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 9,
              },
            },
            y: {
              grid: { color: gridColor, drawTicks: false },
              border: { display: false },
              beginAtZero: true,
              ticks: {
                color: tickColor,
                font: { family: "'DM Mono', monospace", size: 10 },
                maxTicksLimit: 4,
                callback: (v) => String(Math.round(Number(v))),
              },
            },
          },
        },
      });
    } else {
      // Update existing chart data
      chartRef.current.data.datasets[0].data = chartData;
      chartRef.current.update("active");
    }
  }, [chartData, isDark]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  //  Render

  return (
    <div
      style={{
        width: "100%",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "12px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Stats */}
        <div style={{ display: "flex", gap: "20px" }}>
          <Stat label="total plays" value={totalPlays.toLocaleString()} />
          <Stat label="peak hour" value={HOUR_LABELS[peak]} />
        </div>

        {/* Day filter tabs */}
        <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
          <DayTab
            label="All"
            active={activeDay === "all"}
            onClick={() => setActiveDay("all")}
          />
          {DAY_LABELS.map((label, i) => (
            <DayTab
              key={label}
              label={label}
              active={activeDay === i}
              onClick={() => setActiveDay(i)}
            />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: "relative", width: "100%", height: "180px" }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Line chart of listening activity by hour${
            activeDay === "all"
              ? " averaged across all days"
              : ` on ${DAY_LABELS[activeDay]}`
          }. Peak at ${HOUR_LABELS[peak]} with ${chartData[peak]} plays.`}
        >
          {`Listening activity by hour of day. Peak: ${HOUR_LABELS[peak]} (${chartData[peak]} plays).`}
        </canvas>
      </div>
    </div>
  );
}

//  Sub-components

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          color: "var(--text3)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text1)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function DayTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        padding: "3px 7px",
        borderRadius: "6px",
        border: active
          ? "1px solid rgba(124,106,245,0.5)"
          : "1px solid var(--border)",
        background: active ? "rgba(124,106,245,0.12)" : "transparent",
        color: active ? "#7C6AF5" : "var(--text3)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}
