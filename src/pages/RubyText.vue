<template>
  <span>
    <ruby v-if="hasRuby">
      <template v-for="(baseWord, index) in baseTextWords" :key="`base-${index}`">
        <span>{{ baseWord }}</span>
        <rt v-if="rubyTextWords[index]">{{ rubyTextWords[index] }}</rt>
      </template>
    </ruby>
    <span v-else>{{ safeBaseText }}</span>
  </span>
</template>
