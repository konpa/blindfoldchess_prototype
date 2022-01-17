import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    lichessAccessToken: '' as string,
    isLoggedIn: false as boolean,
  },
  mutations: {
    setLichessAccessToken(state, token: string) {
      state.lichessAccessToken = token;
    },
    setIsLoggedIn(state, isLoggedIn: boolean) {
      state.isLoggedIn = isLoggedIn;
    },
  },
  actions: {
  },
  modules: {
  },
});
