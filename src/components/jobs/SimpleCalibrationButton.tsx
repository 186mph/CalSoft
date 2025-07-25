import React from 'react';
import { Plus } from 'lucide-react';

interface SimpleCalibrationButtonProps {
  onJobCreated?: () => void;
  buttonText?: string;
}

export function SimpleCalibrationButton({ onJobCreated, buttonText = "Simple Test Button" }: SimpleCalibrationButtonProps) {
  console.log('[SimpleCalibrationButton] Rendering with text:', buttonText);
  
  const handleClick = () => {
    console.log('[SimpleCalibrationButton] Button clicked!');
    alert('Simple button clicked!');
  };

  return (
    <button
      onClick={handleClick}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md flex items-center"
    >
      <Plus className="h-4 w-4 mr-2" />
      {buttonText}
    </button>
  );
}

export default SimpleCalibrationButton; 