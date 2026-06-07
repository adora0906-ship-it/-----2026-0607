/* global ml5, p5, createCanvas, createCapture, VIDEO, width, height, image, push, pop, translate, scale, fill, noStroke, ellipse, dist, text, textSize, textAlign, LEFT, TOP, CENTER, rect, random, color, window, loadImage, lerp, millis, map, green, red, blue, stroke, strokeWeight, frameCount, rotate, beginShape, vertex, endShape, CLOSE, cos, sin, SpeechSynthesisUtterance, fullscreen */
/**
 * 韓文字母體感遊戲 - 修正版
 */

const GW = 640; // 遊戲邏輯寬度 (Game Width)
const GH = 480; // 遊戲邏輯高度 (Game Height)

let video;
let handpose;
let predictions = [];
let targetX = 0;
let targetY = 0;
let isFirstDetection = true; // 用於平滑處理初始位置
let isModelReady = false;
let bgImg;   // 統一的韓國背景圖
let gameState = "START"; // START, RULES, PLAYING, GAMEOVER
let gameTimer = 60; // 遊戲時長
let lastTimeCheck = 0;
let currentMode = ""; // CONSONANTS, VOWELS
let isPaused = false; // 暫停狀態
let activeQuestions = []; // 目前使用的題庫

// 遊戲變數
let balloons = []; // 氣球物件陣列
const MAX_BALLOONS = 5; // 同時出現的氣球數量
let history = []; // 儲存答題紀錄
let currentKorean = ""; 
let score = 0;

// 回饋訊息變數
let feedbackText = "";
let feedbackTimer = 0;
let feedbackColor;
let particles = []; // 特效粒子陣列
let lastHitIndex = -1; // 紀錄最後撞擊的氣球索引

// 子音題庫
const CONSONANTS = [
  { kr: "ㄱ", en: "g" },
  { kr: "ㄴ", en: "n" },
  { kr: "ㄷ", en: "d" },
  { kr: "ㄹ", en: "r" },
  { kr: "ㅁ", en: "m" },
  { kr: "ㅂ", en: "b" },
  { kr: "ㅅ", en: "s" },
  { kr: "ㅇ", en: "ng" },
  { kr: "ㅈ", en: "j" },
  { kr: "ㅎ", en: "h" },
  { kr: "ㅋ", en: "k" },
  { kr: "ㅌ", en: "t" },
  { kr: "ㅍ", en: "p" },
  { kr: "ㅊ", en: "ch" }
];

// 母音題庫
const VOWELS = [
  { kr: "ㅏ", en: "a" },
  { kr: "ㅓ", en: "eo" },
  { kr: "ㅗ", en: "o" },
  { kr: "ㅜ", en: "u" },
  { kr: "ㅡ", en: "eu" },
  { kr: "ㅣ", en: "i" },
  { kr: "ㅑ", en: "ya" },
  { kr: "ㅕ", en: "yeo" },
  { kr: "ㅛ", en: "yo" },
  { kr: "ㅠ", en: "yu" }
];

function preload() {
  // 載入統一的韓國特色背景圖 (景福宮)
  bgImg = loadImage('https://images.unsplash.com/photo-1517154421773-0529f29ea451?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80');
}

function setup() {
  createCanvas(GW, GH);
  
  // 1. 初始化視訊鏡頭
  video = createCapture(VIDEO);
  video.size(GW, GH);
  video.hide(); // 隱藏原本的 HTML video 標籤，我們要在畫布上自己畫

  // 2. 初始化 ml5.js 的 Handpose 偵測器
  handpose = ml5.handpose(video, modelReady);
  
  // 3. 設定監聽器
  handpose.on("predict", results => {
    predictions = results;
  });
}

function modelReady() {
  console.log("AI 影像辨識模型準備就緒！");
  isModelReady = true;
}

function draw() {
  background(0);
  
  if (gameState === "START") {
    drawStartScreen();
  } else if (gameState === "RULES") {
    drawRulesScreen();
  } else if (gameState === "PLAYING") {
    drawGame();
  } else if (gameState === "GAMEOVER") {
    drawGameOverScreen();
  }
}

