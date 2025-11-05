// js/home_script.js (수정된 최종본)

document.addEventListener('DOMContentLoaded', () => {

    // ========== 1. [NEW] Web Audio API 설정 (index.html에서 이동) ==========
    let audioCtx;
    let clickBuffer1 = null; // 버튼 클릭용 사운드 버퍼

    /**
     * 사운드 파일을 로드하여 오디오 버퍼로 변환하는 함수
     * @param {string} url - 오디오 파일 경로 (js 폴더 기준)
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
     * 메모리에 로드된 오디오 버퍼를 즉시 재생하는 함수
     */
    function playSound(buffer) {
        if (!audioCtx || !buffer) return;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
    }
    
    /**
     * 오디오 시스템을 처음 활성화하는 함수
     */
    async function initAudio() {
        if (audioCtx) return true; // 이미 초기화됨
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            // home_script.js (js/ 폴더) 기준이므로 '../sounds/' 경로 사용
            clickBuffer1 = await loadSound('../sounds/click1.wav'); 
            console.log('Audio system initialized from home_script.js');
            return true;
        } catch (e) {
            console.error('Failed to initialize AudioContext:', e);
            return false;
        }
    }

    // ========== 2. [NEW] 페이지 이동 버튼 (EASY, HARD) 처리 ==========
    const navLinks = document.querySelectorAll('.mode-buttons a');

    navLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            // 1. 기본 이동 막기
            event.preventDefault();
            
            // 2. 오디오 시스템 활성화 (첫 클릭 시)
            await initAudio(); 
            
            // 3. 클릭 소리 재생
            playSound(clickBuffer1); 

            // 4. 로딩 표시 (버튼 텍스트 변경)
            const button = link.querySelector('button');
            button.textContent = 'Loading...';
            button.disabled = true; // 중복 클릭 방지

            // 5. [!!! 수정됨 !!!]
            // 소리가 재생될 시간(0.2초)을 확보한 뒤,
            // 사운드 캐시 및 페이지 이동을 실행합니다.
            setTimeout(async () => {
                try {
                    console.log('Pre-caching game sounds...');
                    await Promise.all([
                        loadSound('../sounds/click2.wav'),
                        loadSound('../sounds/correct.wav'),
                        loadSound('../sounds/incorrect.wav'),
                        loadSound('../sounds/gameover.wav'),
                        loadSound('../sounds/highscore.mp3')
                    ]);
                    console.log('All game sounds pre-cached.');
                } catch (e) {
                    console.error('Failed to pre-cache sounds:', e);
                }

                // 6. 모든 로딩이 끝나면 실제 페이지로 이동
                window.location.href = link.href;
            }, 200); // 0.2초 딜레이
        });
    });

    // ========== 3. [MERGED] HELP 버튼 및 모달 로직 (기존 코드와 합침) ==========
    const showButton = document.getElementById('show-instructions-btn');
    const closeButton = document.getElementById('close-instructions-btn');
    const modal = document.getElementById('instructions-modal');

    // 'HELP' 버튼: 소리 + 팝업 열기
    if (showButton) {
        showButton.addEventListener('click', async () => {
            // [NEW] 오디오 로직 추가
            await initAudio();
            playSound(clickBuffer1);
            
            // [EXISTING] 팝업 열기 로직
            modal.classList.add('show');
        });
    }

    // '닫기(X)' 버튼: 소리 + 팝업 닫기
    if (closeButton) {
        closeButton.addEventListener('click', async () => {
            // [NEW] 오디오 로직 추가
            await initAudio();
            playSound(clickBuffer1);

            // [EXISTING] 팝업 닫기 로직
            modal.classList.remove('show');
        });
    }
    
    // 팝업 배경 클릭: 소리 + 팝업 닫기
    if (modal) {
        modal.addEventListener('click', async (event) => {
            if (event.target === modal) {
                // [NEW] 오디오 로직 추가
                await initAudio();
                playSound(clickBuffer1);
                
                // [EXISTING] 팝업 닫기 로직
                modal.classList.remove('show');
            }
        });
    }
});