import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-all ${variant === "primary" ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-700 hover:bg-gray-600"} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