function drawStartScreen() {
  // 繪製背景圖並充滿畫面
  image(bgImg, 0, 0, width, height);
  
  // 黑色半透明遮罩，讓文字更明顯
  fill(0, 0, 0, 100);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("韓文字母體感遊戲", width / 2, height / 2 - 80);
  
  textSize(24);
  text("請選擇學習模式", width / 2, height / 2 - 20);

  // 繪製選單按鈕
  drawMenuButton(width / 2 - 120, height / 2 + 50, 100, 50, "子音", color(70, 130, 180));
  drawMenuButton(width / 2 + 20, height / 2 + 50, 100, 50, "母音", color(180, 70, 70));
  
  if (!isModelReady) {
    fill(255, 255, 0);
    textSize(16);
    text("AI 模型載入中，請稍候...", width / 2, height - 30);
  }
}

function drawMenuButton(x, y, w, h, label, col) {
  fill(col);
  rect(x, y, w, h, 10);
  fill(255);
  textSize(20);
  text(label, x + w / 2, y + h / 2);
}

function drawRulesScreen() {
  push();
  // 使用瀏覽器原生的 Canvas filter 屬性實現高效模糊
  // 5px 為模糊程度，數值越大越模糊
  if (drawingContext) drawingContext.filter = 'blur(5px)';
  image(bgImg, 0, 0, width, height);
  if (drawingContext) drawingContext.filter = 'none'; // 繪製完背景後務必清除模糊
  pop();

  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(36);
  text("遊戲規則", GW / 2, 30); // 標題往上移

  textSize(18); // 稍微縮小字體以放入更多資訊
  textAlign(LEFT, TOP);
  text("1. 使用手勢控制：將食指指尖對準氣球以擊破它。", 80, 85);
  text("2. 目標：找出畫面上方韓文字母對應的正確發音。", 80, 115);
  text("3. 計分方式：", 80, 145);
  text("   - 答對：+10 分", 80, 170);
  text("   - 答錯：-5 分", 80, 195);
  text("4. 特殊道具：", 80, 225);

  // 道具跳動動畫邏輯
  let bounce = sin(frameCount * 0.1) * 8; // 計算跳動幅度
  textSize(26); // 讓圖示稍微大一點
  text("⏰", 100, 255 + bounce);
  text("💣", 100, 295 - bounce); // 使用減號讓它交錯跳動
  textSize(18);
  text(" (時鐘)：增加 5 秒剩餘時間", 135, 260);
  text(" (炸彈)：減少 3 秒剩餘時間", 135, 300);

  text("5. 限時挑戰：在 60 秒內盡可能獲得高分！", 80, 335);

  // 溫馨提示
  fill(255, 255, 0); // 使用黃色提醒
  textSize(16);
  // 輕微左右晃動特效：利用 sin 函數計算 X 軸位移
  let shake = sin(frameCount * 0.15) * 3;
  text("💡 溫馨提示：手勢辨識可能不夠靈敏，建議盡量將手掌打開以免辯識不到。", 80 + shake, 365);

  textAlign(CENTER, CENTER);
  // 「開始挑戰」按鈕呼吸燈效果：計算動態透明度
  let alphaPulse = map(sin(frameCount * 0.08), -1, 1, 150, 255);
  let pulseColor = color(50, 150, 50, alphaPulse);
  drawMenuButton(GW / 2 - 60, GH - 80, 120, 50, "開始挑戰", pulseColor);
}

