const app = new Vue({
    el: '#app',
    data: {
        screen: 'start',
        words: [],
        position: 0,
        word: '',
        countdown: 0,
        time: 0,
        yourWPM: 0,
        opponentWPM: 0
    },
    computed: {
        leftSide: function() {
            const i = this.findFirstDiffPos(this.word, this.currentWord);
            return i !== -1 ? this.currentWord.substring(0, i) : this.word;
        },
        middle: function() {
            const i = this.findFirstDiffPos(this.word, this.currentWord);
            return i !== -1 ? this.currentWord[i] : '';
        },
        rightSide: function() {
            const i = this.findFirstDiffPos(this.word, this.currentWord);
            return i !== -1 ? this.currentWord.substring(i + 1) : this.currentWord.substring(this.word.length);
        },
        previousWord: function() {
            return this.position > 0 ? this.words[this.position - 1] : '';
        },
        currentWord: function() {
            return this.words[this.position];
        },
        nextWord: function() {
            return this.position + 1 < this.words.length ? this.words[this.position + 1] : '';
        },
        nextNextWord: function() {
            return this.position + 2 < this.words.length ? this.words[this.position + 2] : '';
        },
        timeLeft: function() {
            return 60 - this.time;
        }
    },
    watch: {
        word: function(value) {
            if (value === this.words[this.position]) {
                socket.emit('type');
                this.word = '';
                this.position++;
            }
        }
    },
    methods: {
        findFirstDiffPos: function(a, b) {
            const longerLength = Math.min(a.length, b.length);
            for (var i = 0; i < longerLength; i++)
            {
                if (a[i] !== b[i]) return i;
            }

            return -1;
        },
        start: function() {
            this.screen = 'queue';
            socket.emit('start');
        }
    },
    mounted: function() {
        setTimeout(() => {
            this.start();
        }, 200);
    }
});

const socket = new io();
socket.on('game_words', (words) => {
    console.log(words);
    app.words = words;
});

socket.on('game_start', (countdown) => {
    app.screen = 'countdown';
    app.countdown = countdown;
});

socket.on('game_timer', (data) => {
    app.screen = 'game';
    app.time = data.time;
    app.yourWPM = data.your_wpm;
    app.opponentWPM = data.opponent_wpm;
    setTimeout(() => {
        app.$refs.word.focus();
    }, 100);
});

socket.on('game_disconnect', () => {
    console.log('DISCONNECT');
});

socket.on('game_over', () => {
    app.screen = 'over';
    app.words = [];
    app.position = 0;
    app.word = '';
    app.countdown = 0;
    app.time = 0;
    app.yourWPM = 0;
    app.opponentWPM = 0;
});
