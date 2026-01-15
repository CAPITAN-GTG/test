# Animate UI Components Documentation

**Source**: https://animate-ui.com/docs/components

**Purpose**: Complete catalog of all available animated React components from Animate UI. This project will use ONLY components from this documentation.

**Tech Stack**: React, TypeScript, Tailwind CSS, Framer Motion

---

## Overview

Animate UI is an open-source distribution of animated React components. Components are categorized by their underlying UI library or purpose. All components use Tailwind CSS for styling and include animations powered by Framer Motion.

---

## Component Categories

### 1. Animate UI (Core Components)

Base animated components built by Animate UI team.

| Component Name       | Description                               | Status    |
|---------------------|-------------------------------------------|-----------|
| Avatar Group        | Animated avatar grouping component        | Available |
| Code                | Code display component with animations    | Available |
| Code Tabs           | Tabbed code display interface             | Available |
| Cursor              | Custom animated cursor component          | Available |
| GitHub Stars Wheel  | Animated GitHub stars display widget      | Available |
| Tabs                | Tab navigation component                  | Available |
| Tooltip             | Tooltip component with animations         | Available |

**Total**: 7 components

---

### 2. Radix UI Components

Animated components built on top of Radix UI primitives.

| Component Name     | Description                               | Status    |
|-------------------|-------------------------------------------|-----------|
| Accordion        | Collapsible content sections              | Available |
| Alert Dialog     | Modal dialog for alerts/confirmations     | Available |
| Checkbox         | Animated checkbox input                   | Available |
| Dialog           | Modal dialog component                    | Available |
| Dropdown Menu    | Dropdown menu component                   | Available |
| Files            | File upload/display component             | Available |
| Hover Card       | Card revealed on hover                    | Available |
| Popover          | Popover component                         | Available |
| Preview Link Card | Card preview for links                    | Available |
| Progress         | Progress indicator component              | Available |
| Radio Group      | Radio button group component              | Available |
| Sheet            | Slide-over panel component                | Available |
| Sidebar          | Sidebar navigation component              | Available |
| Switch           | Toggle switch component                   | Available |
| Tabs             | Tab navigation component                  | Available |
| Toggle           | Toggle button component                   | Available |
| Toggle Group     | Group of toggle buttons                   | Available |
| Tooltip          | Tooltip component                         | Available |

**Total**: 18 components

---

### 3. Base UI Components

Animated components built on top of Base UI (MUI) primitives.

| Component Name    | Description                           | Status    |
|-------------------|---------------------------------------|-----------|
| Accordion         | Collapsible content sections          | Available |
| Alert Dialog      | Modal dialog for alerts/confirmations | Available |
| Checkbox          | Animated checkbox input               | Available |
| Dialog            | Modal dialog component                | Available |
| Files             | File upload/display component         | Available |
| Menu              | Menu component                        | Available |
| Popover           | Popover component                     | Available |
| Preview Card      | Card preview component                | Available |
| Preview Link Card | Card preview for links                | Available |
| Progress          | Progress indicator component          | Available |
| Radio             | Radio button component                | Available |
| Switch            | Toggle switch component               | Available |
| Tabs              | Tab navigation component              | Available |
| Toggle            | Toggle button component               | Available |
| Toggle Group      | Group of toggle buttons               | Available |
| Tooltip           | Tooltip component                     | Available |

**Total**: 16 components

---

### 4. Headless UI Components

Animated components built on top of Headless UI primitives.

| Component Name | Description                  | Status    |
|---------------|------------------------------|-----------|
| Accordion     | Collapsible content sections | Available |
| Checkbox      | Animated checkbox input      | Available |
| Dialog        | Modal dialog component       | Available |
| Popover       | Popover component            | Available |
| Switch        | Toggle switch component      | Available |
| Tabs          | Tab navigation component     | Available |

**Total**: 6 components

---

### 5. Buttons

Specialized animated button components.

| Component Name       | Description                                      | Status    |
|---------------------|--------------------------------------------------|-----------|
| Button              | Base animated button component                   | Available |
| Copy Button         | Button with copy-to-clipboard functionality      | Available |
| Flip Button         | Button with flip animation effect                | Available |
| GitHub Stars Button | Button displaying GitHub stars count             | Available |
| Icon Button         | Icon-only button component                       | Available |
| Liquid Button       | Button with liquid/morphing animation            | Available |
| Ripple Button       | Button with ripple effect on click               | Available |
| Theme Toggler Button | Button for toggling light/dark theme             | Available |

**Total**: 8 components

---

### 6. Backgrounds

Animated background components for pages or sections.

| Component Name          | Description                              | Status    |
|-------------------------|------------------------------------------|-----------|
| Bubble Background      | Animated bubble background effect        | Available |
| Fireworks Background   | Animated fireworks display background    | Available |
| Gradient Background    | Animated gradient background             | Available |
| Gravity Stars Background | Stars with gravity physics animation     | Available |
| Hexagon Background     | Animated hexagon pattern background      | Available |
| Hole Background        | Animated hole/vortex background effect   | Available |
| Stars Background       | Animated stars background                | Available |

