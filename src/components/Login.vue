<template>
  <div class="login">
    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          Blindfold LiChess
        </h3>
        <p class="mt-1 max-w-2xl text-sm text-gray-500">
          Blindfold chess for lichess.org
        </p>
      </div>
      <div v-if="lichessAccessToken" class="border-t border-gray-200">
        <dl>
          <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">
              Username
            </dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {{ user.username }}
            </dd>
          </div>
          <div class="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">
              Link to profile
            </dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <a :href="user.url" target="_blank">{{ user.url }}</a>
            </dd>
          </div>
          <div class="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-gray-500">
              Correspondence
            </dt>
            <dd class="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {{ user.perfs.correspondence.rating }} / {{ user.perfs.correspondence.games }} game(s)
            </dd>
          </div>
        </dl>
      </div>
    </div>
    <div class="mt-8 space-y-6">
      <div v-if="lichessAccessToken">
        <t-button
          v-if="lichessAccessToken"
          v-on:click="logout"
          class="w-full"
          variant="error"
        >Logout</t-button>
      </div>
      <div v-else>
        <t-button v-on:click="login" class="w-full">Login with lichess.org</t-button>
      </div>
      <t-alert v-if="error" variant="danger" show>
        {{ error }}
      </t-alert>
    </div>
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
