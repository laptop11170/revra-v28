# RevRa Landing Page Design System

## Overview
A dual-theme (dark/light), futuristic SaaS landing page with glassmorphism UI, gradient accents, and subtle animations. Designed for a high-tech AI-native CRM product. Supports both dark mode (default) and light mode with theme-aware components.

---

## Color Palette

### Core Colors - Dark Mode
```css
/* Backgrounds */
--background: 222 47% 4%
--surface: 222 47% 5%
--surface-dim: 222 47% 5%
--surface-bright: 223 39% 15%
--surface-container: 223 39% 11%
--surface-container-low: 223 39% 9%
--surface-container-lowest: 222 47% 3%
--surface-container-high: 223 39% 13%
--surface-container-highest: 223 39% 18%
--surface-variant: 223 39% 18%

/* Primary Brand (Purple) */
--primary: 266 100% 74%  /* #a078ff */
--primary-container: #a078ff
--primary-fixed: #e9ddff
--primary-fixed-dim: #d0bcff
--on-primary: #3c0091
--on-primary-fixed: #23005c
--on-primary-fixed-variant: #5516be
--inverse-primary: #6d3bd7

/* Secondary Brand (Cyan) */
--secondary: 187 100% 63%  /* #00cbe6 */
--secondary-container: #00cbe6
--secondary-fixed: #a2eeff
--secondary-fixed-dim: #2fd9f4
--on-secondary: #00363e
--on-secondary-fixed: #001f25
--on-secondary-fixed-variant: #004e5a

/* Text Colors */
--on-surface: 220 40% 90%
--on-surface-variant: 223 13% 75%
--muted-foreground: 223 13% 61%
--foreground: 220 40% 90%

/* Borders & Dividers */
--border: 266 30% 30%
--outline-variant: #494454
```

### Core Colors - Light Mode
```css
/* Backgrounds */
--background: 220 20% 97%
--surface: 220 20% 98%
--surface-dim: 220 15% 94%
--surface-bright: 0 0% 100%
--surface-container: 220 15% 95%
--surface-container-low: 220 15% 92%
--surface-container-lowest: 220 15% 88%
--surface-container-high: 220 15% 96%
--surface-container-highest: 220 15% 90%
--surface-variant: 220 15% 85%

/* Primary Brand (Purple - slightly adjusted for contrast on light) */
--primary: 266 100% 55%  /* #8b5cf6 */
--primary-foreground: 0 0% 100%

/* Secondary Brand (Cyan - slightly adjusted) */
--secondary: 187 100% 45%  /* #06b6d4 */
--secondary-foreground: 0 0% 100%

/* Text Colors */
--on-surface: 222 47% 11%
--on-surface-variant: 223 13% 40%
--muted-foreground: 220 13% 45%
--foreground: 222 47% 11%

/* Borders & Dividers */
--border: 266 15% 80%
--muted: 220 15% 90%
--input: 220 15% 90%
```

### Gradient Definitions
```css
/* Primary Text Gradient */
background: linear-gradient(to right, #a078ff, #00cbe6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

/* Button Gradient */
background: linear-gradient(to right, from-primary to-secondary)

/* Glow Effects (Dark Mode) */
box-shadow: 0 0 15px rgba(160, 120, 255, 0.3);  /* Primary glow */
box-shadow: 0 0 15px rgba(93, 230, 255, 0.3); /* Secondary glow */

/* Glow Effects (Light Mode) */
box-shadow: 0 0 15px rgba(139, 92, 246, 0.2);  /* Primary glow */
box-shadow: 0 0 15px rgba(0, 168, 204, 0.2);  /* Secondary glow */
```

---

## Theme System

### Implementation
The theme system is implemented via React Context with localStorage persistence:

```tsx
// src/context/theme-provider.tsx
"use client";
import * as React from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

// ... provider implementation

export function useTheme() {
    const context = React.useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
```

### Usage Pattern
```tsx
const MyComponent = () => {
    const { theme } = useTheme();

    return (
        <div className={cn(
            "p-6 rounded-xl",
            theme === "dark"
                ? "bg-surface-container-lowest/60 border border-white/10"
                : "bg-card/60 border border-border/40"
        )}>
            Content here
        </div>
    );
};
```