**Total**: 7 components

---

### 7. Community Components

Community-contributed animated components.

| Component Name       | Description                              | Status    |
|---------------------|------------------------------------------|-----------|
| Flip Card           | Card with flip animation on interaction  | Available |
| Management Bar      | Navigation/management bar component      | Available |
| Motion Carousel     | Animated carousel component              | Available |
| Notification List   | Animated notification list component     | Available |
| Pin List            | Pinnable list component with animations  | Available |
| Playful Todolist    | Animated todo list component             | Available |
| Radial Intro        | Radial menu introduction component       | Available |
| Radial Menu         | Radial/circular menu component           | Available |
| Radial Nav          | Radial navigation component              | Available |
| Share Button        | Social sharing button component          | Available |
| User Presence Avatar| Avatar with user presence indicators     | Available |

**Total**: 11 components

---

## Component Statistics

### By Category
- **Animate UI (Core)**: 7 components
- **Radix UI**: 18 components
- **Base UI**: 16 components
- **Headless UI**: 6 components
- **Buttons**: 8 components
- **Backgrounds**: 7 components
- **Community**: 11 components

### Total Unique Components
**Grand Total**: 73 components

---

## Implementation Notes

### Installation Method
- Animate UI components are **NOT** installed via NPM
- Components are **copied directly** into your codebase
- This approach provides maximum flexibility without wrapper overhead

### Requirements
- React (already installed: v19.2.3)
- TypeScript (already installed: v5)
- Tailwind CSS (already installed: v4)
- Framer Motion (needs to be installed)

### Key Features
- Style-agnostic design
- Minimal baseline styles
- Easy customization
- Built-in accessibility
- Performance optimized
- Animation powered by Framer Motion

### Component Selection Guidelines
1. **Choose based on underlying library preference**:
   - Radix UI: Most comprehensive, accessibility-focused
   - Base UI: Material Design-based
   - Headless UI: Minimal, unstyled primitives

2. **Duplicates across libraries**:
   - Some components exist in multiple libraries (e.g., Accordion, Dialog, Tabs)
   - Choose based on which base library fits your project

3. **Unique components**:
   - Animate UI core components are unique
   - Button variants are unique
   - Background components are unique
   - Community components are unique

---

## Component URL Pattern

Base URL: `https://animate-ui.com/docs/components/{category}/{component-name}`

Examples:
- Animate UI Tabs: `https://animate-ui.com/docs/components/animate/tabs`
- Radix UI Dialog: `https://animate-ui.com/docs/components/radix/dialog`
- Button (Liquid): `https://animate-ui.com/docs/components/buttons/liquid-button`
- Background (Stars): `https://animate-ui.com/docs/components/backgrounds/stars-background`
- Community (Playful Todolist): `https://animate-ui.com/docs/components/community/playful-todolist`

---

## Quick Reference by Use Case

### Navigation
- Tabs (Animate UI, Radix UI, Base UI, Headless UI)
- Sidebar (Radix UI)
- Dropdown Menu (Radix UI)
- Menu (Base UI)
- Radial Nav (Community)
- Radial Menu (Community)

### Forms & Inputs
- Checkbox (Radix UI, Base UI, Headless UI)
- Radio / Radio Group (Radix UI, Base UI)
- Switch (Radix UI, Base UI, Headless UI)
- Toggle / Toggle Group (Radix UI, Base UI)
- Files (Radix UI, Base UI)

### Overlays & Modals
- Dialog (Radix UI, Base UI, Headless UI)
- Alert Dialog (Radix UI, Base UI)
- Popover (Radix UI, Base UI, Headless UI)
- Sheet (Radix UI)
- Tooltip (Animate UI, Radix UI, Base UI)
- Hover Card (Radix UI)

### Display
- Accordion (Radix UI, Base UI, Headless UI)
- Code / Code Tabs (Animate UI)
- Preview Card / Preview Link Card (Radix UI, Base UI)
- Progress (Radix UI, Base UI)

### Buttons & Actions
- Button variants (8 types)
- Copy Button
- Theme Toggler Button
- Share Button (Community)

### Special Effects
- Cursor (Animate UI)
- All Background components (7 types)
- Avatar Group (Animate UI)
- GitHub Stars Wheel / Button (Animate UI)

### Lists & Collections
- Notification List (Community)
- Pin List (Community)
- Playful Todolist (Community)
- Motion Carousel (Community)

### Complex UI
- Flip Card (Community)
- Management Bar (Community)
- Radial Intro / Radial Menu / Radial Nav (Community)
- User Presence Avatar (Community)

---

## Next Steps

1. Visit individual component pages at https://animate-ui.com/docs/components
2. Copy component code into project
3. Install Framer Motion: `npm install framer-motion`
4. Follow component-specific documentation for usage
5. Customize styles using Tailwind CSS classes
6. Test accessibility and performance

---

**Last Updated**: Based on animate-ui.com documentation (2025)
**Maintained By**: Animate UI Team
**License**: Check individual component licenses on the website

