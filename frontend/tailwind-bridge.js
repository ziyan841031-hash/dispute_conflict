window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        background: '#F6F8FC',
        card: '#FFFFFF',
        border: '#E5EAF3',
        foreground: '#0F172A',
        muted: '#475569',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      borderRadius: {
        sm: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px'
      },
      boxShadow: {
        card: '0 6px 18px rgba(15, 23, 42, 0.06)',
        soft: '0 2px 10px rgba(15, 23, 42, 0.05)'
      }
    }
  }
};
