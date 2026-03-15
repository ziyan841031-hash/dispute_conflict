window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#1a4080',
        background: '#f0f3f7',
        card: '#FFFFFF',
        border: '#cdd5df',
        foreground: '#1a1f2e',
        muted: '#4a5568',
        success: '#1a7a3c',
        warning: '#b45309',
        danger: '#b91c1c'
      },
      borderRadius: {
        sm: '3px',
        md: '4px',
        lg: '4px',
        xl: '6px'
      },
      boxShadow: {
        card: '0 1px 4px rgba(15, 23, 42, 0.08)',
        soft: '0 1px 3px rgba(15, 23, 42, 0.06)'
      }
    }
  }
};
