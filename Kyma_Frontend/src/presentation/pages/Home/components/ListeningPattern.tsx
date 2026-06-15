// Kyma_Frontend/src/presentation/pages/Home/components/ListeningPattern.tsx
import React from "react";
import SectionHeader from "../sub-components/SectionHeader";
import ListeningLineChart from "../../../components/ListeningLineChart";

interface ListeningPatternProps {
  heatmap: any[];
}

const ListeningPattern: React.FC<ListeningPatternProps> = ({ heatmap }) => {
  if (heatmap.length === 0) return null;

  return (
    <div
      className="hp-section"
      style={{ marginBottom: "2rem", animationDelay: "0.08s" }}
    >
      <SectionHeader label="🎧 Listening Pattern" sub="last 30 days" />
      <ListeningLineChart heatmap={heatmap} />
    </div>
  );
};

export default ListeningPattern;