function drawGame() {
  // 更新計時器 (只有在沒有顯示正確答案回饋 且 未暫停時才計時)
  if (feedbackTimer <= 0 && !isPaused) {
    if (millis() - lastTimeCheck >= 1000) {
      gameTimer--;
      lastTimeCheck = millis();
      if (gameTimer <= 0) {
        gameState = "GAMEOVER";
      }
    }
  } else {
    // 顯示回饋或暫停期間，不斷重置基準點，確保恢復後會重新計算完整的一秒
    lastTimeCheck = millis();
  }

  // 1. 繪製統一的背景
  image(bgImg, 0, 0, GW, GH);

  // 增加背景遮罩以降低亮度，讓背景圖不要太搶眼
  push();
  noStroke();
  fill(0, 0, 0, 120); // 最後一個參數 120 是透明度（範圍 0-255），數值越大背景越暗
  rect(0, 0, GW, GH);
  pop();

  // 2. 為了讓背景圖透出來，我們設定視訊畫面的透明度 (160/255)
  tint(255, 160); 

  // 將視訊畫面畫在 p5.js 畫布上
  // 使用 push/pop 與 translate/scale 進行水平翻轉（鏡像），玩家操作才直覺
  push();
  translate(GW, 0);
  scale(-1, 1);
  image(video, 0, 0, GW, GH);
  pop();

  noTint(); // 恢復不透明，確保後續的氣球與文字顏色正常

  // 只有在沒有顯示回饋且未暫停時，才移動氣球與偵測手勢
  if (feedbackTimer <= 0 && !isPaused) {
    moveAndDrawBalloon();
    updateHandTracking();
  } else if (isPaused) {
    // 暫停時繪製所有氣球（不移動）
    for (let b of balloons) {
      drawStaticBalloon(b);
    }
    // 顯示暫停文字
    fill(255, 255, 0);
    textSize(48);
    text("遊戲暫停", GW / 2, GH / 2);
  }

  // 顯示當前題目（韓文）與分數
  drawUI();

  // 更新並繪製特效粒子
  updateAndDrawParticles();

  // 繪製回饋訊息（正確/錯誤）
  drawFeedback();
}

// 新增：暫停時僅繪製不移動的氣球
function drawStaticBalloon(b) {
  if (b.isClock) {
    fill(100, 255, 100);
  } else if (b.isBad) {
    fill(50, 50, 50);
  } else {
    fill(255, 100, 100);
  }
  ellipse(b.x, b.y, 60, 60);
  fill(255);
  text(b.text, b.x, b.y);
}

// 核心功能：追蹤手部並判斷碰撞
function updateHandTracking() {
  if (!isModelReady) {
    fill(255, 0, 0);
    textSize(20);
    text("模型載入中...", GW / 2, GH / 2);
    return;
  }

  if (predictions.length > 0) {
    // 取得偵測到的第一隻手
    let hand = predictions[0];
    
    // 確保物件存在，避免紅字 TypeError
    if (hand && hand.annotations && Array.isArray(hand.annotations.indexFinger)) {
      // 繪製所有關節點以便除錯 (Debug)
      drawDebugPoints(hand);
      // MediaPipe Hands 的第 8 號點是「食指指尖 (INDEX_FINGER_TIP)」
      let indexFinger = hand.annotations.indexFinger[3]; 
      if (indexFinger) {
        // 計算原始座標（含鏡像翻轉）
        let rawX = GW - indexFinger[0];
        let rawY = indexFinger[1];

        // 平滑處理 (Lerp): 讓移動更順暢，0.4 代表每幀追蹤 40% 的位移量
        if (isFirstDetection) {
          targetX = rawX;
          targetY = rawY;
          isFirstDetection = false;
        } else {
          targetX = lerp(targetX, rawX, 0.4);
          targetY = lerp(targetY, rawY, 0.4);
        }

        // 巡檢所有氣球，判斷是否靠近或碰撞
        let hitIndex = -1;
        let isNearAny = false;

        for (let i = 0; i < balloons.length; i++) {
          let d = dist(targetX, targetY, balloons[i].x, balloons[i].y);
          if (d < 100) isNearAny = true; // 只要靠近任何一顆就變色
          if (d < 50) {
            hitIndex = i; // 記錄撞到的氣球編號
            break; 
          }
        }

        // 根據是否靠近氣球設定魔法光點顏色
        if (isNearAny) {
          fill(255, 255, 0); // 靠近時變黃色
        } else {
          fill(0, 255, 255); // 平時為青色
        }
        noStroke();
        ellipse(targetX, targetY, 25, 25);

        // 如果有撞擊到氣球，呼叫檢查答案函式
        if (hitIndex !== -1) {
          checkAnswer(hitIndex);
        }
      }
    }

  } else {
    // 提示玩家把手放出來
    fill(255, 255, 0);
    textSize(16);
    text("請將手放在鏡頭內", GW / 2, GH - 20);
  }
}

