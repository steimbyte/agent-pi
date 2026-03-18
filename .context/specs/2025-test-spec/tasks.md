# Tasks: Dark Mode Toggle Implementation

## Wave 1: Foundation (No Dependencies)

### Task 1: Create CSS Theme Variables
- **File:** `src/styles/theme.css`
- **Action:** New
- **Estimate:** 2 hours
- **Description:** Define CSS custom properties for both light and dark themes. Include colors for backgrounds, text, borders, shadows, and component-specific tokens.

### Task 2: Implement ThemeProvider Context
- **File:** `src/providers/ThemeProvider.tsx`
- **Action:** New
- **Estimate:** 3 hours
- **Description:** Create a React context provider that manages theme state, reads from localStorage, detects system preference, and exposes a toggle function.

### Task 3: Create useTheme Hook
- **File:** `src/hooks/useTheme.ts`
- **Action:** New
- **Estimate:** 1 hour
- **Description:** Custom hook that consumes the ThemeProvider context and returns `{ theme, toggleTheme, isDark }`.

## Wave 2: UI Components (Depends on Wave 1)

### Task 4: Build ThemeToggle Component
- **File:** `src/components/ThemeToggle.tsx`
- **Action:** New
- **Estimate:** 2 hours
- **Description:** Animated toggle button with sun/moon icons. Uses `useTheme` hook. Includes keyboard support and ARIA labels.

### Task 5: Integrate Toggle into Navigation
- **File:** `src/components/NavBar.tsx`
- **Action:** Modify
- **Estimate:** 1 hour
- **Description:** Add ThemeToggle component to the navigation bar. Position it in the top-right utility section.

## Wave 3: Migration & Polish (Depends on Wave 2)

### Task 6: Migrate Hardcoded Colors
- **Files:** Multiple component files
- **Action:** Modify
- **Estimate:** 4 hours
- **Description:** Replace all hardcoded color values with CSS custom property references. Audit every component for theme compatibility.

### Task 7: Add FOUC Prevention Script
- **File:** `public/index.html`
- **Action:** Modify
- **Estimate:** 1 hour
- **Description:** Add inline script in `<head>` that reads localStorage and sets `data-theme` before first paint.

### Task 8: Write Tests
- **Files:** `src/**/*.test.tsx`
- **Action:** New
- **Estimate:** 3 hours
- **Description:** Unit tests for ThemeProvider, useTheme, and ThemeToggle. Integration test for full toggle flow. Visual regression snapshots for both themes.

## Summary

| Wave | Tasks | Total Estimate |
|------|-------|---------------|
| Wave 1 | Tasks 1-3 | 6 hours |
| Wave 2 | Tasks 4-5 | 3 hours |
| Wave 3 | Tasks 6-8 | 8 hours |
| **Total** | **8 tasks** | **17 hours** |
