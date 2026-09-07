import React, { createContext, useContext, useEffect, useState } from 'react';
import { StitchTheme } from '../types/store';

interface ThemeContextType {
  theme: StitchTheme;
  setTheme: (theme: StitchTheme) => void;
  themeMeta: {
    name: string;
    description: string;
    badgeColor: string;
    icon: string;
  };
}

const themeMetaMap: Record<StitchTheme, { name: string; description: string; badgeColor: string; icon: string }> = {
  professional: {
    name: 'Professional',
    description: 'Crisp corporate aesthetic with tonal layering & clear visual hierarchy',
    badgeColor: 'bg-blue-600 text-white',
    icon: 'briefcase',
  },
  glassmorphism: {
    name: 'Glassmorphism',
    description: 'Translucent frosted glass panels with luminous dark-mode neon accents',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    icon: 'sparkles',
  },
  claymorphism: {
    name: 'Claymorphism',
    description: 'Soft 3D pillowy neumorphic surfaces with tactile inner/outer depth',
    badgeColor: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    icon: 'box',
  },
  'berry-glass': {
    name: 'Berry Glass',
    description: 'Lush amethyst & berry hues blended with high-contrast glassmorphism',
    badgeColor: 'bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-500/30',
    icon: 'gem',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<StitchTheme>(() => {
    const saved = localStorage.getItem('store_bi_theme') as StitchTheme;
    if (saved && themeMetaMap[saved]) return saved;
    return 'professional';
  });

  const setTheme = (newTheme: StitchTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('store_bi_theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'glassmorphism' || theme === 'berry-glass') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeMeta: themeMetaMap[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