// 輔助開發：畫出所有手部關鍵點
function drawDebugPoints(hand) {
  // 檢查 landmarks 是否存在
  if (hand.landmarks) {
    fill(0, 255, 0);
    noStroke();
    for (let i = 0; i < hand.landmarks.length; i++) {
      // 因為畫布翻轉，偵測點也要跟著翻轉
      let x = GW - hand.landmarks[i][0];
      let y = hand.landmarks[i][1];
      ellipse(x, y, 5, 5);
    }
  }
}

function moveAndDrawBalloon() {
  for (let i = 0; i < balloons.length; i++) {
    let b = balloons[i];
    b.y += 2; // 氣球下落速度
    
    // 根據氣球類型設定顏色
    if (b.isClock) {
      fill(100, 255, 100);
    } else if (b.isBad) {
      fill(50, 50, 50);
    } else {
      fill(255, 100, 100);
    }
    ellipse(b.x, b.y, 60, 60);
    
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(b.text, b.x, b.y);

    // 如果個別氣球掉出螢幕，重新生成該氣球
    if (b.y > GH) {
      resetBalloon(false, i);
    }
  }
}

function drawUI() {
  // 顯示題目
  textAlign(LEFT, TOP);
  fill(0, 0, 0, 150); // 半透明黑底背景方便看字
  rect(10, 10, 150, 100, 10);
  
  fill(255);
  textSize(16);
  text("請找出對應發音:", 20, 25);
  textSize(40);
  text(currentKorean, 60, 55);

  // 顯示分數
  fill(255, 255, 0);
  textSize(24);
  textAlign(LEFT, TOP);
  text("SCORE: " + score, GW - 150, 30);

  // 顯示時間
  fill(255, 255, 255);
  text("TIME: " + gameTimer, GW - 150, 65);

  // 回主選單按鈕 (放在右下角)
  textAlign(CENTER, CENTER);
  drawMenuButton(GW - 120, GH - 50, 110, 40, "回主選單", color(100, 100, 100, 200));

  // 暫停/繼續按鈕 (放在回主選單按鈕上方)
  let pauseLabel = isPaused ? "繼續遊戲" : "暫停遊戲";
  drawMenuButton(GW - 120, GH - 100, 110, 40, pauseLabel, color(70, 70, 180, 200));
}

function checkAnswer(index) {
  // 如果正在顯示回饋，避免重複觸發
  if (feedbackTimer > 0) return;

  let b = balloons[index];
  lastHitIndex = index;

  if (b.isClock) {
    // 如果碰到的是時鐘氣球，增加 5 秒
    gameTimer += 5;
    resetBalloon(false, index); 
  } else if (b.isBad) {
    // 如果碰到的是負面道具，扣除 3 秒，並確保時間不低於 0
    gameTimer = max(0, gameTimer - 3);
    resetBalloon(false, index);
  } else {
    let questionObj = activeQuestions.find(q => q.kr === currentKorean);
    let currentAnswer = questionObj ? questionObj.en : "";
    
    if (b.text === currentAnswer) { 
      score += 10;
      playKoreanSound(currentKorean);
      // 紀錄正確答題
      history.push({ kr: currentKorean, en: currentAnswer, correct: true });
      // 在被撞擊的氣球位置產生彩虹星星特效
      spawnParticles(b.x, b.y); 
      feedbackText = "正確！\n" + currentKorean + " = " + currentAnswer;
      feedbackColor = color(0, 255, 0);
      feedbackTimer = 60; 
    } else {
      score = max(0, score - 5);
      // 紀錄錯誤答題
      history.push({ kr: currentKorean, en: currentAnswer, correct: false, userPick: b.text });
      feedbackText = "再試一次！\n" + currentKorean + " ≠ " + b.text;
      feedbackColor = color(255, 0, 0);
      feedbackTimer = 60; 
    }
  }
}