### CSS Variables
CSS variables for both themes are defined in `globals.css` under `.dark` and `.light` selectors. The `html` element receives the theme class.

---

## Typography

### Font Families
```css
font-display: 'Space Grotesk', sans-serif;  /* Headings, labels, CTAs */
font-body: 'Inter', sans-serif;            /* Body text, descriptions */
font-mono: 'monospace';                     /* Code, technical labels */
```

### Type Scale
```css
/* Display / Hero */
text-6xl: 3.75rem (60px)
text-5xl: 3rem (48px)
text-4xl: 2.25rem (36px)
text-3xl: 1.875rem (30px)

/* Section Headings */
text-2xl: 1.5rem (24px)
text-xl: 1.25rem (20px)
text-lg: 1.125rem (18px)

/* Body */
text-base: 1rem (16px)
text-sm: 0.875rem (14px)
text-xs: 0.75rem (12px)
text-[9px]: 0.5625rem (9px)
text-[10px]: 0.625rem (10px)
text-[8px]: 0.5rem (8px)
```

---

## Component Patterns

### 1. Section Wrapper
```tsx
<Wrapper className="py-24 lg:py-32">
  {/* Section content */}
</Wrapper>

// CSS:
max-w-screen-xl mx-auto px-4 lg:px-20
```

### 2. Glassmorphism Card (Theme-Aware)
```tsx
<div className={cn(
    "flex flex-col items-start gap-4 p-6 rounded-2xl backdrop-blur-xl border transition-all duration-500 group relative overflow-hidden",
    theme === "dark"
        ? "bg-surface-container-lowest/60 border border-white/10"
        : "bg-card/60 border border-border/40"
)}>
```
**States:**
- Default Dark: `border-white/10`, subtle background
- Default Light: `border-border/40`, light card background
- Hover: `border-primary/30`, increased background opacity, 500ms transition

### 3. Section Badge (Theme-Aware)
```tsx
<div className={cn(
    "px-2.5 py-1 rounded-full flex items-center justify-center gap-2",
    theme === "dark" ? "bg-neutral-800" : "bg-neutral-200"
)}>
    <div className="relative flex items-center justify-center">
        <div className="absolute w-3 h-3 rounded-full bg-primary/30 animate-ping"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
    </div>
    <span className={cn(
        "text-xs font-medium text-transparent bg-clip-text",
        theme === "dark"
            ? "bg-gradient-to-r from-primary to-orange-300"
            : "bg-gradient-to-r from-primary to-secondary"
    )}>
        {title}
    </span>
</div>
```

### 4. Animated Icon Container
```tsx
<div className="w-14 h-14 rounded-xl
  bg-gradient-to-br from-primary/20 to-secondary/20
  flex items-center justify-center
  group-hover:shadow-[0_0_20px_rgba(160,120,255,0.3)]
  transition-all duration-300"
>
  <Icon className="w-7 h-7 text-primary" />
</div>
```

### 5. Background Glow Effect
```tsx
<div className="absolute -top-10 -right-10 w-32 h-32
  bg-primary/10 rounded-full blur-2xl
  group-hover:bg-primary/20
  transition-all duration-500"
/>
```

### 6. Gradient Border Line
```tsx
<div className={cn(
    "absolute top-0 w-full h-[1px]",
    theme === "dark"
        ? "bg-gradient-to-r from-transparent via-white/30 to-transparent"
        : "bg-gradient-to-r from-transparent via-border/50 to-transparent"
)} />
```

### 7. Tech Panel (Control Panel Style - Theme-Aware)
```tsx
<div className={cn(
    "relative rounded-lg border p-3 overflow-hidden",
    theme === "dark"
        ? "bg-surface/50 border-white/10"
        : "bg-muted/50 border-border/30"
)}>
  {/* Panel header */}
  <div className={cn(
      "flex items-center justify-between mb-2 pb-2",
      theme === "dark" ? "border-b border-white/5" : "border-b border-border/20"
  )}>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span className="text-[9px] font-mono text-green-500">SYSTEM ONLINE</span>
    </div>
  </div>

  {/* Status bar with progress */}
  <div className={cn(
      "mt-2 pt-2 flex items-center justify-between",
      theme === "dark" ? "border-t border-white/5" : "border-t border-border/20"
  )}>
    <div className="h-1 w-16 bg-surface-container rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-secondary to-primary animate-pulse" style={{ width: '75%' }} />
    </div>
  </div>

  {/* Decorative scan line */}
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />
</div>
```

