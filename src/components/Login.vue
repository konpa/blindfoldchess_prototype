<template>
  <div class="mt-2 space-y-2">
    <div class="flex justify-between items-center">
      <h3 class="text-lg leading-6 font-medium text-gray-900 uppercase">
        Blindfold Lichess
      </h3>
      <div v-if="lichessAccessToken">
        <a :href="user.url" target="_blank" class="underline">{{ user.username }}</a>
         / <a v-on:click="logout" class="underline">logout</a>
      </div>
      <div v-else>
        <a href="#" v-on:click="login" class="underline">Login with lichess.org</a>
      </div>
    </div>
    <t-alert v-if="error" variant="danger" show>
      {{ error }}
    </t-alert>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { AccessContext, OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

export default Vue.extend({
  data() {
    return {
      oauth: new OAuth2AuthCodePKCE({
        authorizationUrl: 'https://lichess.org/oauth',
        tokenUrl: 'https://lichess.org/api/token',
        clientId: 'blindfoldchess.dev',
        scopes: ['challenge:write', 'bot:play', 'board:play'],
        redirectUrl: (() => {
          const url = new URL(window.location.href);
          url.search = '';
          return url.href;
        })(),
        onAccessTokenExpiry(refreshAccessToken) {
          return refreshAccessToken();
        },
        onInvalidGrant() {
          // do nothing
        },
      }),
      accessContext: {} as AccessContext,
      user: {} as Record<string, unknown>,
      lichessAccessToken: '' as string,
      error: '' as unknown,
    };
  },
  methods: {
    login() {
      this.oauth.fetchAuthorizationCode();
    },
    async getUsername() {
      const res = await fetch('https://lichess.org/api/account', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.lichessAccessToken}`,
        },
      });
      this.user = (await res.json());
    },
    async logout() {
      this.accessContext = {};
      this.error = '';
      this.user = {};

      // Example request using vanilla fetch: Revoke access token.
      await fetch('https://lichess.org/api/token', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.lichessAccessToken}`,
        },
      });

      this.lichessAccessToken = '';
      localStorage.removeItem('lichessAccessToken');
    },
  },
  async mounted() {
    if (localStorage.lichessAccessToken) {
      this.lichessAccessToken = localStorage.lichessAccessToken;
      await this.getUsername();
    } else {
      try {
        const hasAuthCode = await this.oauth.isReturningFromAuthServer();
        if (hasAuthCode) {
          // Might want to persist accessContext.token until the user logs out.
          this.accessContext = await this.oauth.getAccessToken();

          if (this.accessContext.token) {
            this.lichessAccessToken = this.accessContext.token.value;
            localStorage.lichessAccessToken = this.accessContext.token.value;
          }

          await this.getUsername();
        }
      } catch (err: unknown) {
        this.error = err;
      }
    }
  },
});
</script>
