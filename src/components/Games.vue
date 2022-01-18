<template>
  <div v-if="isLoggedIn" class="mt-6">
    <h2 class="text-lg leading-6 font-medium text-gray-900">
      Current game (Stockfish level {{ AILevel }})
    </h2>
    <div v-if="gameLink" class="mt-2">
      Analyze on Lichess:
      <a :href="gameLink" target="_blank" class="underline">{{ gameLink }}</a>
      <br>
      Or copy/paste PGN: <br>
      <div class="break-words bg-slate-300" v-html="gamePGN"></div>
    </div>
    <div v-if="playingGame" class="mt-2">
      <input
        v-model="showBoardDiagram"
        type="checkbox"
        id="showBoardDiagram"
        name="showBoardDiagram"
        class="mr-2"
      >
      <label for="showBoardDiagram">Show board diagram</label>
      <input
        v-model="showKeyboard"
        type="checkbox"
        id="showKeyboard"
        name="showKeyboard"
        class="ml-2 mr-2"
      >
      <label for="showKeyboard">Show keyboard</label>
    </div>
    <div v-if="playingGame && showBoardDiagram">
      <img :src="boardImage">
    </div>
    <t-alert v-if="alertMessage" :variant="alertVariant" show class="mt-2">
      {{ alertMessage }}
    </t-alert>
    <div v-if="playingGame">
      <div class="keyboard flex flex-wrap mt-2">
        <div
          class="key"
          v-for="(key, index) in keyboard" :key="index"
          v-on:click="keyboardWrite(key)"
        >
          {{ key }}
        </div>
        <div class="key" v-on:click="keyboardErase()">&#9003;</div>
        <div class="key" v-on:click="sendMove">&crarr;</div>
      </div>
      <span v-if="isStreaming">
        Your move:
        <input
          type="text"
          v-model="myNextMove"
          v-on:keyup.enter="sendMove"
          autofocus
          class="border-solid border-2 w-12 mt-2"
        >
        or <a href="#" v-on:click="resignGame" class="underline">resign</a>
      </span>
      <ul class="mt-2">
        <li v-for="(line, index) in gameLines" :key="index" v-html="line"></li>
      </ul>
    </div>
    <div v-else>
      No current game ->
      <a href="#" v-on:click="challengeAI" class="underline">Start a new game</a>
      <span>
        (Stockfish level
        <select name="AILevel" id="AILevel-select" v-model="AILevel">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
        </select>
        )
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapState } from 'vuex';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Chess, { ChessInstance } from 'chess.js';

interface apiResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any,
}

// eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-explicit-any
const readStream = (processLine: any) => (response: any) => {
  const stream = response.body.getReader();
  const matcher = /\r?\n/;
  const decoder = new TextDecoder();
  let buf = '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loop = () => stream.read().then(({ done, value } : { done:any, value:any }) => {
    if (done) {
      if (buf.length > 0) processLine(JSON.parse(buf));
    } else {
      const chunk = decoder.decode(value, {
        stream: true,
      });
      buf += chunk;

      const parts = buf.split(matcher);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      buf = parts.pop()!;

      // eslint-disable-next-line no-restricted-syntax
      for (const i of parts.filter((p) => p)) processLine(JSON.parse(i));

      return loop();
    }

    return false;
  });

  return loop();
};

