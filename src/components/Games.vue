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
      <div class="break-words p-4 bg-gray-100" v-html="gamePGN"></div>
    </div>
    <div v-if="playingGame && paramShowBoardDiagram">
      <img :src="boardImage">
    </div>
    <t-alert v-if="alertMessage" :variant="alertVariant" show class="mt-2">
      {{ alertMessage }}
    </t-alert>
    <div v-if="playingGame" class="mt-2">
      <div v-if="paramShowKeyboard" class="keyboard flex flex-wrap items-center">
        <div
          v-for="(key, index) in keyboard" :key="index"
          v-html="replaceFigures(key)"
          v-bind:class="[key === 'break' ? 'key-break': 'key']"
          v-on:click="keyboardWrite(key)"
        >
        </div>
      </div>
      <div v-if="isStreaming" class="keyboard flex flex-wrap items-center">
        <input
          type="text"
          v-model="myNextMove"
          v-on:keyup.enter="sendMove"
          autofocus
          placeholder="Next move"
          class="border-solid border-2 w-24 h-10 mr-2"
        >
        <button
          v-if="paramShowKeyboard"
          class="key key-erase"
          v-on:click="keyboardErase()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2
              2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
        </button>
        <button
          v-if="paramShowKeyboard"
          class="key key-enter"
          v-on:click="sendMove"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          class="key key-resign"
          v-on:click="resignGame"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6
              3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
          </svg>
        </button>
      </div>
      <ul class="mt-2 moves-list">
        <li v-for="(line, index) in gameLines" :key="index" v-html="replaceFigures(line)"></li>
      </ul>
    </div>
    <div v-else>
      No current game ->
      <a href="#" v-on:click="challengeAI" class="underline">Start a new game</a>
      <span>
        (Stockfish level
        <select name="AILevel" id="AILevel-select" v-model="AILevel">
          <option value="1">1 (800)</option>
          <option value="2">2 (1100)</option>
          <option value="3">3 (1400)</option>
          <option value="4">4 (1700)</option>
          <option value="5">5 (2000)</option>
          <option value="6">6 (2300)</option>
          <option value="7">7 (2700)</option>
          <option value="8">8 (3000)</option>
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
        'K','Q','R','B','N',
        '1','2','3','4','5','6','7','8',
        'x','-','O',

      ],
      /* eslint-enable comma-spacing */
      figuresMapping: {
        K: '&#9818;',
        Q: '&#9819;',
        R: '&#9820;',
        B: '&#9821;',
        N: '&#9822;',
      } as { [key: string]: string; },
      chessSound: new Audio('audio/chess-move.mp3'),
    };
  },

  computed: {
    ...mapState([
      'lichessAccessToken',
      'isLoggedIn',
      'paramShowKeyboard',
      'paramShowBoardDiagram',
      'paramShowFigures',
    ]),
  },

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
            let whiteClasses = '';
            let blackClasses = '';

            if (history.length === (index + 1)) {
              whiteClasses += ' last-move';
            }

            if (
              history[index + 1] !== undefined
              && history.length === (index + 2)
            ) {
              blackClasses += ' last-move';
            }

            let line = `<span class="move-number">${lineNumber}.</span>`;
            line += `<span class="white-move${whiteClasses}">${history[index]}</span>`;

            if (history[index + 1] !== undefined) {
              line += `<span class="black-move${blackClasses}">${history[index + 1]}</span>`;
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

        this.chessSound.play();
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
          level: this.AILevel,
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

    replaceFigures(str: string) {
      let newStr = str;

      if (this.paramShowFigures) {
        Object.entries(this.figuresMapping).forEach((entry) => {
          const [key, value] = entry;
          if (newStr.includes(key)) {
            newStr = newStr.replaceAll(key, value);
          }
        });
      }

      return newStr;
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
.moves-list {
  font-size: 1.2rem;
}
.last-move {
  font-size: 1.4rem;
  font-weight: bold;
}
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
    padding: 5px 18px;
    margin-right: 5px;
    margin-bottom: 5px;
    border-radius: 5px;
    font-size: 2rem;
}
.key-break {
  flex-basis: 100%;
  height: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
}
.key:hover {
  background: black;
  color: white;
}
</style>