function drawFeedback() {
  if (feedbackTimer > 0) {
    push();
    // 計算淡出效果所需的 Alpha 值 (0-255)
    // 根據 feedbackTimer (從 60 變為 0) 來對應透明度
    let alpha = map(feedbackTimer, 0, 60, 0, 255);
    
    textAlign(CENTER, CENTER);
    textSize(60);
    fill(red(feedbackColor), green(feedbackColor), blue(feedbackColor), alpha);
    stroke(255, alpha); // 文字邊框也一起淡出
    strokeWeight(4);
    text(feedbackText, GW / 2, GH / 2);
    pop();
    
    // 只有在非暫停狀態下才減少回饋顯示時間
    if (!isPaused) {
      feedbackTimer--;
      // 當回饋顯示結束的瞬間，重置氣球，計時器會在此時重新同步
      if (feedbackTimer === 0) {
        // 如果是答對(feedbackColor是綠色)，換下一題；否則保留原題
        let isCorrect = (green(feedbackColor) === 255);
        if (isCorrect) {
          resetBalloon(true); // 全部換新題
        } else {
          // 答錯只重置被撞到的那一顆
          resetBalloon(false, lastHitIndex);
        }
      }
    }
  }
}

function resetBalloon(newQuestion = true, index = -1) {
  lastTimeCheck = millis();
  let questionObj = activeQuestions.find(q => q.kr === currentKorean);
  let correctAnswer = questionObj ? questionObj.en : "";

  if (newQuestion) {
    // 切換新題目時，初始化/更換韓文字母，並重新生成整組 5 個氣球
    let nextQ = random(activeQuestions);
    currentKorean = nextQ.kr;
    balloons = [];
    for (let i = 0; i < MAX_BALLOONS; i++) {
      // 第一顆氣球強制設為正確答案，確保畫面上一定有解
      balloons.push(generateBalloonData(i === 0));
    }
  } else if (index !== -1) {
    // 補位生成：檢查畫面上是否還有正確答案
    let otherCorrect = balloons.some((b, i) => i !== index && b.text === correctAnswer);
    // 如果其他氣球都不是正確答案，這顆就強制變正確答案
    balloons[index] = generateBalloonData(!otherCorrect);
  }
}

// 封裝氣球資料生成邏輯
function generateBalloonData(forceCorrect = false) {
  let b = {
    x: random(50, GW - 50),
    y: random(-200, 0), // 隨機初始高度讓氣球錯開落下
    text: "",
    isClock: false,
    isBad: false
  };

  let questionObj = activeQuestions.find(q => q.kr === currentKorean);
  let correctAnswer = questionObj ? questionObj.en : "";

  if (forceCorrect) {
    b.text = correctAnswer;
    return b;
  }

  let rand = random(1);
  if (rand < 0.15) {
    b.isClock = true;
    b.text = "⏰";
  } else if (rand < 0.25) {
    b.isBad = true;
    b.text = "💣";
  } else {
    if (random(1) < 0.6) {
      b.text = correctAnswer;
    } else {
      b.text = random(activeQuestions).en;
    }
  }
  return b;
}

function drawGameOverScreen() {
  image(bgImg, 0, 0, GW, GH);
  fill(0, 0, 0, 180);
  rect(0, 0, GW, GH);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(64);
  text("遊戲結束", GW / 2, 70);
  textSize(32);
  text("最終得分: " + score, GW / 2, 130);

  // 顯示答題紀錄 (最多顯示最近的 10 筆)
  textSize(18);
  textAlign(CENTER, TOP);
  text("--- 答題紀錄 ---", GW / 2, 170);
  
  let displayLimit = 8;
  let startY = 200;
  let recentHistory = history.slice(-displayLimit); // 只取最後 8 筆避免畫面太擠

  for (let i = 0; i < recentHistory.length; i++) {
    let item = recentHistory[i];
    let status = item.correct ? "✓" : `✗ (選了 ${item.userPick})`;
    fill(item.correct ? color(0, 255, 0) : color(255, 100, 100));
    text(`${item.kr} (${item.en}) : ${status}`, GW / 2, startY + i * 25);
  }

  // 將按鈕改為並排顯示
  drawMenuButton(GW / 2 - 130, GH - 80, 120, 50, "返回選單", color(70, 130, 180));
  drawMenuButton(GW / 2 + 10, GH - 80, 120, 50, "重新開始", color(50, 150, 50));
}

