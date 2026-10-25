# vue3-gradient-color-picker

A Vue 3 color picker with:

- a 54-swatch palette plus a grey row and an optional transparent swatch
- a custom HSV picker with alpha (outputs `#rrggbb` or `rgba(...)`)
- a gradient editor: linear / radial / conic, angle, 2–5 draggable stops, presets

Works with or without Tailwind in your app — the CSS ships precompiled and scoped under `.vcp`.

## Install

```bash
npm install vue3-gradient-color-picker
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from 'vue3-gradient-color-picker'
import 'vue3-gradient-color-picker/style.css'

const color = ref('#1f87e8')
</script>

<template>
  <ColorPicker v-model="color" />
  <div :style="{ background: color }">Preview</div>
</template>
```

The value is any CSS color or gradient string, so bind it to `background` (not `background-color`) when gradients are enabled.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `'#000000'` | Color (`#hex`, `rgba(...)`) or gradient string. Use with `v-model`. |
| `useType` | `'pure' \| 'gradient' \| 'both'` | `'both'` | Solid colors only, gradients only, or tabs for both. |
| `allowTransparent` | `boolean` | `false` | Adds a transparent swatch (`rgba(0, 0, 0, 0)`). |
| `disabled` | `boolean` | `false` | Disables the trigger button. |
| `class` | `string \| object \| array` | — | Classes for the trigger button (default size 40×40). |
| `labels` | `Partial<ColorPickerLabels>` | English | Override UI text, e.g. for i18n. |

### Events

| Event | Payload |
|-------|---------|
| `update:modelValue` | `string` — the new color or gradient |

### Labels / i18n

```vue
<ColorPicker
  v-model="color"
  :labels="{ solid: t('solid'), gradient: t('gradient'), back: t('back'), addStop: t('addStop') }"
/>
```

Keys: `solid`, `gradient`, `back`, `linear`, `radial`, `conic`, `angle`, `presets`, `preview`, `addStop`, `removeStop`, `close`.

## Theming

Set CSS variables anywhere above the picker (the popover is teleported to `<body>`, so `:root` is simplest):

```css
:root {
  --vcp-primary: #2563eb;            /* active buttons */
  --vcp-primary-foreground: #ffffff;
  --vcp-bg: #ffffff;                 /* popover background */
  --vcp-text: #111827;
}
```

Dark mode follows a `.dark` class on an ancestor (e.g. `<html class="dark">`).

## Development

```bash
npm install
npm run dev     # demo page
npm test        # gradient parser check
npm run build   # dist/ (ES module, types, style.css)
```

## License

MIT

## Releasing

Publishing runs on GitHub Actions when a `v*` tag is pushed:

```bash
npm version patch   # or minor / major — bumps package.json and creates the tag
git push --follow-tags
```