export default Vue.extend({

  data() {
    return {
      mostUrgentGame: {} as apiResponse,
      chessGame: {} as ChessInstance,
      playingGame: false as boolean,
      gameId: '' as string,
      gameLines: [] as Array<string | null>,
      gameWinner: '' as string,
      gameLink: '' as string,
      gamePGN: '' as string,
      boardImage: '' as string,
      AILevel: '1' as string,
      numberOfMoves: 0 as number,
      myNextMove: '' as string,
      alertMessage: '' as string,
      alertVariant: '' as string,
      showBoardDiagram: false as boolean,
      isStreaming: false as boolean,
      showKeyboard: true as boolean,
      /* eslint-disable comma-spacing */
      keyboard: [
        'a','b','c','d','e','f','g','h',
        '1','2','3','4','5','6','7','8',
        'x','K','Q','R','B','N',
      ],
      /* eslint-enable comma-spacing */
    };
  },

  computed: mapState([
    'lichessAccessToken',
    'isLoggedIn',
  ]),

  watch: {
    async lichessAccessToken() {
      if (
        this.$store.state.isLoggedIn
        && this.$store.state.lichessAccessToken
      ) {
        if (Object.keys(this.mostUrgentGame).length === 0) {
          await this.getMostUrgentGame();
        }

        if (
          typeof this.mostUrgentGame.gameId === 'string'
          && this.isStreaming === false
        ) {
          this.gameId = this.mostUrgentGame.gameId;
          this.chessGame = new Chess();
          this.playingGame = true;
          await this.streamGame(this.gameId);
        }
      }
    },
  },

  methods: {

    async getMostUrgentGame() {
      const res = await fetch('https://lichess.org/api/account/playing?nb=1', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
        },
      });

      const response = (await res.json());

      if (response.nowPlaying && response.nowPlaying[0]) {
        // eslint-disable-next-line prefer-destructuring
        this.mostUrgentGame = response.nowPlaying[0];
        this.AILevel = this.mostUrgentGame?.opponent?.ai;
      }
    },

    async streamGame(gameId: string) {
      const stream = fetch(`https://lichess.org/api/board/game/stream/${gameId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
          Accept: 'application/x-ndjson',
        },
      });

      this.isStreaming = true;

      const onMessage = (obj: apiResponse) => {
        if (
          obj.type === 'gameState'
          && obj.winner
        ) {
          if (typeof obj.winner === 'string') {
            this.gameWinner = obj.winner;
            const pgn = this.chessGame.pgn();
            this.importGame(pgn);
            this.gamePGN = pgn;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let moves: any;

        if (obj.type === 'gameState') {
          moves = obj.moves;
        } else if (obj.type === 'gameFull') {
          if (typeof obj.state === 'object') {
            moves = obj.state?.moves;
          }
        }

        this.chessGame.load_pgn(moves, {
          sloppy: true,
        });

        const history = this.chessGame.history();

        let lineNumber = 1;
        let orderedMoves = Array.from(history, (value, index) => {
          if (index % 2 === 0 || index === 0) {
            let line = `<span class="move-number">${lineNumber}.</span>`;
            line += `<span class="white-move">${history[index]}</span>`;

            if (history[index + 1] !== undefined) {
              line += `<span class="black-move">${history[index + 1]}</span>`;
            }

            lineNumber += 1;

            return line;
          }

          return null;
        });

        orderedMoves = orderedMoves.filter((n) => n);

        this.gameLines = orderedMoves.reverse();

        this.boardImage = 'http://www.fen-to-image.com/image/26/double/coords/';
        this.boardImage += this.chessGame.fen();
      };

      const onComplete = () => {
        this.alertMessage = 'The stream has completed.';
        this.alertVariant = '';
        this.isStreaming = false;
      };

      stream
        .then(readStream(onMessage))
        .then(onComplete);
    },

    async challengeAI() {
      const res = await fetch('https://lichess.org/api/challenge/ai', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
        },
        body: new URLSearchParams({
          level: '1',
          color: 'random',
          variant: 'standard',
        }),
      });

      this.gameId = (await res.json()).id;

      if (this.gameId) {
        this.chessGame = new Chess();
        this.playingGame = true;
        await this.streamGame(this.gameId);
      }
    },

    async sendMove() {
      const move = await this.chessGame.move(this.myNextMove);

      if (move === null) {
        this.alertMessage = 'This move is not legal!';
        this.alertVariant = 'danger';
        return false;
      }

      const res = await fetch(`https://lichess.org/api/board/game/${this.gameId}/move/${move.from}${move.to}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
        },
      });

      const response = (await res.json());

      if (response.error) {
        this.alertMessage = response.error;
        this.alertVariant = 'danger';
      } else {
        this.myNextMove = '';
        this.alertMessage = '';
      }

      return true;
    },

    async importGame(pgn: string) {
      const res = await fetch('https://lichess.org/api/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
        },
        body: new URLSearchParams({ pgn }),
      });

      this.gameLink = (await res.json()).url;
    },

    async resignGame() {
      await fetch(`https://lichess.org/api/board/game/${this.gameId}/resign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.$store.state.lichessAccessToken}`,
        },
      });
    },

    keyboardWrite(key: string) {
      this.myNextMove = `${this.myNextMove}${key}`;
    },

    keyboardErase() {
      this.myNextMove = this.myNextMove.slice(0, -1);
    },
  },

  async mounted() {
    if (
      this.$store.state.isLoggedIn
      && this.$store.state.lichessAccessToken
    ) {
      if (Object.keys(this.mostUrgentGame).length === 0) {
        await this.getMostUrgentGame();
      }

      if (
        typeof this.mostUrgentGame.gameId === 'string'
        && this.isStreaming === false
      ) {
        this.gameId = this.mostUrgentGame.gameId;
        this.chessGame = new Chess();
        this.playingGame = true;
        await this.streamGame(this.gameId);
      }
    }
  },
});
</script>

<style lang="postcss">
.move-number {
  display: inline-block;
  min-width: 35px;
  font-weight: bold;
}
.white-move {
  display: inline-block;
  min-width: 100px;
}
.key {
    cursor: pointer;
    border: 1px solid;
    padding: 5px 10px;
    margin-right: 5px;
    margin-bottom: 5px;
    border-radius: 5px;
}
.key:hover {
  background: black;
  color: white;
}
</style>
