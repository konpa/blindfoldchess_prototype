import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    lichessAccessToken: '' as string,
    isLoggedIn: false as boolean,
    paramShowBoardDiagram: false as boolean,
    paramShowKeyboard: true as boolean,
    paramShowFigures: true as boolean,
  },
  mutations: {
    setLichessAccessToken(state, token: string) {
      state.lichessAccessToken = token;
    },
    setIsLoggedIn(state, isLoggedIn: boolean) {
      state.isLoggedIn = isLoggedIn;
    },
    setParamShowBoardDiagram(state, paramShowBoardDiagram: boolean) {
      state.paramShowBoardDiagram = paramShowBoardDiagram;
    },
    setParamShowKeyboard(state, paramShowKeyboard: boolean) {
      state.paramShowKeyboard = paramShowKeyboard;
    },
    setParamShowFigures(state, paramShowFigures: boolean) {
      state.paramShowFigures = paramShowFigures;
    },
  },
  actions: {
  },
  modules: {
  },
});
