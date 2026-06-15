// Kyma_Frontend/src/presentation/pages/Home/sub-components/CardRow.tsx
import React from "react";

const CardRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      gap: "12px",
      overflowX: "auto",
      overflowY: "visible",
      paddingBottom: "8px",
      paddingTop: "4px",
      scrollbarWidth: "none",
    }}
  >
    {children}
  </div>
);

export default CardRow;
