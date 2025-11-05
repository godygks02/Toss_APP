document.addEventListener('DOMContentLoaded', () => {

    const container = document.getElementById('background-animation-container');
    
    // 컨테이너가 없는 페이지(예: 로딩)에서는 실행하지 않음
    if (!container) {
        return; 
    }

    //    'true'일 때만 shouldAnimate가 true가 됩니다.
    const shouldAnimate = container.dataset.animate === 'true';
    
    // 1. 설정값 정의
    const OPERATORS = ['+', '-', 'x', '÷'];
    const COLORS = ['#00DACB', '#FF8B77', '#6AB7E2', '#F7D666']; 
    
    // 화면 크기를 동적으로 가져옴
    const SCREEN_HEIGHT = container.offsetHeight;
    const SCREEN_WIDTH = container.offsetWidth;
    
    // '눈' 생성 빈도 (200ms = 1초에 5개)
    const SPAWN_INTERVAL_MS = 200;
    
    // '눈'이 꽉 차 보이도록 처음에 생성할 개수
    const INITIAL_ELEMENT_COUNT = 40; 

    // 2. 헬퍼 함수
    function getRandom(min, max) {
        return Math.random() * (max - min) + min;
    }
    function getRandomInt(min, max) {
        return Math.floor(getRandom(min, max));
    }
    
    // 3. '눈송이' 생성 함수
    // (startY: 초기화 시 사용할 랜덤 Y위치)
    function createSnowflake(startY) {
        
        const el = document.createElement('div');
        // 1. 우리가 CSS에 새로 추가한 클래스 적용
        el.classList.add('snow-operator');

        // 2. 랜덤 기호 및 색상
        el.textContent = OPERATORS[getRandomInt(0, OPERATORS.length)];
        el.style.color = COLORS[getRandomInt(0, COLORS.length)];

        // 3. 랜덤 가로 위치
        el.style.left = `${getRandom(0, SCREEN_WIDTH)}px`;

        // 4. 시작 세로 위치
        // (초기화 시: 랜덤 Y, 평상시: 화면 밖 -50px)
        el.style.top = `${startY !== undefined ? startY : -50}px`;

        // 5. '눈' 효과를 위한 랜덤 속성들
        // (크기, 투명도, 속도를 모두 다르게)
        el.style.fontSize = `${getRandom(20, 50)}px`;
        el.style.opacity = getRandom(0.1, 0.4);
        el.dataset.speed = getRandom(0.5, 2.0); // 속도 (핵심)

        container.appendChild(el);
    }

    // 4. 애니메이션 실행 함수 (매 프레임)
    function animate() {
        // 모든 '눈송이'를 선택
        const allFlakes = document.querySelectorAll('.snow-operator');
        
        allFlakes.forEach(el => {
            // 각자 다른 속도(dataset.speed)를 가져와 적용
            const speed = parseFloat(el.dataset.speed) || 1;
            const currentTop = parseFloat(el.style.top);
            
            const newTop = currentTop + speed;
            el.style.top = `${newTop}px`;

            // 화면 밖으로 나가면 제거
            if (newTop > SCREEN_HEIGHT) {
                el.remove();
            }
        });

        // 다음 프레임에 animate 함수 다시 실행
        requestAnimationFrame(animate);
    }

    // 5. 초기 배경을 채우는 함수
    function initializeBackground() {
        for (let i = 0; i < INITIAL_ELEMENT_COUNT; i++) {
            // 화면 안(0 ~ SCREEN_HEIGHT)에 랜덤 Y위치로 생성
            const randomY = getRandom(0, SCREEN_HEIGHT);
            createSnowflake(randomY); 
        }
    }

    // 6. 애니메이션 시작
    
    // (1) 처음 화면을 '눈'으로 채우기
    initializeBackground(); 
    
    if (shouldAnimate) {
        // (2) 0.2초마다 새 '눈'을 상단에 추가하기
        setInterval(createSnowflake, SPAWN_INTERVAL_MS);
    
        // (3) 애니메이션 루프 시작
        animate();
    }
    
});