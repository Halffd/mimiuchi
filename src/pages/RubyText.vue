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

<script>
export default {
  name: 'RubyText',
  props: {
    baseText: {
      type: String,
      required: true
    },
    rubyText: {
      type: String,
      required: false,
      default: ''
    }
  },
  computed: {
    hasRuby() {
      return !!this.rubyText;
    },
    baseTextWords() {
      return this.baseText.split('|').filter(Boolean);
    },
    rubyTextWords() {
      return this.rubyText.split('|').filter(Boolean);
    },
    safeBaseText() {
      return this.baseText.replace(/\|/g, '');
    }
  }
};
</script>

<style scoped>
/* Add any desired styles here */
</style>
