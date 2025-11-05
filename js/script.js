window.addEventListener("popstate", function(event) {
    alert("뒤로가기 버튼이 클릭되었습니다!");
});

document.addEventListener('DOMContentLoaded', () => {
    // 1. 게임 페이지 진입 시 히스토리 스택에 현재 상태 추가
    history.pushState(null, '', location.href); 

    // 2. 'popstate' (뒤로가기) 이벤트 감지
    window.addEventListener('popstate', (event) => {
        
        // 3. [수정됨] 사용자에게 확인 팝업을 띄웁니다.
        if (confirm("게임을 종료하고 메인 화면으로 돌아가시겠습니까?")) {
            // "확인"을 누른 경우:
            // 창을 닫는 대신, 메인 화면(index.html)으로 이동시킵니다.
            window.location.href = 'index.html';
        } else {
            // "취소"를 누른 경우:
            // 히스토리 스택을 다시 추가해서 현 페이지에 머무르게 합니다.
            history.pushState(null, '', location.href);
        }
    });
    const numberElements = document.querySelectorAll('.number'); // 숫자 요소들
    const operatorPlaceholders = document.querySelectorAll('.operator-placeholder'); // 연산자 자리
    const operatorButtons = document.querySelectorAll('.operators .op'); // 연산자 버튼들
    const clearButton = document.querySelector('.btn-clear'); // 초기화 버튼
    const submitButton = document.querySelector('.btn-submit'); // 제출 버튼
    const hintButton = document.querySelector('.btn-hint'); // 힌트 버튼
    const display = document.querySelector('.calculator-container'); // 식 디스플레이
    const resultDisplay = document.querySelector('.result'); // 결과 디스플레이
    const timeBar = document.querySelector('.timer-bar'); // 타이머 바
    const roundDisplay = document.querySelector('.round_num'); // 라운드 디스플레이
    const HighDisplay = document.querySelector('.high_num'); // 하이 스코어 디스플레이
    const timeDisplay = document.querySelector('.time');
    const expression = document.querySelector('.expression');
    const modeDisplay = document.querySelector('.mode');
    const gameoverMode = document.querySelector('.mode-item');
    const gameoverHigh = document.querySelector('.score-item');



    // ========== [수정됨] Web Audio API 설정 시작 ==========

    let audioCtx; // 오디오 컨텍스트 (사운드카드)
    // 각 사운드 데이터를 저장할 버퍼 변수들
    let clickBuffer1 = null;
    let clickBuffer2 = null;
    let correctBuffer = null;
    let incorrectBuffer = null;
    let gameoverBuffer = null;
    let highscoreBuffer = null;
    let finalBuffer = null;

    /**
     * [NEW] 사운드 파일을 비동기로 로드하여 오디오 버퍼로 변환하는 함수
     * @param {string} url - 오디오 파일 경로
     * @returns {AudioBuffer | null} - 디코딩된 오디오 버퍼
     */
    async function loadSound(url) {
        if (!audioCtx) return null;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (e) {
            console.error('Error loading audio file:', url, e);
            return null;
        }
    }

    /**
     * [NEW] 메모리에 로드된 오디오 버퍼를 즉시 재생하는 함수
     * @param {AudioBuffer} buffer - 재생할 오디오 버퍼
     */
    function playSound(buffer) {
        if (!audioCtx || !buffer) return; // 오디오 시스템이 준비되지 않았으면 재생 안 함

        const source = audioCtx.createBufferSource(); // 새 오디오 소스 생성
        source.buffer = buffer; // 소스에 버퍼(데이터) 연결
        source.connect(audioCtx.destination); // 소스를 스피커에 연결
        source.start(0); // 즉시 재생
    }

    // ========== [수정됨] Web Audio API 설정 끝 ==========

    let level = 1; // 현재 레벨 
    
    let currentRound = 0; // 현재 라운드 
    let currentHighScore;

    let hintUsed = false; // 힌트 사용 여부
    let hintOperators = []; // 힌트로 제공된 연산자들
    let hintCount = 0;

    let operatorsSelectedCount = 0; // 선택된 연산자 수

    let timerId; // requestAnimationFrame의 ID를 저장할 변수
    let timerStartTime; // 타이머 시작 시간을 저장할 변수

    let submitLock = false; // 등호 버튼 연속 클릭 방지
    

    // 현재 URL의 파라미터(꼬리표)를 읽어옵니다.
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode'); // 'mode' 값을 가져옵니다. (결과: "easy", "hard", 또는 null)

    let HardMode;
    let localStorageID;
    let TOTAL_GAME_TIME;
    let placeholderColor = "#cfcfcfff";
    if (mode === 'hard') {
        HardMode = true;
        modeDisplay.textContent = "HARD";
        modeDisplay.style.color = "#ff8d8dff";
        gameoverMode.style.backgroundColor = "#ff8d8dff";
        gameoverMode.style.border = "2px solid #d27c7cff";
        localStorageID = 'highScore_HARD';
        TOTAL_GAME_TIME = 120000; // 2분
        console.log("Hard Mode Start");
    } else {
        HardMode = false; 
        modeDisplay.textContent = "EASY";
        modeDisplay.style.color = "#69e58aff";
        gameoverMode.style.backgroundColor = "#69e58aff";
        gameoverMode.style.border = "2px solid #50be6dff";
        localStorageID = 'highScore_EASY';
        TOTAL_GAME_TIME = 60000; // 1분
        console.log("Easy Mode Start");
    }

    // 연산자 버튼 클릭 이벤트
    operatorButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound(clickBuffer2);
            // 현재 화면에 보이는 연산자 칸들만 가져옵니다.
            const visiblePlaceholders = document.querySelectorAll('.operator-placeholder:not(.hidden)');
            
            // 아직 채워지지 않은 첫 번째 빈 칸을 찾습니다.
            // 힌트로 채워진 칸은 건너뛰어야 합니다.
            const nextEmptyPlaceholder = Array.from(visiblePlaceholders).find(p => p.textContent === '');
            
            if (nextEmptyPlaceholder) {
                nextEmptyPlaceholder.textContent = button.dataset.op;
                nextEmptyPlaceholder.style.backgroundColor = 'rgba(255, 255, 255, 0)';
                operatorsSelectedCount++;
            }
        });
    });

    clearButton.addEventListener('click', () => {
        playSound(clickBuffer2);
        if (operatorsSelectedCount > 0) clearUserInputs();
    });

    submitButton.addEventListener('click', () => {
        playSound(clickBuffer2);
        if (submitLock) return;
        if (operatorsSelectedCount === level + 1) { // 모든 연산자가 채워졌을 때만 계산 + Lock
            submitLock = true;
            const result = calculateExpression(); // 표현식 계산
            resultDisplay.textContent = result !== null ? parseFloat(result.toFixed(2)) : 'Err'; // 결과 표시, null이면 'Err' 표시
            if (result === 10) {
                handleSuccess();
            } else {
                handleFailure();
            }
        }

    });

    hintButton.addEventListener('click', () => {
        playSound(clickBuffer2);
        // 힌트를 이미 사용했거나, 힌트를 2개 이상 사용했거나, 정답 연산자 정보가 없으면 함수 종료, .
        if (hintUsed || hintOperators.length === 0) {
            return;
        }

        if (hintCount >= 2) {
            return;
        }

        // 힌트 사용 상태로 변경 (한 라운드에 한 번만)
        hintUsed = true;
        
        // 1. 어느 위치의 힌트를 보여줄지 랜덤으로 결정합니다.
        const hintIndex = Math.floor(Math.random() * hintOperators.length);
        
        // 2. 해당 위치의 정답 연산자를 가져옵니다.
        const hintValue = hintOperators[hintIndex];

        // 3. 화면의 해당 연산자 자리에 힌트를 자동으로 입력합니다.
        operatorPlaceholders[hintIndex].textContent = hintValue;
        operatorPlaceholders[hintIndex].style.backgroundColor = 'rgba(0, 0, 0, 0)'; // 배경색 투명하게
        
        // 4. 해당 자리는 이미 채워진 것으로 처리합니다.
        // 이를 위해 placeholder에 특별한 클래스를 추가하여 "힌트로 채워짐"을 표시합니다.
        operatorPlaceholders[hintIndex].classList.add('hint-filled');

        // 선택된 연산자 수를 1 증가시킵니다.
        operatorsSelectedCount++;
        
    });
    // 표현식을 배열로 변환 후 계산
    function calculateExpression() {
        const numbers = Array.from(numberElements).map(el => parseInt(el.textContent)); // 숫자 표현을 정수로 변환 후 배열로 저장
        const operators = Array.from(operatorPlaceholders).map(el => el.textContent); // 연산자 배열을 저장

        // 복사본
        let nums = [...numbers]; 
        let ops = [...operators];

        return calculation(nums, ops);
        
    }
    // 실제 계산 로직 함수
    function calculation(nums, ops) {

        let i = 0;
        while (i < ops.length) {
            if (ops[i] === 'x' || ops[i] === '÷') { // 곱셈과 나눗셈을 먼저 처리
                
                if (ops[i] === '÷' && nums[i + 1] === 0) { 
                    return null; // 0으로 나누기 방지
                }
                
                const res = (ops[i] === 'x') ? nums[i] * nums[i + 1] : nums[i] / nums[i + 1]; // 연산 수행
                nums.splice(i, 2, res); // splice(시작 인덱스, 삭제할 요소 수, 추가할 요소) ex: [1,2,3], [+,*] -> [1,6]
                ops.splice(i, 1); // 연산자 배열에서 해당 연산자 제거
                i--; // 다시 검사
            } else {
                i++; // 덧셈과 뺄셈은 나중에 처리
            }
        }
        let finalResult = nums[0]; // 첫 번째 숫자부터 시작
        for (let j = 0; j < ops.length; j++) {
            if (ops[j] === '+') {
                finalResult += nums[j + 1];
            } else if (ops[j] === '-') {
                finalResult -= nums[j + 1];
            }
        }
        console.log('Calculate Result: ', finalResult);
        
        return finalResult;
    }

    function checkIfSolvable(nums) {
        // 가능한 모든 연산자 조합을 시도
        ops = generateOperationSet(nums.length - 1); // 연산자 개수는 숫자 개수 - 1
        for (let opSet of ops) {
            if (calculation([...nums], [...opSet]) === 10) {
                console.log('operators: ', ...opSet);
                hintOperators = [...opSet]; // 힌트로 제공할 연산자 저장
                return true; // 10을 만들 수 있는 조합이 있으면 true 반환
            }
        }
        console.log('No valid operator set found');
        return false;
    }

    function generateSolvableCombinations(level) { // 10을 만들 수 있는 조합 생성

        const num_n = level + 2; // 숫자 개수
        let nums = new Array(num_n).fill(0); 

        do {
            for (let i = 0; i < num_n; i++) {
                nums[i] = Math.floor(Math.random() * 10); // 0~9 사이의 랜덤 숫자 생성
            }
            console.log('nums: ', ...nums);

            } while(!checkIfSolvable(nums)); // 10을 만들 수 있는 조합이 나올 때까지 반복
        return nums;
    }

    function generateOperationSet(op_n) {
        const operators = ['+', '-', 'x', '÷'];

        const allCombinations = []; // 모든 조합을 저장할 배열
        let currentOperator = []; // 현재 조합을 저장할 배열

        // 재귀함수를 사용해 op_n 길이의 모든 조합 생성
        function generate(currentOperator){
            if(currentOperator.length === op_n){
                allCombinations.push([...currentOperator]);
                return;
            }
            for(let op of operators){
                currentOperator.push(op);
                generate(currentOperator);
                currentOperator.pop();
            }
        }
        generate(currentOperator);
        return allCombinations;
    }

    // === 화면 표시를 업데이트하는 함수 (신규) ===
    function updateDisplayLayout(num_n) {
        // 일단 모든 요소를 숨깁니다.
        numberElements.forEach(el => el.classList.add('hidden'));
        operatorPlaceholders.forEach(el => el.classList.add('hidden'));

        // 필요한 만큼의 요소만 다시 보여줍니다.
        for (let i = 0; i < num_n; i++) {
            numberElements[i].classList.remove('hidden');
            if (i < num_n - 1) { // 연산자 자리는 숫자보다 1개 적습니다.
                operatorPlaceholders[i].classList.remove('hidden');
            }
        }
    }

    function setFontSize(level) {
        let size;
        if (level === 3) {
            size = "1.6rem";
            expression.style.justifyContent = 'space-evenly';
            expression.style.gap = "none";
        } else {
            size = "2rem";
            expression.style.justifyContent = "center";
            expression.style.gap = "15px;"
        }

        // numberElements 리스트의 *각각의* 요소(el)에 스타일 적용
        numberElements.forEach(el => {
            el.style.fontSize = size;
        });

        // operatorPlaceholders 리스트의 *각각의* 요소(el)에 스타일 적용
        operatorPlaceholders.forEach(el => {
            el.style.height = size;
            el.style.fontSize = size;
        });
    }
    // 성공 처리 함수(초록 이펙트)
    function handleSuccess() {
        playSound(correctBuffer);
        display.classList.add('correct-flash');
        
        setTimeout(() => {
            display.classList.remove('correct-flash');
            if(HardMode && (currentRound+1) % 4 === 0) { // 3라운드마다 level 2
                if((currentRound+1) % 8 === 0) level = 3; // hard mode. 8번째 라운드
                else level = 2;
            }
            else if(!HardMode && (currentRound+1) % 5 === 0) level = 2 // easy mode. 4번의 level 1 이후 level 2 1문제
            else level = 1;
            setFontSize(level);
            resetForNewProblem();
            generateNewProblem(level);
            submitLock = false;
        }, 500);
    }
    // 실패 처리 함수(빨강 이펙트)
    function handleFailure() {
        playSound(incorrectBuffer);
        display.classList.add('incorrect-flash');
        
        setTimeout(() => {
            display.classList.remove('incorrect-flash');
            clearUserInputs();
            submitLock = false;
        }, 500);
    }
    // 연산자 자리 초기화
    function clearUserInputs() {
    // 힌트로 채워진 칸이 아니라면 초기화
    operatorPlaceholders.forEach(placeholder => {
        if (!placeholder.classList.contains('hint-filled')) {
            placeholder.textContent = '';
            placeholder.style.backgroundColor = placeholderColor;
        }
        });

        resultDisplay.textContent = '?';
        // 선택된 연산자 수를 힌트 개수로 되돌림
        operatorsSelectedCount = document.querySelectorAll('.hint-filled').length;
    }

    // === 2. 다음 문제를 위해 모든 것을 초기화하는 함수 (정답 맞혔을 때용) ===
    function resetForNewProblem() {
        // 모든 연산자 자리를 조건 없이 초기화
        operatorPlaceholders.forEach(placeholder => {
            placeholder.textContent = '';
            placeholder.style.backgroundColor = placeholderColor;
            placeholder.classList.remove('hint-filled'); // 힌트 표시도 제거
        });

        resultDisplay.textContent = '?';
        operatorsSelectedCount = 0;
        if(hintUsed) {
            hintUsed = false;
            if(++hintCount >= 2) {
                hintButton.style.borderTop = "#9e9e9eff"
                hintButton.style.backgroundColor = "#838383";
                hintButton.style.borderBottomColor = "#5c5c5cff";
            }
        }
    }

    // 새 문제 생성 함수
    function generateNewProblem(level) {
        currentRound++;
        roundDisplay.textContent = currentRound; // 라운드 표시 업데이트
        hintUsed = false; // 새 문제가 시작되면 힌트 사용 여부 초기화
        updateDisplayLayout(level + 2); // 화면 레이아웃 업데이트
        const visibleNumberElements = document.querySelectorAll('.number:not(.hidden)');
        const newNumbers = generateSolvableCombinations(level); // 10을 만들 수 있는 조합 생성
        console.log(newNumbers,"Round:", currentRound);

        // 화면의 숫자를 업데이트
        visibleNumberElements.forEach((element, index) => {
            element.textContent = newNumbers[index];
        });
    }
    // 타이머를 시작하는 함수
    function startTimer(duration) {
        stopTimer(); // 기존에 실행 중인 타이머가 있다면 중지
        timerStartTime = performance.now(); // 현재 시간을 정확하게 기록
        
        // timerLoop를 처음 한 번 호출하여 루프를 시작
        timerId = requestAnimationFrame((timestamp) => timerLoop(timestamp, duration));
    }

    // 타이머를 중지하는 함수
    function stopTimer() {
        cancelAnimationFrame(timerId);
    }

    // 매 프레임마다 실행될 타이머 루프 함수
    function timerLoop(timestamp, duration) {
        const elapsedTime = timestamp - timerStartTime; // 시작 후 경과 시간
        const timeLeft = duration - elapsedTime; // 남은 시간
        timeDisplay.textContent = Math.round(timeLeft/1000);

        if (timeLeft <= 0) {
            // 시간이 다 되면 타이머를 멈추고 게임 오버 처리
            timeBar.style.width = '0%';
            stopTimer();
            handleGameOver(); // 게임 오버 함수 호출
            return;
        }
        
        // 남은 시간에 따라 타이머 바의 너비를 업데이트
        const progress = timeLeft / duration;
        timeBar.style.width = progress * 100 + '%';
        
        // 다음 프레임에 timerLoop를 다시 호출하도록 예약
        timerId = requestAnimationFrame((newTimestamp) => timerLoop(newTimestamp, duration));
    }
    function showGameOver() {
        playSound(finalBuffer);
        // (1) 블러 처리할 게임 화면을 찾음
        const gameContent = document.getElementById('game-content-wrapper');
        if (gameContent) {
            gameContent.classList.add('blurred'); // 'blurred' 클래스 추가
        }

        // (2) 숨겨진 팝업창을 찾음
        const gameOverModal = document.getElementById('game-over-modal');

        const modeEl = document.getElementById('game-mode');
        const currentScoreEl = document.getElementById('current-score');
        const highScoreEl = document.getElementById('high-score');

        if (modeEl) modeEl.textContent = mode;
        if (currentScoreEl) currentScoreEl.textContent = currentRound;
        if (highScoreEl) highScoreEl.textContent = currentHighScore;

        if (gameOverModal) {
            gameOverModal.classList.add('show'); // 'show' 클래스 추가
        }
    }

    // 2. 'RETRY' 버튼에 기능 연결
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
        retryButton.addEventListener('click', () => {
            playSound(clickBuffer1);

            setTimeout(() => {
                location.reload(); 
            }, 200); // 0.2초 딜레이 (소리가 재생될 충분한 시간)
        });
    }
    
    function handleGameOver() {
        saveHighScore(currentRound);
        showGameOver()
    }
    function startGame() {
        loadHighScore();
        level = 1;
        currentRound = 0;
        setFontSize(level);
        resetForNewProblem(); // 모든 상태 초기화
        generateNewProblem(level); // 첫 번째 문제 생성
        startTimer(TOTAL_GAME_TIME); // 2분 타이머 시작 
    }
    function saveHighScore() {
        console.log(`이번 점수: ${currentRound}, 현재 최고 점수: ${currentHighScore}`);
        if (currentRound > currentHighScore) {
            // 높다면, 새 점수를 localStorage에 덮어씁니다.
            finalBuffer = highscoreBuffer;
            currentHighScore = currentRound
            localStorage.setItem(localStorageID, currentRound);
            console.log(`기록 경신. 새 최고 점수: ${currentRound}`);
            gameoverHigh.style.backgroundColor = "#e58effff"
            gameoverHigh.style.border = "2px solid #ba6cd1ff"
        } else {
            finalBuffer = gameoverBuffer;
            console.log('최고 점수 경신 실패.');
        }
    }
    function loadHighScore() {
        currentHighScore = parseInt(localStorage.getItem(localStorageID)) || 0;
        HighDisplay.textContent = currentHighScore;
    }
    
