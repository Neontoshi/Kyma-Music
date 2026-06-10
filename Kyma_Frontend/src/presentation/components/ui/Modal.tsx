import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full">
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {children}
        <button onClick={onClose} className="mt-4 text-text2 hover:text-text">
          Close
        </button>
      </div>
    </div>
  );
};

export default Modal;