function mousePressed() {
  if (gameState === "START" && isModelReady) {
    // 檢查點擊位置
    // 子音按鈕
    if (mouseX > GW / 2 - 120 && mouseX < GW / 2 - 20 && mouseY > GH / 2 + 50 && mouseY < GH / 2 + 100) {
      startGame("CONSONANTS");
    }
    // 母音按鈕
    if (mouseX > GW / 2 + 20 && mouseX < GW / 2 + 120 && mouseY > GH / 2 + 50 && mouseY < GH / 2 + 100) {
      startGame("VOWELS");
    }
  } else if (gameState === "RULES") {
    if (mouseX > GW / 2 - 60 && mouseX < GW / 2 + 60 && mouseY > GH - 80 && mouseY < GH - 30) {
      actuallyStartGame();
    }
  } else if (gameState === "PLAYING") {
    // 檢查是否點擊右下角的「回主選單」按鈕
    if (mouseX > GW - 120 && mouseX < GW - 10 && mouseY > GH - 50 && mouseY < GH - 10) {
      gameState = "START";
    }
    // 檢查點擊「暫停/繼續」按鈕
    if (mouseX > GW - 120 && mouseX < GW - 10 && mouseY > GH - 100 && mouseY < GH - 60) {
      isPaused = !isPaused;
    }
  } else if (gameState === "GAMEOVER") {
    // 檢查點擊「返回選單」 (左邊按鈕)
    if (mouseX > GW / 2 - 130 && mouseX < GW / 2 - 10 && mouseY > GH - 80 && mouseY < GH - 30) {
      gameState = "START";
    }
    // 檢查點擊「重新開始」 (右邊按鈕)
    if (mouseX > GW / 2 + 10 && mouseX < GW / 2 + 130 && mouseY > GH - 80 && mouseY < GH - 30) {
      startGame(currentMode);
    }
  }
}

function startGame(mode) {
  currentMode = mode;
  activeQuestions = (mode === "CONSONANTS") ? CONSONANTS : VOWELS;
  gameState = "RULES";
}

function actuallyStartGame() {
  score = 0;
  history = []; // 清空上一次的紀錄
  gameTimer = 60;
  lastTimeCheck = millis();
  isPaused = false;
  gameState = "PLAYING";
  isFirstDetection = true;
  resetBalloon(true);
}

// 呼叫瀏覽器語音 API 唸出韓文
function playKoreanSound(txt) {
  if ('speechSynthesis' in window) {
    let utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  }
}

// 新增：產生粒子特效
function spawnParticles(x, y) {
  for (let i = 0; i < 30; i++) {
    // 為每顆星星產生隨機的彩虹顏色 (RGB 隨機組合)
    let randomColor = color(random(255), random(255), random(255));
    particles.push({
      x: x,
      y: y,
      vx: random(-7, 7),
      vy: random(-7, 7),
      size: random(5, 15),
      color: randomColor,
      alpha: 255,
      life: random(40, 80) // 粒子壽命
    });
  }
}

// 新增：更新與繪製粒子
function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // 模擬重力
    p.alpha -= 255 / p.life; // 逐漸淡出

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    push();
    fill(red(p.color), green(p.color), blue(p.color), p.alpha);
    noStroke();
    // 繪製簡單的星星形狀 (由兩個三角形或簡單的多邊形組成)
    translate(p.x, p.y);
    rotate(frameCount * 0.1);
    beginShape();
    for (let j = 0; j < 5; j++) {
      let angle = TWO_PI * j / 5;
      let r = p.size;
      vertex(cos(angle) * r, sin(angle) * r);
      angle += TWO_PI / 10;
      r = p.size / 2;
      vertex(cos(angle) * r, sin(angle) * r);
    }
    endShape(CLOSE);
    pop();
  }
}