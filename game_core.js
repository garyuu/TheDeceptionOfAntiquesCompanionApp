const initPlayerOperation = {
    appraisaled_zodiacs: [],
    checked_faction: -1,
    poison_target: -1,
    hide_zodiac_target: -1,
    use_invert: 0,
};

const getInitPlayerOperation = () => Object.assign({}, initPlayerOperation);

const initStatus = {
    mode: 0, // 0: Single Device, 1: Multiple Device(Local), 2: Multiple Device(Remote)
    player_number: 0,
    round: -1, // -1: Choose Character, 0-2: Normal Round, 3: Summary Round
    current_player_index: 0,
    current_player_operation: getInitPlayerOperation(),
    not_activated_player_indexes: [],
    poisoned_players_indexes: [],
    checked_factions: [],
    result_inverted: false,
    hided_index: -1,
    jiyunfu_poisoned: false,
    vote_results: [],
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

    OPERATION_INVALID: 3001,
    VOTE_LENGTH_NOT_MATCH: 3002,

    PLAYER_IS_ACTIVATED: 4001,

    POINT_OUT_NOT_COMPLETED: 5001,
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

const phaseEnum = {
    chooseCharacter: 1,
    appraisal: 2,
    chooseNextPlayer: 3,
    vote: 4,
    pointOut: 5,
}

const resultEnum = {
    real: 1,
    fake: 0,
    unknown: -1,
    poisoned: -2,
}

const hashMatchCharacters = 6;

class GameCore {
    name;
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

        if (this.getCurrentPhase() === -1) {
            const players = this.status.players;

            if (players.length >= this.status.player_number) {
                return false;
            }

            if (this.getMyPlayerIndex() >= 0) {
                this.joined = color != null;
                return true;
            }

            this.info = {
                name: this.name,
                color: null,
                character: -1,
                target: -1,
            };
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

    getCurrentPhase() {
        switch (this.status.round) {
            case -1:
                return phaseEnum.chooseCharacter;
            case 3:
                return phaseEnum.pointOut;
            default:
                if (this.status.current_player_operation != null)
                    return phaseEnum.appraisal;
                if (this.status.not_activated_player_indexes.length == 0)
                    return phaseEnum.vote;
                return phaseEnum.chooseNextPlayer;
        }
    }

    chooseColorAndCharacter(color, character) {
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
        const status = this.status;
        const roundInfo = {
            current_player: status.current_player,
            current_player_info: status.players[status.current_player],
            current_player_operation: status.current_player_operation,
            phase: this.getCurrentPhase(),
            poisoned: status.poisoned_players_indexes.indexOf(status.current_player) >= 0,
            can_appraisal_count: 1,
            can_check_faction: false,
            can_poison: false,
            can_invert: false,
            can_hide: false,
        };

        switch (roundInfo.current_player_info.character) {
            case characterEnum.xuyuan:
                roundInfo.can_appraisal_count = 2;
                break;
            case characterEnum.fangzeng:
                roundInfo.can_appraisal_count = 0;
                roundInfo.can_check_faction = 1;
                roundInfo.checked_factions = status.checked_factions;
                break;
            case characterEnum.laochaofeng:
                roundInfo.can_invert = true;
                break;
            case characterEnum.yaoburan:
                roundInfo.can_poison = true;
                break;
            case characterEnum.zhengguoqu:
                roundInfo.can_hide = true;
                break;
        }

        return roundInfo;
    }

    // -2: posioned, -1: unknown, 0: fake, 1: real
    appraisalZodiac(zodiac_indexes) {
        const status = this.status;
        if (status.current_player_operation == null || status.current_player_operation.appraisaled_zodiacs.length > 0)
            throw getError(errorCode.OPERATION_INVALID, "Cannot appraisal now.");

        const current_player_info = status.players[status.current_player];
        if (current_player_info.character === characterEnum.fangzeng)
            throw getError(errorCode.OPERATION_INVALID, "FangZeng cannot appraisal.");

        if (zodiac_indexes.length === 1 ||
            (zodiac_indexes.length === 2 && current_player_info.character === characterEnum.xuyuan))
            throw getError(errorCode.OPERATION_INVALID, "Should select exact can appraisal count.")

        const result = [];
        if (status.poisoned_players_indexes.indexOf(status.current_player) >= 0 ||
            (current_player_info.character === characterEnum.jiyunfu && status.jiyunfu_poisoned)) {
            for (let i = 0; i < zodiac_indexes.length; i++) {
                result.push([zodiac_indexes[i], resultEnum.poisoned]);
            }
        } else if ((current_player_info.character === characterEnum.huangyanyan && status.round === status.huangyanyan_failed_round) ||
            current_player_info.character === characterEnum.kidokana && status.round === status.kidokana_failed_round) {
            for (let i = 0; i < zodiac_indexes.length; i++) {
                result.push([zodiac_indexes[i], resultEnum.unknown]);
            }
        } else {
            const zodiac_array = status.zodiacs_per_round[status.round];
            for (let i = 0; i < zodiac_indexes.length; i++) {
                const index = zodiac_indexes[i];
                const real = zodiac_array[index].real;
                if (status.result_inverted && this.getFaction(current_player_info.character) === 0) {
                    real = 1 - real;
                }
                result.push([index, status.hided_index == index ? resultEnum.unknown : real]);
            }
        }
        status.current_player_operation.appraisaled_zodiacs = result;
        return result;
    }

    checkPlayerFaction(player_index) {
        const status = this.status;
        if (status.current_player_operation == null || status.current_player_operation.checked_faction >= 0)
            throw getError(errorCode.OPERATION_INVALID, "Cannot check faction now.");

        const current_player_info = status.players[status.current_player];
        if (current_player_info.character !== characterEnum.fangzeng)
            throw getError(errorCode.OPERATION_INVALID, "Only FangZeng can check player's faction.");

        status.current_player_operation.checked_faction = player_index;
        status.checked_factions.push([player_index, this.getFaction(status.players[player_index].character)])

        return status.checked_factions;
    }

    poisonPlayer(player_index) {
        const status = this.status;
        if (status.current_player_operation == null || status.current_player_operation.poison_target >= 0)
            throw getError(errorCode.OPERATION_INVALID, "Cannot poison now.");

        const current_player_info = status.players[status.current_player];
        if (current_player_info.character !== characterEnum.yaoburan)
            throw getError(errorCode.OPERATION_INVALID, "Only YaoBuRan can check player's faction.");

        status.current_player_operation.poison_target = player_index;
        status.poisoned_players_indexes.push(player_index);
        if (status.players[player_index].character == characterEnum.fangzeng) {
            for (let i = 0; i < status.players.length; i++) {
                if (status.players[i].character == characterEnum.xuyuan) {
                    status.poisoned_players_indexes.push(i);
                }
            }
        }
    }

    hideZodiac(zodiac_index) {
        const status = this.status;
        if (status.current_player_operation == null || status.current_player_operation.hide_zodiac_target >= 0)
            throw getError(errorCode.OPERATION_INVALID, "Cannot hide zodiac now.");

        const current_player_info = status.players[status.current_player];
        if (current_player_info.character !== characterEnum.zhengguoqu)
            throw getError(errorCode.OPERATION_INVALID, "Only ZhengGuoQu can check player's faction.");

        status.current_player_operation.hide_zodiac_target = zodiac_index;
        status.hided_index = zodiac_index;
    }

    invertZodiacReality() {
        const status = this.status;
        if (status.current_player_operation == null || status.current_player_operation.use_invert > 0)
            throw getError(errorCode.OPERATION_INVALID, "Cannot hide zodiac now.");

        const current_player_info = status.players[status.current_player];
        if (current_player_info.character !== characterEnum.laochaofeng)
            throw getError(errorCode.OPERATION_INVALID, "Only LaoChaoFeng can check player's faction.");

        status.current_player_operation.use_invert = 1;
        status.result_inverted = true;
    }

    getFaction(character) {
        switch (character) {
            case characterEnum.laochaofeng:
            case characterEnum.yaoburan:
            case characterEnum.zhengguoqu:
                return 1;
        }
        return 0;
    }

    chooseNextPlayer(player_index) {
        const status = this.status;
        const nextIndex = status.not_activated_player_indexes.indexOf(player_index);
        if (nextIndex < 0) {
            throw getError(errorCode.PLAYER_IS_ACTIVATED, "Cannot find this player in not-activated players.");
        }

        status.not_activated_player_indexes.splice(nextIndex, 1);
        status.current_player_index = player_index;
        status.current_player_operation = getInitPlayerOperation();
    }

    endTurn() {
        const status = this.status;
        status.current_player_operation = null;
        const poisoned_index = status.poisoned_players_indexes.indexOf(status.current_player_index);
        if (poisoned_index >= 0) {
            status.poisoned_players_indexes.splice(poisoned_index, 1);
        }
        return status.not_activated_player_indexes;
    }

    enterVotes(votes) {
        if (votes.length != 4) {
            throw getError(errorCode.VOTE_LENGTH_NOT_MATCH, "Vote length is not equal to 4.");
        }

        let first = -1, second = -1;

        for (let i = 0; i < votes.length; i++) {
            if (first < 0) {
                first = i;
            } else if (votes[i] > votes[first]) {
                second = first;
                first = i;
            } else if (second < 0) {
                second = i;
            } else if (votes[i] > votes[second]) {
                second = i;
            }
        }

        const roundZodiacs = this.status.zodiacs_per_round[this.status.round];
        this.status.vote_results.push([first, second]);

        return [
            { id: roundZodiacs[first].id, index: first, real: -1 },
            { id: roundZodiacs[second].id, index: second, real: roundZodiacs[second].real },
        ];
    }

    pointOutPlayer(player_index, target_index) {
        this.status.players[player_index].point_out_target = target_index;
    }

    checkAllPointOutCompleted() {
        for (let i = 0; i < this.status.players.length; i++) {
            if (this.status.players[i].target < 0)
                return false;
        }
        return true;
    }

    calculateFinalScore() {
        if (!this.checkAllPointOutCompleted())
            throw getError(errorCode.POINT_OUT_NOT_COMPLETED, "Should complete all point out first");

        const score = {
            zodiac_protected: 0,
            xuyuan_not_found: 2,
            fangzeng_not_found: 1,
            laochaofeng_found: 1,
            total: 0,
        };

        const status = this.status;
        for (let i = 0; i < status.vote_results.length; i++) {
            if (status.zodiacs_per_round[i][status.vote_results[i][0]].real)
                score.zodiac_protected++;
            if (status.zodiacs_per_round[i][status.vote_results[i][1]].real)
                score.zodiac_protected++;
        }

        let laochaofeng_hit = 0;
        let laochaofeng_miss = 0;
        let laochaofeng_index;
        for (let i = 0; i < status.players.length; i++) {
            if (status.players[i].character == characterEnum.laochaofeng)
                laochaofeng_index = i;
        }

        const players = status.players;
        for (let i = 0; i < status.players.length; i++) {
            switch (players[i].character) {
                case characterEnum.laochaofeng:
                    if (players[players[i].target].character == characterEnum.xuyuan)
                        score.xuyuan_not_found = 0;
                    break;
                
                case characterEnum.yaoburan:
                    if (players[players[i].target].character == characterEnum.fangzeng)
                        score.fangzeng_not_found = 0;
                    break;
                case characterEnum.zhengguoqu:
                    break;
            
                default:
                    if (players[players[i].target].character == characterEnum.laochaofeng)
                        laochaofeng_hit++;
                    else
                        laochaofeng_miss++;
                    break;
            }
        }
        if (laochaofeng_hit >= laochaofeng_miss)
            score.laochaofeng_found = 1;

        score.total = score.zodiac_protected +
            score.xuyuan_not_found +
            score.fangzeng_not_found +
            score.laochaofeng_found;
        
        return score;
    }
};