// [새로 추가할 코드]
    // ========== [수정됨] 새로운 게임 시작 로직 ==========

    /**
     * 오디오를 초기화하고 모든 사운드를 로드한 후 게임을 시작하는 함수
     * (index.html에서 캐시된 파일들을 가져와 매우 빠릅니다)
     */
    async function initializeAudioAndStartGame() {
        try {
            // 1. 오디오 컨텍스트 생성 (권한은 index.html에서 이미 받음)
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // 2. 모든 사운드 로드 (Promise.all로 병렬 로딩)
            // (index.html에서 캐시해뒀기 때문에 실제로는 로딩이 매우 빠릅니다)
            await Promise.all([
                loadSound('../sounds/click1.wav').then(buffer => clickBuffer1 = buffer),
                loadSound('../sounds/click2.wav').then(buffer => clickBuffer2 = buffer),
                loadSound('../sounds/correct.wav').then(buffer => correctBuffer = buffer),
                loadSound('../sounds/incorrect.wav').then(buffer => incorrectBuffer = buffer),
                loadSound('../sounds/gameover.wav').then(buffer => gameoverBuffer = buffer),
                loadSound('../sounds/highscore.mp3').then(buffer => highscoreBuffer = buffer)
            ]);
            console.log('Game sounds loaded.');

        } catch (e) {
            console.error('Failed to initialize audio:', e);
            alert("오디오 로딩에 실패했습니다. 소리 없이 게임을 시작합니다.");
        }
        
        // 3. [중요] 사운드 로드가 완료된 후 게임 시작
        startGame(); 
    }

    // [수정됨] 페이지 로드 시 즉시 오디오 로드 및 게임 시작 함수를 호출
    initializeAudioAndStartGame();

}); 