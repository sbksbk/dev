const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let isPlaying = false;

// 1) 카메라 연결
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error('카메라 연결 실패', err));

// 2) MediaPipe Hands 설정
const hands = new Hands({ locateFile: f =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});
hands.onResults(onHandsResults);

// 카메라 프레임마다 손 인식 실행
const camera = new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
  width: 640,
  height: 480
});
camera.start();

// 3) 제스처 분류 함수
function classifyRPS(landmarks) {
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    if (landmarks[tips[i]].y < landmarks[pips[i]].y) extended++;
  }
  if (extended === 0) return 'rock';
  if (extended === 2) return 'scissors';
  if (extended === 4) return 'paper';
  return null;
}

// 4) 게임 로직
function decide(user, comp) {
  if (user === comp) return 'draw';
  if ((user === 'rock' && comp === 'scissors') ||
      (user === 'scissors' && comp === 'paper') ||
      (user === 'paper' && comp === 'rock')) return 'win';
  return 'lose';
}

function playRound(userChoice) {
  const opts = ['rock','paper','scissors'];
  const compChoice = opts[Math.floor(Math.random() * 3)];
  const res = decide(userChoice, compChoice);
  showResult(userChoice, compChoice, res);
}

// 5) 결과 표시
function showResult(user, comp, res) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '30px sans-serif';
  ctx.fillText(`You: ${user}`, 10, 40);
  ctx.fillText(`Bot: ${comp}`, 10, 80);
  const msg = res === 'win' ? 'You Win! 🎉' : res === 'lose' ? 'You Lose 😢' : 'Draw 🤝';
  ctx.fillText(msg, 10, 120);

  const utter = new SpeechSynthesisUtterance(
    res === 'win' ? '축하합니다! 당신이 이겼어요.' :
    res === 'lose' ? '아쉽네요, 당신이 졌어요.' : '비겼습니다!'
  );
  speechSynthesis.speak(utter);
}

// 6) 프레임 처리 및 판별
function onHandsResults(results) {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  if (!results.multiHandLandmarks.length || isPlaying) return;
  const g = classifyRPS(results.multiHandLandmarks[0]);
  if (g) {
    isPlaying = true;
    playRound(g);
    setTimeout(() => isPlaying = false, 2000);
  }
}