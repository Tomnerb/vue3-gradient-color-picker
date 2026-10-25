<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, type HTMLAttributes } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { ArrowLeftIcon, ArrowUpIcon, PlusIcon, TrashIcon, PaletteIcon, SwatchBookIcon } from 'lucide-vue-next'
import type { ColorPickerLabels } from './types'
import { parseGradient } from './gradient'

const props = withDefaults(defineProps<{
  modelValue?: string
  class?: HTMLAttributes['class']
  disabled?: boolean
  useType?: 'pure' | 'gradient' | 'both'
  allowTransparent?: boolean
  labels?: Partial<ColorPickerLabels>
}>(), {
  useType: 'both',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const defaultLabels: ColorPickerLabels = {
  solid: 'Solid',
  gradient: 'Gradient',
  back: 'Back',
  linear: 'Linear',
  radial: 'Radial',
  conic: 'Conic',
  angle: 'Angle',
  presets: 'Presets',
  preview: 'Preview',
  addStop: 'Add stop',
  removeStop: 'Remove stop',
  close: 'Close',
}
const l = computed(() => ({ ...defaultLabels, ...props.labels }))

// No tailwind-merge here, so size classes stay out of the base to avoid h-/px- conflicts.
const btn = 'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'
const btnOutline = `${btn} h-8 px-3 border border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700`
const btnGhost = `${btn} h-7 hover:bg-gray-100 dark:hover:bg-gray-700`
const tabBtn = 'flex-1 inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium transition-all duration-200 py-2.5'

const isDragging = ref('')
const isDraggingG = ref(false)
const showColorPicker = ref(false)

// Color matrix for the palette (6 rows x 9 columns)
const defaultColors: string[][] = [
  ['#eaac14', '#e07101', '#d54011', '#d81b43', '#7f169b', '#3f1a96', '#1275d2', '#006e69', '#01863a'],
  ['#fcc02e', '#f67c01', '#e64a19', '#d81b43', '#8e24aa', '#512da7', '#1f87e8', '#008781', '#05a045'],
  ['#fed835', '#fb8c00', '#f5511e', '#eb1d4e', '#9c28b1', '#5d35b0', '#2097f3', '#029688', '#4cb050'],
  ['#ffeb3c', '#ffa727', '#fe5722', '#eb4165', '#aa47bc', '#673bb7', '#42a5f6', '#26a59a', '#83c683'],
  ['#fff176', '#ffb74e', '#ff8a66', '#f1627e', '#b968c7', '#7986cc', '#64b5f6', '#80cbc4', '#a5d6a7'],
  ['#fff59c', '#ffcc80', '#ffab91', '#fb879e', '#cf93d9', '#9ea8db', '#90caf8', '#b2dfdc', '#c8e6ca'],
]

const greys = ['#dedede', '#a9a9a9', '#4b4b4b', '#353535', '#212121', '#000000', 'advance']

const extraDefaultColors = computed(() => [
  props.allowTransparent ? ['transparent', '#ffffff', ...greys] : ['#ffffff', '#f1f1f1', ...greys],
])

const normalExtraDefaultColors = [['#ffffff', '#f1f1f1', ...greys]]

const gradientPresets = [
  { name: 'Sunset', value: 'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 100%)' },
  { name: 'Ocean', value: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Forest', value: 'linear-gradient(to right, #00b09b 0%, #96c93d 100%)' },
  { name: 'Fire', value: 'linear-gradient(45deg, #ff0844 0%, #ffb199 100%)' },
  { name: 'Sunny', value: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
  { name: 'Purple', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Pink', value: 'linear-gradient(45deg, #ff6b6b 0%, #ff8e8e 100%)' },
  { name: 'Blue', value: 'linear-gradient(270deg, #4facfe 0%, #00f2fe 100%)' },
  { name: 'Green', value: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)' },
  { name: 'Orange', value: 'linear-gradient(45deg, #fa709a 0%, #fee140 100%)' },
]

// Seeded from modelValue by the immediate watcher at the bottom
const currentColor = ref('#000000')
const currentTab = ref<'pure' | 'gradient'>('pure')
const showAdvanced = ref(false)
const hue = ref(0)
const saturation = ref(100)
const value = ref(100)
const alpha = ref(100)

// Gradient state
const showAdvancedG = ref(false)
const gradientType = ref<'linear' | 'radial' | 'conic'>('linear')
const gradientAngle = ref(90)
const activeStopIndex = ref(0)

const colorStops = ref<{ position: number, color: string }[]>([
  { position: 0, color: '#ffffff' },
  { position: 100, color: '#000000' },
])

const gradientDirections = [0, 45, 90, 135, 180, 225, 270, 315]

const popoverOpen = ref(false)

// Advanced color picker for gradient stops
const hueG = ref(0)
const saturationG = ref(100)
const valueG = ref(100)
const isDraggingG2 = ref('')

// Element refs (instance-scoped, so several pickers can live on one page)
const saturationBox = ref<HTMLElement>()
const hueSlider = ref<HTMLElement>()
const alphaSlider = ref<HTMLElement>()
const gradientContainer = ref<HTMLElement>()
const gradientPopover = ref<HTMLElement>()
const saturationBoxG = ref<HTMLElement>()
const hueSliderG = ref<HTMLElement>()

const pointer = (event: MouseEvent | TouchEvent) => {
  const p = 'touches' in event && event.touches.length ? event.touches[0] : (event as MouseEvent)
  return { x: p.clientX, y: p.clientY }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

// PURE COLOR PICKER
const hsvToRgb = (h: number, s: number, v: number): { r: number, g: number, b: number } => {
  s = s / 100
  v = v / 100
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  let r, g, b
  switch (i % 6) {
    case 0: [r, g, b] = [v, t, p]; break
    case 1: [r, g, b] = [q, v, p]; break
    case 2: [r, g, b] = [p, v, t]; break
    case 3: [r, g, b] = [p, q, v]; break
    case 4: [r, g, b] = [t, p, v]; break
    case 5: [r, g, b] = [v, p, q]; break
    default: [r, g, b] = [0, 0, 0]
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
}

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')

const updateAdvancedColor = () => {
  const rgb = hsvToRgb(hue.value / 360, saturation.value, value.value)
  const color = alpha.value < 100
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.value / 100})`
    : rgbToHex(rgb.r, rgb.g, rgb.b)
  updateColor(color)
}

const applyPointer = (type: string, el: HTMLElement | undefined, x: number, y: number) => {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = clamp01((x - rect.left) / rect.width)
  const py = clamp01((y - rect.top) / rect.height)
  if (type === 'saturation') {
    saturation.value = Math.round(px * 100)
    value.value = Math.round((1 - py) * 100)
  } else if (type === 'hue') {
    hue.value = Math.round(px * 360)
  } else {
    alpha.value = Math.round(px * 100)
  }
  updateAdvancedColor()
}

const sliderFor = (type: string) =>
  type === 'saturation' ? saturationBox.value : type === 'hue' ? hueSlider.value : alphaSlider.value

const startDragging = (type: 'hue' | 'saturation' | 'alpha', event: MouseEvent | TouchEvent) => {
  isDragging.value = type
  const { x, y } = pointer(event)
  applyPointer(type, sliderFor(type), x, y)

  document.addEventListener('mousemove', handleDragging)
  document.addEventListener('touchmove', handleDragging, { passive: false })
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchend', stopDragging)

  event.preventDefault()
}

const handleDragging = (event: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return
  const { x, y } = pointer(event)
  applyPointer(isDragging.value, sliderFor(isDragging.value), x, y)
  if ('touches' in event) event.preventDefault()
}

const stopDragging = () => {
  isDragging.value = ''
  document.removeEventListener('mousemove', handleDragging)
  document.removeEventListener('touchmove', handleDragging)
  document.removeEventListener('mouseup', stopDragging)
  document.removeEventListener('touchend', stopDragging)
}

const updateColor = (color: string) => {
  currentColor.value = color
  emit('update:modelValue', color)
}

const handleColorChange = (color: string) => {
  if (color === 'advance') {
    showAdvanced.value = true
    return
  }
  updateColor(color === 'transparent' ? 'rgba(0, 0, 0, 0)' : color)
}

const gradientValue = computed(() => {
  if (!colorStops.value.length) return ''

  const stopsString = [...colorStops.value]
    .sort((a, b) => a.position - b.position)
    .map(stop => `${stop.color} ${stop.position}%`)
    .join(', ')

  if (gradientType.value === 'linear') return `linear-gradient(${gradientAngle.value}deg, ${stopsString})`
  if (gradientType.value === 'radial') return `radial-gradient(circle, ${stopsString})`
  return `conic-gradient(from ${gradientAngle.value}deg, ${stopsString})`
})

// Keep the floating stop picker inside the popover
const getPopoverPosition = (position: number) => `calc(${Math.max(25, Math.min(75, position))}% - 125px)`

// Color stop management
const addColorStop = () => {
  if (colorStops.value.length >= 5) return

  const sortedStops = [...colorStops.value].sort((a, b) => a.position - b.position)

  // Insert into the largest gap
  let maxGap = 0
  let maxGapIndex = 0
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const gap = sortedStops[i + 1].position - sortedStops[i].position
    if (gap > maxGap) {
      maxGap = gap
      maxGapIndex = i
    }
  }

  const a = sortedStops[maxGapIndex]
  const b = sortedStops[maxGapIndex + 1]
  const newColor = a.color.startsWith('#') && b.color.startsWith('#') ? blendColors(a.color, b.color, 0.5) : '#808080'

  colorStops.value.push({ position: a.position + (b.position - a.position) / 2, color: newColor })
  activeStopIndex.value = colorStops.value.length - 1
  showColorPicker.value = true

  updateGradient()
}

const blendColors = (color1: string, color2: string, ratio: number) => {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  if (!c1 || !c2) return '#808080'
  const mix = (x: number, y: number) => Math.round(x * (1 - ratio) + y * ratio)
  return rgbToHex(mix(c1.r, c2.r), mix(c1.g, c2.g), mix(c1.b, c2.b))
}

const removeColorStop = (index: number) => {
  if (colorStops.value.length <= 2) return

  colorStops.value.splice(index, 1)
  if (activeStopIndex.value >= colorStops.value.length) {
    activeStopIndex.value = colorStops.value.length - 1
  }

  updateGradient()
}

// Dragging color stops
const startDrag = (event: MouseEvent | TouchEvent) => {
  isDraggingG.value = true
  showColorPicker.value = false

  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('touchmove', handleDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)

  event.preventDefault()
}

const handleDrag = (event: MouseEvent | TouchEvent) => {
  if (!isDraggingG.value || !gradientContainer.value) return

  const rect = gradientContainer.value.getBoundingClientRect()
  colorStops.value[activeStopIndex.value].position = clamp01((pointer(event).x - rect.left) / rect.width) * 100
  updateGradient()

  if ('touches' in event) event.preventDefault()
}

const stopDrag = () => {
  isDraggingG.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
  showColorPicker.value = true
}

const handleStopClick = (index: number) => {
  activeStopIndex.value = index
  showColorPicker.value = true
  updateHsvFromHex(colorStops.value[index].color)
}

const updateHsvFromHex = (hexColor: string) => {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  hueG.value = Math.round(hsv.h)
  saturationG.value = Math.round(hsv.s)
  valueG.value = Math.round(hsv.v)
}

const rgbToHsv = (r: number, g: number, b: number): { h: number, s: number, v: number } => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 }
}

const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
  if (!hex.startsWith('#')) return null
  hex = hex.slice(1)
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

const updateGradientColor = (color: string) => {
  if (color === 'advance') {
    showAdvancedG.value = true
    return
  }
  if (activeStopIndex.value >= colorStops.value.length) return

  colorStops.value[activeStopIndex.value].color = color
  updateGradient()
}

const updateGradient = () => updateColor(gradientValue.value)

const setGradientType = (type: 'linear' | 'radial' | 'conic') => {
  gradientType.value = type
  updateGradient()
}

const setGradientAngle = (angle: number) => {
  gradientAngle.value = angle
  updateGradient()
}

// Load a gradient string into the editor state; returns false if it isn't one
const loadGradient = (value: string) => {
  const parsed = parseGradient(value)
  if (!parsed) return false
  gradientType.value = parsed.type
  gradientAngle.value = parsed.angle
  colorStops.value = parsed.stops
  activeStopIndex.value = 0
  showColorPicker.value = false
  return true
}

const applyGradientPreset = (preset: { value: string }) => {
  if (loadGradient(preset.value)) updateGradient()
}

// Advanced picker for gradient stops
const applyPointerG = (type: string, x: number, y: number) => {
  const el = type === 'saturation' ? saturationBoxG.value : hueSliderG.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = clamp01((x - rect.left) / rect.width)
  if (type === 'saturation') {
    saturationG.value = Math.round(px * 100)
    valueG.value = Math.round((1 - clamp01((y - rect.top) / rect.height)) * 100)
  } else {
    hueG.value = Math.round(px * 360)
  }
  updateAdvancedColorG()
}

const startDraggingG = (type: 'saturation' | 'hue', event: MouseEvent | TouchEvent) => {
  isDraggingG2.value = type
  const { x, y } = pointer(event)
  applyPointerG(type, x, y)

  document.addEventListener('mousemove', handleDraggingG)
  document.addEventListener('touchmove', handleDraggingG, { passive: false })
  document.addEventListener('mouseup', stopDraggingG)
  document.addEventListener('touchend', stopDraggingG)

  event.preventDefault()
}

const handleDraggingG = (event: MouseEvent | TouchEvent) => {
  if (!isDraggingG2.value) return
  const { x, y } = pointer(event)
  applyPointerG(isDraggingG2.value, x, y)
  if ('touches' in event) event.preventDefault()
}

const stopDraggingG = () => {
  isDraggingG2.value = ''
  document.removeEventListener('mousemove', handleDraggingG)
  document.removeEventListener('touchmove', handleDraggingG)
  document.removeEventListener('mouseup', stopDraggingG)
  document.removeEventListener('touchend', stopDraggingG)
}

const updateAdvancedColorG = () => {
  if (activeStopIndex.value >= colorStops.value.length) return
  const rgb = hsvToRgb(hueG.value / 360, saturationG.value, valueG.value)
  colorStops.value[activeStopIndex.value].color = rgbToHex(rgb.r, rgb.g, rgb.b)
  updateGradient()
}

const computedBgStyle = (color: string) =>
  color === 'transparent' || color === 'advance' ? {} : { backgroundColor: color }

// Close the floating stop picker when clicking outside it and the stop slider
const onDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node
  if (gradientPopover.value && gradientContainer.value
    && !gradientPopover.value.contains(target) && !gradientContainer.value.contains(target)) {
    showColorPicker.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  stopDragging()
  stopDrag()
  stopDraggingG()
})

watch(() => props.useType, (type) => {
  currentTab.value = type === 'both' ? 'pure' : type
}, { immediate: true })

watch(() => props.modelValue, (newValue) => {
  if (!newValue || newValue === currentColor.value) return
  currentColor.value = newValue

  if (loadGradient(newValue)) currentTab.value = 'gradient'
}, { immediate: true })
</script>

<template>
  <PopoverRoot v-model:open="popoverOpen">
    <PopoverTrigger as-child>
      <button type="button" :disabled="props.disabled" :class="['vcp vcp-trigger', props.class]">
        <span class="block w-full h-full rounded-md relative">
          <!-- Checkerboard background for transparency -->
          <span
            v-if="currentColor === 'rgba(0, 0, 0, 0)' || currentColor === 'transparent'"
            class="absolute inset-0 bg-[length:8px_8px] rounded"
            style="background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
                   background-position: 0 0, 0 4px, 4px -4px, -4px 0px;"
          />
          <span class="absolute inset-0 rounded" :style="{ background: currentColor }" />
        </span>
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        side="bottom"
        :side-offset="3"
        :avoid-collisions="true"
        :collision-padding="8"
        class="vcp vcp-content"
      >
        <div v-if="useType === 'both'" class="flex w-full mb-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            v-for="tab in (['pure', 'gradient'] as const)"
            :key="tab"
            type="button"
            :class="[
              tabBtn,
              tab === 'pure' ? 'rounded-e-none border-r-0' : 'rounded-s-none border-l-0',
              currentTab === tab ? 'text-primary bg-white dark:bg-gray-800 shadow-lg' : '',
            ]"
            @click="currentTab = tab"
          >
            <PaletteIcon v-if="tab === 'pure'" class="w-4 h-4 mr-1" />
            <SwatchBookIcon v-else class="w-4 h-4 mr-1" />
            {{ tab === 'pure' ? l.solid : l.gradient }}
          </button>
        </div>

        <!-- PURE COLOR TAB -->
        <div v-if="currentTab === 'pure'" class="space-y-4">
          <!-- Main Color Matrix -->
          <div v-if="!showAdvanced" class="inline-block w-auto">
            <div v-for="(row, rowIndex) in defaultColors" :key="rowIndex" class="grid grid-cols-9 gap-1">
              <button
                v-for="(color, colIndex) in row"
                :key="colIndex"
                type="button"
                class="w-8 h-8 cursor-pointer transition-transform hover:scale-110"
                :style="{ backgroundColor: color }"
                :title="color"
                @click="handleColorChange(color)"
              />
            </div>
            <div v-for="(row, rowIndex) in extraDefaultColors" :key="rowIndex + 'e'" class="grid grid-cols-9 gap-1 mt-1">
              <button
                v-for="(color, colIndex) in row"
                :key="colIndex"
                type="button"
                class="w-8 h-8 cursor-pointer transition-transform hover:scale-110"
                :style="{ backgroundColor: color }"
                :title="color === 'advance' ? 'Custom' : color"
                @click="handleColorChange(color)"
              >
                <span
                  class="block w-full h-full"
                  :class="{
                    'bg-white relative': color === 'transparent',
                    'bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500': color === 'advance',
                  }"
                  :style="computedBgStyle(color)"
                >
                  <!-- Diagonal line for transparent option -->
                  <span
                    v-if="color === 'transparent'"
                    class="absolute top-1/2 left-0 w-full h-[1px] bg-red-500 origin-center -rotate-45"
                  />
                </span>
              </button>
            </div>
          </div>

          <!-- Advanced Color Picker -->
          <div v-else class="space-y-5">
            <div class="flex items-center justify-between">
              <button type="button" :class="btnOutline" @click="showAdvanced = false">
                <ArrowLeftIcon class="w-3.5 h-3.5" />
                {{ l.back }}
              </button>

              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-lg border border-gray-200 shadow-sm" :style="{ backgroundColor: currentColor }" />
                <div class="text-xs font-mono text-gray-600 bg-gray-100 py-1 px-2 rounded">{{ currentColor }}</div>
              </div>
            </div>

            <!-- Saturation-Value Box -->
            <div
              ref="saturationBox"
              class="relative w-full h-40 rounded-xl overflow-hidden cursor-crosshair shadow-inner"
              :style="{ backgroundColor: `hsl(${hue}deg, 100%, 50%)` }"
              @mousedown="startDragging('saturation', $event)"
              @touchstart="startDragging('saturation', $event)"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-white to-transparent">
                <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
              </div>
              <div
                class="absolute w-5 h-5 border-2 border-white rounded-full -translate-x-2.5 -translate-y-2.5 shadow-lg"
                :style="{ left: `${saturation}%`, top: `${100 - value}%` }"
              />
            </div>

            <!-- Hue Slider -->
            <div ref="hueSlider" class="relative h-5 mt-4 rounded-lg overflow-hidden shadow-sm">
              <div
                class="absolute inset-0 rounded-lg cursor-pointer"
                style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                @mousedown="startDragging('hue', $event)"
                @touchstart="startDragging('hue', $event)"
              />
              <div
                class="absolute w-5 h-5 -ml-2.5 top-1/2 -translate-y-1/2 bg-white rounded-full shadow-md border border-gray-200 pointer-events-none"
                :style="{ left: `${(hue / 360) * 100}%` }"
              />
            </div>

            <!-- Alpha Slider -->
            <div ref="alphaSlider" class="relative h-5 mt-4 rounded-lg overflow-hidden shadow-sm">
              <div class="absolute inset-0 rounded-lg">
                <div
                  class="absolute inset-0 rounded-lg"
                  style="background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                         linear-gradient(-45deg, #ccc 25%, transparent 25%),
                         linear-gradient(45deg, transparent 75%, #ccc 75%),
                         linear-gradient(-45deg, transparent 75%, #ccc 75%);
                         background-size: 8px 8px;
                         background-position: 0 0, 0 4px, 4px -4px, -4px 0px;"
                />
                <div
                  class="absolute inset-0 rounded-lg cursor-pointer"
                  :style="{ background: `linear-gradient(to right, transparent, ${currentColor})` }"
                  @mousedown="startDragging('alpha', $event)"
                  @touchstart="startDragging('alpha', $event)"
                />
              </div>
              <div
                class="absolute w-5 h-5 -ml-2.5 top-1/2 -translate-y-1/2 bg-white rounded-full shadow-md border border-gray-200 pointer-events-none"
                :style="{ left: `${alpha}%` }"
              />
            </div>

            <!-- Hex/RGBA Input -->
            <div class="flex mt-3">
              <input
                v-model="currentColor"
                type="text"
                class="w-full text-sm h-10 rounded-lg border border-gray-200 bg-transparent px-3 dark:border-gray-600"
                placeholder="#RRGGBB or rgba(r,g,b,a)"
                @input="updateColor(currentColor)"
              >
            </div>
          </div>
        </div>

        <!-- GRADIENT TAB -->
        <div v-else class="space-y-4">
          <!-- Gradient Type -->
          <div class="flex items-center justify-between mb-5">
            <div class="grid grid-cols-3 rounded-lg w-full overflow-hidden shadow-sm border border-gray-200 dark:border-gray-500">
              <button
                v-for="(type, i) in (['linear', 'radial', 'conic'] as const)"
                :key="type"
                type="button"
                :class="[
                  btn,
                  'px-4 py-2',
                  i === 0 ? 'rounded-e-none' : i === 1 ? 'rounded-none' : 'rounded-s-none',
                  gradientType === type ? 'bg-primary text-primary-foreground' : 'bg-gray-50 dark:bg-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-600',
                ]"
                @click="setGradientType(type)"
              >
                {{ l[type] }}
              </button>
            </div>
          </div>

          <!-- Angle -->
          <div v-if="gradientType !== 'radial'" class="mb-5">
            <div class="grid grid-cols-6 items-center gap-1.5 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <button
                v-for="angle in gradientDirections"
                :key="angle"
                type="button"
                class="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-gray-200"
                :class="gradientAngle === angle ? 'bg-primary text-primary-foreground shadow-md' : 'bg-white dark:bg-gray-600 shadow-sm'"
                @click="setGradientAngle(angle)"
              >
                <ArrowUpIcon class="w-5 h-5" :style="{ transform: `rotate(${angle}deg)` }" />
              </button>
              <div class="col-span-3 flex items-center gap-3">
                <span class="text-sm text-gray-600 dark:text-gray-300">{{ l.angle }}:</span>
                <input
                  v-model.number="gradientAngle"
                  type="number"
                  class="w-20 h-8 px-2 text-sm rounded-md border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
                  :min="0"
                  :max="360"
                  @input="updateGradient"
                >
                <span class="text-sm text-gray-600 dark:text-gray-300">deg</span>
              </div>
            </div>
          </div>

          <!-- Gradient Presets -->
          <div class="mb-4">
            <p class="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">{{ l.presets }}</p>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="(preset, index) in gradientPresets"
                :key="index"
                type="button"
                class="h-10 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 hover:scale-105 hover:shadow-md"
                :style="{ background: preset.value }"
                :title="preset.name"
                @click="applyGradientPreset(preset)"
              />
            </div>
          </div>

          <!-- Gradient Preview with Stops -->
          <div class="mb-4">
            <p class="text-sm font-medium mb-2">{{ l.preview }}</p>
            <div class="relative h-12 rounded-md overflow-hidden">
              <div class="absolute inset-0" :style="{ background: gradientValue }" />
            </div>

            <div class="flex justify-between mt-2 mb-2">
              <button type="button" :class="btnOutline" :disabled="colorStops.length >= 5" @click="addColorStop">
                <PlusIcon class="w-4 h-4 mr-1" />
                {{ l.addStop }}
              </button>
              <button type="button" :class="btnOutline" :disabled="colorStops.length <= 2" @click="removeColorStop(activeStopIndex)">
                <TrashIcon class="w-4 h-4 mr-1" />
                {{ l.removeStop }}
              </button>
            </div>

            <!-- Color Stops Slider -->
            <div ref="gradientContainer" class="relative h-8 mt-4 mb-10">
              <div class="absolute inset-0 rounded-md" :style="{ background: gradientValue }" />
              <button
                v-for="(stop, index) in colorStops"
                :key="index"
                type="button"
                class="absolute w-6 h-6 -ml-3 top-1/2 rounded-full border-2 cursor-pointer shadow-sm -translate-y-1/2"
                :class="[
                  activeStopIndex === index ? 'ring-2 ring-blue-500 border-white' : 'border-gray-200',
                  { 'z-10': activeStopIndex === index },
                ]"
                :style="{ backgroundColor: stop.color, left: `${stop.position}%` }"
                @click.stop="handleStopClick(index)"
                @mousedown.stop="activeStopIndex = index; startDrag($event)"
                @touchstart.stop="activeStopIndex = index; startDrag($event)"
              />
            </div>
          </div>

          <!-- Floating Color Picker for Active Stop -->
          <div
            v-if="activeStopIndex < colorStops.length && showColorPicker"
            ref="gradientPopover"
            class="absolute w-[250px] p-2 bg-white dark:bg-gray-800 shadow-lg z-50 rounded-md border border-gray-200 dark:border-gray-600"
            :style="{ left: getPopoverPosition(colorStops[activeStopIndex].position), bottom: '40px' }"
          >
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full border" :style="{ backgroundColor: colorStops[activeStopIndex].color }" />
                <span class="text-xs font-medium">{{ colorStops[activeStopIndex].color }}</span>
              </div>

              <div class="flex gap-1">
                <button v-if="showAdvancedG" type="button" :class="[btnGhost, 'px-2']" @click.stop="showAdvancedG = false">
                  {{ l.back }}
                </button>
                <button type="button" :class="[btnGhost, 'w-7']" :aria-label="l.close" @click="showColorPicker = false">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Color Matrix (Basic Mode) -->
            <div v-if="!showAdvancedG" class="grid">
              <div v-for="(row, rowIndex) in defaultColors.slice(0, 5)" :key="rowIndex" class="grid grid-cols-9 gap-1">
                <button
                  v-for="(color, colIndex) in row"
                  :key="colIndex"
                  type="button"
                  class="w-6 h-6 cursor-pointer transition-transform hover:scale-110"
                  :style="{ backgroundColor: color }"
                  @click="updateGradientColor(color)"
                />
              </div>
              <div v-for="(row, rowIndex) in normalExtraDefaultColors" :key="rowIndex + 'ext'" class="grid grid-cols-9 gap-1 mt-1">
                <button
                  v-for="(color, colIndex) in row"
                  :key="colIndex"
                  type="button"
                  class="w-6 h-6 cursor-pointer transition-transform hover:scale-110"
                  :style="{ backgroundColor: color }"
                  @click.stop="updateGradientColor(color)"
                >
                  <span
                    class="block w-full h-full"
                    :class="{ 'bg-gradient-to-tr from-red-500 via-yellow-500 to-blue-500': color === 'advance' }"
                    :style="computedBgStyle(color)"
                  />
                </button>
              </div>
            </div>

            <!-- Advanced Color Picker -->
            <div v-else class="space-y-4">
              <div
                ref="saturationBoxG"
                class="relative w-full h-28 rounded cursor-crosshair"
                :style="{ backgroundColor: `hsl(${hueG}deg, 100%, 50%)` }"
                @mousedown="startDraggingG('saturation', $event)"
                @touchstart="startDraggingG('saturation', $event)"
              >
                <div class="absolute inset-0 bg-gradient-to-r from-white to-transparent">
                  <div class="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
                </div>
                <div
                  class="absolute w-4 h-4 border-2 border-white rounded-full -translate-x-2 -translate-y-2 shadow-sm"
                  :style="{ left: `${saturationG}%`, top: `${100 - valueG}%` }"
                />
              </div>

              <div ref="hueSliderG" class="relative h-4">
                <div
                  class="absolute inset-0 rounded cursor-pointer"
                  style="background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                  @mousedown="startDraggingG('hue', $event)"
                  @touchstart="startDraggingG('hue', $event)"
                />
                <div
                  class="absolute w-4 h-4 -ml-2 bg-white rounded-full shadow-md border pointer-events-none"
                  :style="{ left: `${(hueG / 360) * 100}%` }"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
