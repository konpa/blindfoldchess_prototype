<template>
  <div class="home">
    <Login/>
    <Games/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Login from '@/components/Login.vue';
import Games from '@/components/Games.vue';

@Component({
  components: {
    Login,
    Games,
  },
})
export default class Home extends Vue {}
</script>
