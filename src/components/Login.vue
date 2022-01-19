<template>
  <div class="mt-2 space-y-2">
    <div class="flex justify-between items-center">
      <h3 class="text-lg leading-6 font-medium text-gray-900 uppercase">
        Blindfold Lichess
      </h3>
      <div v-if="isLoggedIn">
        <a :href="user.url" target="_blank" class="underline">{{ user.username }}</a>
        &bull;
        <a href="#" v-on:click="switchParameters()">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0
              4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </a>
        &bull;
        <a href="#" v-on:click="logout" class="underline">logout</a>
      </div>
      <div v-else>
        <a href="#" v-on:click="login" class="underline">Login with lichess.org</a>
      </div>
    </div>
    <t-alert v-if="error" variant="danger" show>
      {{ error }}
    </t-alert>
    <div
      v-if="showParameters"
      class="mt-2 p-4 bg-gray-100"
    >
      <div>
        <input
          :checked="paramShowBoardDiagram"
          @input="updateParamShowBoardDiagram"
          type="checkbox"
          id="paramShowBoardDiagram"
          name="paramShowBoardDiagram"
          class="mr-2"
        >
        <label for="paramShowBoardDiagram">Show board diagram</label>
      </div>
      <div>
        <input
          :checked="paramShowKeyboard"
          @input="updateParamShowKeyboard"
          type="checkbox"
          id="paramShowKeyboard"
          name="paramShowKeyboard"
          class="mr-2"
        >
        <label for="paramShowKeyboard">Show keyboard</label>
      </div>
      <div>
        <input
          :checked="paramShowFigures"
          @input="updateParamShowFigures"
          type="checkbox"
          id="paramShowFigures"
          name="paramShowFigures"
          class="mr-2"
        >
        <label for="paramShowFigures">Replace pieces letters by figures</label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState, mapMutations } from 'vuex';
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
      error: '' as unknown,
      showParameters: false as boolean,
    };
  },

  computed: mapState([
    'lichessAccessToken',
    'isLoggedIn',
    'paramShowBoardDiagram',
    'paramShowKeyboard',
    'paramShowFigures',
  ]),

  methods: {

    ...mapMutations([
      'setLichessAccessToken',
      'setIsLoggedIn',
      'setParamShowBoardDiagram',
      'setParamShowKeyboard',
      'setParamShowFigures',
    ]),

    login() {
      this.oauth.fetchAuthorizationCode();
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateParamShowBoardDiagram(e: any) {
      this.setParamShowBoardDiagram(e.target.checked);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateParamShowKeyboard(e: any) {
      this.setParamShowKeyboard(e.target.checked);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateParamShowFigures(e: any) {
      this.setParamShowFigures(e.target.checked);
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

      this.setLichessAccessToken('');
      this.setIsLoggedIn(false);
      localStorage.removeItem('lichessAccessToken');
    },

    switchParameters() {
      this.showParameters = !this.showParameters;
    },
  },

  async mounted() {
    if (localStorage.lichessAccessToken) {
      this.setLichessAccessToken(localStorage.lichessAccessToken);
      this.setIsLoggedIn(true);
      await this.getUsername();
    } else {
      try {
        const hasAuthCode = await this.oauth.isReturningFromAuthServer();
        if (hasAuthCode) {
          // Might want to persist accessContext.token until the user logs out.
          this.accessContext = await this.oauth.getAccessToken();

          if (this.accessContext.token) {
            this.setLichessAccessToken(this.accessContext.token.value);
            this.setIsLoggedIn(true);
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
