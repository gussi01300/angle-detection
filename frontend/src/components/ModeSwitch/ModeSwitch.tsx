interface ModeSwitchProps {
  mode: 'manual' | 'auto';
  onModeChange: (mode: 'manual' | 'auto') => void;
  disabled?: boolean;
}

export function ModeSwitch({ mode, onModeChange, disabled }: ModeSwitchProps) {
  return (
    <div className="flex gap-4">
      <button
        onClick={() => onModeChange('manual')}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === 'manual'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Manual
      </button>
      <button
        onClick={() => onModeChange('auto')}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          mode === 'auto'
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Auto
      </button>
    </div>
  );
}