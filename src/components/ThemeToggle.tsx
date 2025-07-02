import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg transition-colors hover:bg-surface dark:hover:bg-surface-dark"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon size={20} className="text-text-secondary dark:text-text-secondary-dark" />
      ) : (
        <Sun size={20} className="text-text-secondary dark:text-text-secondary-dark" />
      )}
    </button>
  );
};

export default ThemeToggle;