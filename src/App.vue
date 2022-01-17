<template>
  <div id="app" class="min-h-full flex items-center justify-center py-2 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-4">
      <router-view/>
    </div>
  </div>
</template>

<style lang="postcss">
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
