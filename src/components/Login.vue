<template>
  <div class="login">
    <div v-if="token">
      <ul>
        <li>Username: {{ username }}</li>
        <li>Token: {{ token }}</li>
      </ul>
      <button v-if="token" v-on:click="logout">Logout</button>
    </div>
    <div v-else>
      <button v-on:click="login">Login with lichess.org</button>
    </div>

    <pre v-if="error">
      {{ error }}
    </pre>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { AccessContext, HttpClient, OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

export default Vue.extend({
  data() {
    return {
      oauth: new OAuth2AuthCodePKCE({
        authorizationUrl: 'https://lichess.org/oauth',
        tokenUrl: 'https://lichess.org/api/token',
        clientId: 'blindfoldchess.dev',
        scopes: ['email:read'],
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
      username: '' as string,
      token: '' as string,
      error: '' as unknown,
    };
  },
  methods: {
    login() {
      this.oauth.fetchAuthorizationCode();
    },
    async getUsername(fetch: HttpClient) {
      const res = await fetch('https://lichess.org/api/account');
      this.username = (await res.json()).username;
    },
    async logout() {
      this.accessContext = {};
      this.error = '';
      this.username = '';

      // Example request using vanilla fetch: Revoke access token.
      await fetch('https://lichess.org/api/token', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      this.token = '';
    },
  },
  async mounted() {
    try {
      const hasAuthCode = await this.oauth.isReturningFromAuthServer();
      if (hasAuthCode) {
        // Might want to persist accessContext.token until the user logs out.
        this.accessContext = await this.oauth.getAccessToken();

        if (this.accessContext.token) {
          this.token = this.accessContext.token.value;
        }

        // Can also use this convenience wrapper for fetch() instead of
        // using manually using getAccessToken() and setting the
        // "Authorization: Bearer ..." header.
        const fetch = this.oauth.decorateFetchHTTPClient(window.fetch);
        await this.getUsername(fetch);
      }
    } catch (err: unknown) {
      this.error = err;
    }
  },
});
</script>