### 8. Feature List Item (with Check Icon)
```tsx
<li className="flex items-start gap-3">
  <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
  <span className="text-sm text-foreground">{feature}</span>
</li>
```

### 9. Call Interface Visualization (Theme-Aware)
```tsx
<div className={cn(
    "rounded-lg border overflow-hidden",
    theme === "dark" ? "bg-surface/80 border-white/10" : "bg-muted/80 border-border/30"
)}>
  {/* Header */}
  <div className={cn(
      "flex items-center justify-between px-3 py-2",
      theme === "dark" ? "bg-green-500/10 border-b border-green-500/20" : "bg-green-500/10 border-b border-green-500/20"
  )}>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
      <span className="text-[10px] font-mono text-green-500">Call in Progress</span>
    </div>
    <span className="text-[10px] font-mono text-muted-foreground">02:34</span>
  </div>

  {/* Audio waveform */}
  <div className="h-12 flex items-center justify-center gap-0.5 px-4">
    {[8, 14, 11, 20, ...].map((height, i) => (
      <div
        key={i}
        className={cn(
          "w-1 rounded-full",
          i % 2 === 0 ? "bg-primary/60" : "bg-secondary/60",
          i > 8 && i < 16 && "animate-pulse"
        )}
        style={{ height: `${height}px`, animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
</div>
```

### 10. Team Activity Feed (Theme-Aware)
```tsx
<div className={cn(
    "rounded-lg border",
    theme === "dark" ? "bg-surface/80 border-white/10" : "bg-muted/80 border-border/30"
)}>
  {/* Header */}
  <div className={cn(
      "flex items-center justify-between px-3 py-2",
      theme === "dark" ? "bg-surface-container border-b border-white/5" : "bg-muted border-b border-border/20"
  )}>
    <span className="text-[10px] font-mono text-muted-foreground">Team Activity</span>
    <div className="flex items-center gap-1">
      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
      <span className="text-[9px] font-mono text-green-500">10 online</span>
    </div>
  </div>

  {/* Agent cards */}
  <div className="p-2 space-y-2">
    {agents.map((agent, i) => (
      <div key={i} className={cn(
          "flex items-center gap-2 p-2 rounded-lg",
          theme === "dark" ? "bg-surface-container/50" : "bg-muted/50"
      )}>
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-mono",
          agent.status === 'active' ? "bg-primary/20 text-primary" : "bg-black/10 text-muted-foreground"
        )}>
          {agent.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium truncate">{agent.name}</div>
          <div className="text-[9px] text-muted-foreground truncate">{agent.action}</div>
        </div>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          agent.status === 'active' ? "bg-green-500" : "bg-black/30"
        )} />
      </div>
    ))}
  </div>
</div>
```

### 11. AI Terminal Visualization (Theme-Aware)
```tsx
<div className={cn(
    "rounded-lg border overflow-hidden",
    theme === "dark" ? "bg-surface/80 border-white/10" : "bg-muted/80 border-border/30"
)}>
  {/* Terminal header */}
  <div className={cn(
      "flex items-center gap-1.5 px-3 py-2",
      theme === "dark" ? "bg-surface-container border-b border-white/5" : "bg-muted border-b border-border/20"
  )}>
    <div className="w-2 h-2 rounded-full bg-red-500/60"></div>
    <div className="w-2 h-2 rounded-full bg-yellow-500/60"></div>
    <div className="w-2 h-2 rounded-full bg-green-500/60"></div>
    <span className="text-[10px] font-mono text-muted-foreground ml-2">revra-ai ~ terminal</span>
  </div>

  {/* Terminal content */}
  <div className="p-3 font-mono text-[10px] space-y-1.5">
    <div className="flex items-center gap-2">
      <span className="text-secondary">AI</span>
      <span className="text-muted-foreground">Drafting SMS response to Michael...</span>
    </div>
  </div>
</div>
```

---

## Animation Patterns

