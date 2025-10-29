import React from 'react';
import { Select } from "./ui/select";

interface ToolSelectProps {
  label: string;
  options: string[];
  onValueChange: (value: string) => void;
  name: string;
  value?: string | null;
}

const ToolSelect: React.FC<ToolSelectProps> = ({
  label,
  options,
  onValueChange,
  name,
  value,
}) => {
  if (!options || options.length === 0) {
    return null; // Don't render if no options are provided
  }

  return (
    <div className="mt-4">
      <Select onValueChange={onValueChange} name={name} className="w-[180px] bg-gray-800 text-white" value={value || ""}>
        <option value="" disabled className="bg-gray-800 text-white">{label}</option>
        {options.map((option) => (
          <option key={option} value={option} className="bg-gray-800 text-white hover:bg-gray-700">
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
};

export default ToolSelect;
