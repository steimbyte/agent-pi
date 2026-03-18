# Spec: Dark Mode Toggle Feature

## Overview

Add a system-wide dark mode toggle to the application. Users should be able to switch between light and dark themes with a single click, and their preference should persist across sessions.

## Problem Statement

Currently the application only supports a light theme. Users working in low-light environments experience eye strain, and there's no way to customize the visual appearance. This is the #1 most requested feature in our user feedback survey.

## Goals

- Provide a seamless light/dark mode toggle experience
- Persist user theme preference in local storage
- Respect system-level `prefers-color-scheme` as the default
- Ensure all components render correctly in both themes
- Zero flash of unstyled content (FOUC) on page load

## Non-Goals

- Custom color themes beyond light/dark
- Per-page theme overrides
- Theme scheduling (auto-switch at sunset)

## User Stories

1. **As a user**, I want to toggle between light and dark mode so I can use the app comfortably in any lighting condition.
2. **As a user**, I want my theme preference to persist so I don't have to re-select it every visit.
3. **As a new user**, I want the app to respect my OS theme preference by default.

## Technical Approach

### Architecture

The theme system will use CSS custom properties (variables) for all color values, with a `data-theme` attribute on the `<html>` element to switch between themes.

```
html[data-theme="light"] {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --border-color: #e0e0e0;
}

html[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --text-primary: #f0f0f0;
  --border-color: #333333;
}
```

### Components

| Component | Description |
|-----------|-------------|
| `ThemeProvider` | React context provider managing theme state |
| `ThemeToggle` | UI button component for switching themes |
| `useTheme` | Custom hook for accessing theme in components |
| `theme.css` | CSS custom properties for both themes |

### Data Flow

1. App loads → check `localStorage` for saved preference
2. If no saved preference → check `prefers-color-scheme` media query
3. Apply theme by setting `data-theme` attribute on `<html>`
4. User clicks toggle → update state, localStorage, and DOM attribute

## Success Metrics

- 100% of UI components render correctly in both themes
- Theme switch happens in < 16ms (single frame)
- No FOUC on initial page load
- Lighthouse accessibility score remains ≥ 95

## Open Questions

1. Should we animate the theme transition or make it instant?
2. Do we need a theme API for third-party plugins?
