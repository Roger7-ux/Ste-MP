import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '../../hooks/useTheme.jsx';
import { buttonClass } from '../ui/Button.jsx';
import { Menu, MenuItem } from '../ui/overlays.jsx';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

// Light, dark, or follow the device. The choice is remembered in this browser.
export default function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const Current = resolved === 'dark' ? Moon : Sun;

  return (
    <Menu
      label={`Theme: ${theme}`}
      trigger={
        <button type="button" className={buttonClass({ variant: 'ghost', size: 'icon' })}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={resolved}
              initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="grid place-items-center"
            >
              <Current aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
            </motion.span>
          </AnimatePresence>
        </button>
      }
    >
      {OPTIONS.map((option) => (
        <MenuItem key={option.value} icon={option.icon} onSelect={() => setTheme(option.value)}>
          <span className="flex-1">{option.label}</span>
          {theme === option.value && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
          {theme === option.value && <span className="sr-only">(selected)</span>}
        </MenuItem>
      ))}
    </Menu>
  );
}