### Entry Animations
```tsx
// Container wraps content with staggered entry
<AnimationContainer animation="fadeUp" delay={0.2}>
  {/* Content */}
</AnimationContainer>

// Available animations:
// fadeUp, fadeDown, fadeLeft, fadeRight, scaleUp
```

### Hover Transitions
```css
transition-all duration-300    /* Standard hover transition */
transition-all duration-500  /* Slower, more dramatic transitions */

/* Border color change on hover */
border border-white/10 hover:border-primary/30   /* Dark mode */
border border-border/40 hover:border-primary/40  /* Light mode */

/* Scale effect */
transform hover:scale-105
```

### Pulse Animations
```tsx
// Status indicators
<div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>

// Badge indicator
<div className="absolute w-3 h-3 rounded-full bg-primary/30 animate-ping"></div>
```

### Number Rolling Animation (for pricing)
```tsx
// Animated counter that rolls between values
const AnimatedNumber = ({ value, isYearly }) => {
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    const duration = 500;
    const steps = 25;
    const stepDuration = duration / steps;
    const eased = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
    // ... interpolation logic
  }, [isYearly]);

  return (
    <span style={{
      background: 'linear-gradient(to right, #a078ff, #00cbe6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}>
      {displayValue}
    </span>
  );
};
```

---

## Layout Patterns

### Full-Width Background Grid
The hero section uses a full-width checkerboard pattern that extends beyond the content wrapper:

```tsx
<div className="relative">
    {/* Full-width Background Grid - outside Wrapper */}
    <div className={cn(
        "absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none",
        theme === "light" && "bg-[linear-gradient(rgba(13,21,39,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,21,39,0.05)_1px,transparent_1px)]"
    )}></div>

    {/* Content within Wrapper */}
    <Wrapper className="pt-40 lg:pt-52">
        {/* Content here */}
    </Wrapper>
</div>
```

### Two-Column Layout (Mobile: 1 column, Desktop: 2 columns)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Left column - Text content */}
  {/* Right column - Visual/Image */}
</div>
```

### 2x2 Grid for Cards
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Cards in 2 columns, 2 rows */}
</div>
```

### Bento/Grid Layout (for tool integrations)
```tsx
<div className="grid grid-cols-3 gap-1.5">
  <div className="col-span-2 row-span-2"> {/* Large cell */} </div>
  <div> {/* Small cell */} </div>
  {/* ... */}
</div>
```

---

## Button Styles

### Primary CTA Button (Theme-Aware)
```tsx
<Button size="lg" className={cn(
    "bg-gradient-to-r text-primary-foreground shadow-[0_0_20px_rgba(160,120,255,0.3)] transition-all duration-300 font-display px-8",
    theme === "dark"
        ? "from-inverse-primary to-surface-container border-t border-white/20 hover:shadow-[0_0_30px_rgba(93,230,255,0.3)]"
        : "from-primary to-muted border-foreground/10 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]"
)}>
  Start Your Free Trial
</Button>
```

### Secondary Button
```tsx
<Button size="lg" variant="secondary" className="font-display">
  See How It Works
</Button>
```

### Navbar Get Started Button (Theme-Aware)
```tsx
<Button size="sm" className={cn(
    "font-display font-medium tracking-tight shadow-[0_0_15px_rgba(160,120,255,0.3)]",
    theme === "dark"
        ? "bg-primary-container text-on-primary-container hover:bg-white/10 hover:text-primary"
        : "bg-primary text-white hover:bg-primary/90"
)}>
  Get Started
</Button>
```

### Outline Button (Enterprise)
```tsx
<Button variant="outline" className="w-full font-display">
  Talk to Sales
</Button>
```

---

## Visual Effects

### Background Grid Pattern (Theme-Aware)
```tsx
// Dark mode (subtle white lines)
<div className="absolute inset-0
  bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]
  bg-[size:40px_40px]
  pointer-events-none"
/>

// Light mode (subtle dark lines)
<div className="bg-[linear-gradient(rgba(13,21,39,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,21,39,0.05)_1px,transparent_1px)]"
/>
```

### Gradient Orb (Background Glow)
```tsx
<div className="absolute top-1/4 left-1/4 w-[500px] h-[500px]
  bg-primary-container/20 rounded-full blur-[120px] pointer-events-none"
/>
```

