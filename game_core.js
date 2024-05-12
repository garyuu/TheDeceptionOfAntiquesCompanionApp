const initStatus = {
    mode: 0, // 0: Single Device, 1: Multiple Device(Local), 2: Multiple Device(Remote)
    player_number: 0,
    round: -1, // -1: Choose Character, 0-2: Normal Round, 3: Summary Round
    current_player_index: 0,
    not_activated_player_indexes: [],
    poisoned_players_indexes: [],
    result_inverted: false,
    hided_index: -1,
    jiyunfu_poisoned: false,
    vote_results: [],
    identify_results: [],
    players: [],

    end_score: -1,
    ended: false,

    hash: "",
    created_timestamp: 0,
    first_player_index: -1,
    huangyanyan_failed_round: 0,
    kidokana_failed_round: 0,
    zodiacs_per_round: [],
};

const getInitStatus = () => Object.assign({}, initStatus);

const getRandomInt = (max) => Math.floor(Math.random() * max);

const errorCode = {
    HASH_MISMATCHED: 1001,
    DUPLICATED_NAME: 1002,
    PLAYER_FULL: 1003,

    ALREADY_JOINED: 2001,
    DUPLICATED_COLOR: 2002,
    DUPLICATED_CHARACTER: 2003,


};

const getError = (code, message) => new Error({ code: code, message: message });

const characterEnum = {
    xuyuan: 1,
    fangzeng: 2,
    kidokana: 3,
    huangyanyan: 4,
    jiyunfu: 5,
    laochaofeng: 6,
    yaoburan: 7,
    zhengguoqu: 8,
}

const hashMatchCharacters = 6;

class GameCore {
    name;
    seed;
    color;
    character;

    info;

    status;

    // This is used for join
    constructor(name, hash, status) {
        if (hash !== status.hash.substring(0, hashMatchCharacters)) {
            throw getError(errorCode.HASH_MISMATCHED, `Passed in hash ${hash} and status hash {${status.hash}} do not matched.`);
        }

        this.name = name;
        this.hash = hash;
        import(status);
    }

    // This is used for create
    constructor(name, mode, player_number) {
        this.name = name;
        const status = getInitStatus(mode, player_number);
        status.mode = mode;
        status.player_number = player_number;
        this.generateRandomData(status);
        import(status);
    }

    import(status) {
        this.status = status;

        if (this.getCurrentState() === -1) {
            const players = this.status.players;

            if (players.length >= this.status.player_number) {
                return false;
            }

            if (this.getMyPlayerIndex() >= 0) {
                this.joined = color != null;
                return true;
            }

            this.info = { name: this.name };
            players.push(this.info);
        }
    }

    leave() {
        const index = this.getMyPlayerIndex();
        if (index >= 0) {
            this.status.players.splice(index, 1);
        }
    }

    getMyPlayerIndex() {
        if (!this.info.color == null) {
            return -1;
        }

        for (let i = 0; i < players.length; i++) {
            const element = players[i];
            if (element.name === this.name) {
                return i;
            }
        }

        return -1;
    }

    generateRandomData(status) {
        status.created_timestamp = Date.now();
        status.first_player_index = getRandomInt(status.player_number);
        status.huangyanyan_failed_round = getRandomInt(3);
        status.kidokana_failed_round = getRandomInt(3);
        const zodiac_array = [];
        for (let i = 0; i < 12; i++) {
            zodiac_array.push({ id: i });
        }
        for (let i = zodiac_array.length - 1; i > 0; i--) {
            const j = getRandomInt(i + 1);
            [zodiac_array[i], zodiac_array[j]] = [zodiac_array[j], zodiac_array[i]];
            zodiac_array[i].real = i % 2;
        }
        for (let i = 0; i < 3; i++) {
            status.zodiacs_per_round.push(zodiac_array.splice(0, 4));
            status.zodiacs_per_round[i].sort((x, y) => x.id - y.id);
        }

        const json = JSON.stringify(status);
        status.hash = window.btoa(json);
    }

    getCurrentState() {
        switch (this.status.round) {
            case 0:
                return -1;
            case 4:
                return 1;
            default:
                return 0;
        }
    }

    chooseColorAndCharacter(color, character) {
        const myIndex = this.getMyPlayerIndex();

        if (this.info.color == null) {
            throw getError(errorCode.ALREADY_JOINED, `Already joined with color: ${this.info.color}, character: ${this.info.character}`);
        }

        this.checkDuplicated(color, character);

        this.color = color;
        this.character = character;

        this.info.color = color;
        this.info.character = character;

        this.checkChooseCharacterCompleted();
    }

    checkChooseCharacterCompleted() {
        const players = this.status.players;
        if (players.length == this.status.player_number) {
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                if (player.color == null) {
                    return;
                }
            }
            launch();
        }
    }

    checkDuplicated(color, character) {
        const players = this.status.players;
        let colorDuplicated = false;
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            if (player.color == null) {
                continue;
            }
            if (player.character === character) {
                throw getError(errorCode.DUPLICATED_CHARACTER);
            }
            if (player.color === color) {
                colorDuplicated = true;
            }
        }
        if (colorDuplicated) {
            throw getError(errorCode.DUPLICATED_COLOR);
        }
    }

    abort() {
        this.status.ended = true;
    }

    launch() {
        const status = this.status;

        if (status.round != -1) {
            return;
        }

        status.round = 0;
        status.current_player_index = first_player_index;
    }

    nextRound() {
        const status = this.status;
        if (status.round < 0 || status.round > 2) {
            return;
        }

        status.round++;

        status.result_inverted = false;
        status.hided_index = -1;
        status.not_activated_player_indexes = [];
        for (let i = 0; i < status.players.length; i++) {
            if (i != status.current_player_index) {
                status.not_activated_player_indexes.push(i);
            }
        }
    }

    getCurrentRoundInfo() {

    }

    appraisalZodiac(zodiac_indexes) {

    }

    checkPlayerFaction(player_index) {

    }

    poisonPlayer(player_index) {

    }

    hideZodiac(zodiac_index) {

    }

    invertZodiacReality() {

    }

    isPoisoned() {

    }

    chooseNextPlayer(player_index) {

    }

    enterVotes(votes) {

    }

    pointOutPlayer(playerIndex) {

    }

    calculateFinalScore() {

    }
};