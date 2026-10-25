<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from '../src'

const solid = ref('#1f87e8')
const gradient = ref('linear-gradient(45deg, #ff9a9e 0%, #fad0c4 100%)')
const both = ref('#05a045')
</script>

<template>
  <h1>vue3-gradient-color-picker</h1>
  <div style="display: flex; gap: 48px; align-items: start">
    <div><p>Solid only</p><ColorPicker v-model="solid" use-type="pure" allow-transparent /><pre>{{ solid }}</pre></div>
    <div><p>Gradient only</p><ColorPicker v-model="gradient" use-type="gradient" /><pre>{{ gradient }}</pre></div>
    <div><p>Both</p><ColorPicker v-model="both" /><pre>{{ both }}</pre></div>
  </div>
  <div :style="{ marginTop: '24px', height: '80px', borderRadius: '12px', background: gradient }" />
</template>