### Card Glow Effect
```tsx
<div className="absolute inset-x-0 mx-auto -top-8 w-64 h-32
  bg-primary/20 rounded-full blur-[40px]"
/>
```

### Glassmorphism Overlay
```tsx
<div className="bg-surface-container-lowest/80 backdrop-blur-xl">
```

---

## Responsive Breakpoints

```css
/* Mobile first */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px (navbar changes, 2-column layouts) */
/* xl: 1280px */
/* 2xl: 1400px */

max-w-screen-xl         /* Max content width */
lg:max-w-screen-xl     /* Same on large screens */
px-4 lg:px-20          /* Padding: mobile 16px, desktop 80px */
```

---

## Common Utility Classes

### Text Utilities
```css
text-muted-foreground        /* Subtle text color */
text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary  /* Gradient text */
font-display                 /* Display font family */
font-mono                    /* Monospace for labels */
font-body                    /* Body font family */
tracking-tighter             /* Tight letter spacing for logos */
uppercase tracking-wider     /* Label style */
```

### Spacing
```css
gap-4                        /* 16px gap */
gap-6                        /* 24px gap */
p-6                          /* 24px padding */
py-24 lg:py-32              /* Vertical padding: mobile 96px, desktop 128px */
mt-6 mb-6                   /* Margins */
space-y-2                    /* Vertical spacing between items */
```

### Borders & Shadows
```css
border border-white/10        /* Dark mode subtle border */
border border-border/40        /* Light mode subtle border */
border border-outline-variant/30
rounded-2xl                  /* Rounded corners (16px) */
rounded-lg                   /* Rounded corners (8px) */
rounded-full                 /* Pill shape */
shadow-2xl                  /* Large shadow */
shadow-[0_0_15px_rgba(160,120,255,0.3)]  /* Primary glow */
```

---

## Checklist for New Components

When creating a new component, ensure it has:

1. [ ] "use client" directive if using hooks/animations/theme
2. [ ] useTheme() hook for theme-aware styling
3. [ ] cn() utility with theme === "dark" conditional classes
4. [ ] AnimationContainer wrapper with appropriate delay
5. [ ] Glassmorphism background styling (theme-aware)
6. [ ] Hover state with border color change (theme-aware)
7. [ ] Background glow effect (positioned absolutely)
8. [ ] Icon with gradient background and glow on hover
9. [ ] Consistent padding (p-6)
10. [ ] Consistent gap (gap-4 or gap-6)
11. [ ] SectionBadge if it's a section header (theme-aware)
12. [ ] Mobile-responsive layout (grid-cols-1 md:grid-cols-2)
13. [ ] Wrapper component for content container
14. [ ] Consistent typography (font-display for headings, font-body for descriptions)
15. [ ] Dark theme styling (bg-surface-container, text-muted-foreground, etc.)
16. [ ] Light theme styling (bg-card, bg-muted, border-border/40, etc.)
17. [ ] Both themes work correctly - test toggle

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider
│   └── (marketing)/
│       ├── layout.tsx           # Marketing layout (Navbar + Footer)
│       └── page.tsx             # Landing page sections
├── components/
│   ├── ui/
│   │   └── section-badge.tsx    # Theme-aware badge
│   ├── global/
│   │   ├── wrapper.tsx          # Section wrapper
│   │   └── animation-container.tsx
│   ├── hero.tsx                # Theme-aware hero with full-width grid
│   ├── features.tsx            # Theme-aware feature cards
│   ├── perks.tsx               # Theme-aware perks
│   ├── how-it-works.tsx        # Theme-aware How It Works
│   ├── pricing.tsx             # Theme-aware pricing
│   ├── cta.tsx                 # Theme-aware CTA
│   ├── testimonials.tsx        # Theme-aware testimonials
│   ├── faq.tsx                 # Theme-aware FAQ
│   ├── footer.tsx              # Theme-aware footer
│   └── navbar.tsx              # Theme-aware navbar with toggle
├── context/
│   └── theme-provider.tsx      # Theme context & hook
├── constants/
│   └── *.ts                    # Content constants
├── lib/
│   └── utils.ts                # cn() utility
└── styles/
    └── globals.css             # CSS variables (.dark & .light)
```
