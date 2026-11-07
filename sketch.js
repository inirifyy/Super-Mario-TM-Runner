// Link Teachable Machine utama
const DEFAULT_MODEL_URL = "https://teachablemachine.withgoogle.com/models/qJG3LXM-8/";

let classifier;
let video;
let currentLabel = "Loading Model...";
let confidenceScore = 0;
let isModelReady = false;

// Game Variables
let mario;
let obstacles = [];
let questionBlocks = [];
let score = 0;
let coins = 0;
let gameOver = false;
let spawnTimer = 0;

function setup() {
  let canvas = createCanvas(800, 400);
  canvas.parent("canvas-holder");

  // Inisialisasi Webcam
  video = createCapture(VIDEO);
  video.size(160, 120);
  video.hide();

  mario = new Mario();

  // Load Model bawaan saat awal disetup
  loadModelFromUrl(DEFAULT_MODEL_URL);
}

function loadUserModel() {
  let inputUrl = document.getElementById("modelUrl").value.trim();
  if (!inputUrl) {
    alert("Masukkan URL Teachable Machine kamu dulu ya!");
    return;
  }
  loadModelFromUrl(inputUrl);
}

function loadModelFromUrl(url) {
  if (!url.endsWith("/")) url += "/";
  let modelURL = url + "model.json";

  isModelReady = false;
  currentLabel = "Loading Model...";
  classifier = ml5.imageClassifier(modelURL, () => {
    isModelReady = true;
    currentLabel = "Model Ready!";
    classifyVideo();
  });
}

function classifyVideo() {
  if (isModelReady && classifier) {
    classifier.classify(video, (error, results) => {
      if (results && results[0]) {
        currentLabel = results[0].label;
        confidenceScore = Math.round(results[0].confidence * 100);
      }
      classifyVideo();
    });
  }
}

function draw() {
  // 1. Langit Mario
  background(92, 148, 252);

  // 2. Awan Dekoratif
  drawClouds();

  // 3. Tanah (Ground NES 8-bit Style)
  drawGround();

  if (!gameOver) {
    // Spawning Rintangan & Block
    spawnTimer++;
    if (spawnTimer % 90 === 0) {
      if (random(1) < 0.6) {
        obstacles.push(new Obstacle());
      } else {
        questionBlocks.push(new QuestionBlock());
      }
    }

    // Update & Draw Mario
    mario.update(currentLabel);
    mario.draw();

    // Update & Draw Rintangan (Goomba / Bullet Bill)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].update();
      obstacles[i].draw();

      if (obstacles[i].hits(mario)) {
        gameOver = true;
      }

      if (obstacles[i].offscreen()) {
        obstacles.splice(i, 1);
        score += 10;
      }
    }

    // Update & Draw ? Block
    for (let i = questionBlocks.length - 1; i >= 0; i--) {
      questionBlocks[i].update();
      questionBlocks[i].draw();

      if (questionBlocks[i].hits(mario)) {
        coins += 1;
        score += 50;
        questionBlocks.splice(i, 1);
      } else if (questionBlocks[i].offscreen()) {
        questionBlocks.splice(i, 1);
      }
    }
  } else {
    // Display Game Over Screen
    fill(229, 37, 33);
    textAlign(CENTER);
    textSize(28);
    text("GAME OVER", width / 2, height / 2 - 20);
    fill(255);
    textSize(12);
    text("Tekan R untuk Main Lagi", width / 2, height / 2 + 20);
  }

  // 4. Render UI / Score & Webcam Preview
  drawUI();
}

function keyPressed() {
  if ((key === 'r' || key === 'R') && gameOver) {
    resetGame();
  }
}

function resetGame() {
  obstacles = [];
  questionBlocks = [];
  score = 0;
  coins = 0;
  gameOver = false;
  spawnTimer = 0;
  mario = new Mario();
}

// ---------------- GAME CLASSES ----------------

class Mario {
  constructor() {
    this.x = 100;
    this.groundY = 300;
    this.y = this.groundY;
    this.w = 40;
    this.h = 50;
    this.vy = 0;
    this.gravity = 1.2;
    this.isDucking = false;
    this.isPunching = false;
    this.hasJumped = false; // Mencegah lompat berulang-ulang tanpa ganti pose
  }

  update(label) {
    let lowerLabel = label.toLowerCase();

    // Reset status per frame
    this.isDucking = false;
    this.isPunching = false;

    // Kategori Pose
    let isStand = lowerLabel.includes("stand") || lowerLabel.includes("diam") || lowerLabel.includes("normal");
    let isJump = lowerLabel.includes("jump") || lowerLabel.includes("lompat");
    let isDuck = lowerLabel.includes("duck") || lowerLabel.includes("nunduk");
    let isPunch = lowerLabel.includes("punch") || lowerLabel.includes("pukul") || lowerLabel.includes("tinju");

    // Jika gestur berganti dari Jump ke yang lain (termasuk Stand), kunci lompat di-reset
    if (!isJump) {
      this.hasJumped = false;
    }

    // Eksekusi Logika Gerakan
    if (isJump) {
      // HANYA lompat jika sedang di tanah DAN belum pernah lompat di gestur ini
      if (this.y === this.groundY && !this.hasJumped) {
        this.vy = -18;
        this.hasJumped = true; // Kunci lompatan sampai tangan diturunkan / kembali ke Stand
      }
    } else if (isDuck) {
      this.isDucking = true;
    } else if (isPunch) {
      this.isPunching = true;
    } else if (isStand) {
      // Pose Stand: Mario berada di posisi standar di tanah
      this.isDucking = false;
      this.isPunching = false;
    }

    // Fisika Gravitasi
    this.y += this.vy;
    this.vy += this.gravity;

    // Tahan di atas tanah
    if (this.y >= this.groundY) {
      this.y = this.groundY;
      this.vy = 0;
    }
  }

  draw() {
    push();
    rectMode(CORNER);
    if (this.isDucking) {
      // Mario Merunduk
      fill(229, 37, 33);
      rect(this.x, this.y + 25, this.w, 25, 4);
      fill(0, 168, 0);
      rect(this.x + 5, this.y + 40, this.w - 10, 10);
    } else if (this.isPunching) {
      // Mario Memukul
      fill(229, 37, 33);
      rect(this.x, this.y, this.w, this.h, 4);
      fill(248, 216, 0);
      rect(this.x + 10, this.y - 18, 20, 20, 4);
    } else {
      // Mario Stand / Run Normal
      fill(229, 37, 33);
      rect(this.x, this.y, this.w, this.h, 4);
      fill(0, 80, 200);
      rect(this.x + 5, this.y + 30, this.w - 10, 20);
    }
    pop();
  }

  getBounds() {
    if (this.isDucking) {
      return { x: this.x, y: this.y + 25, w: this.w, h: 25 };
    }
    if (this.isPunching) {
      return { x: this.x, y: this.y - 18, w: this.w, h: this.h + 18 };
    }
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

class Obstacle {
  constructor() {
    this.x = width;
    this.speed = 6;
    this.type = random(["goomba", "bullet"]);
    
    if (this.type === "goomba") {
      this.w = 35;
      this.h = 35;
      this.y = 315;
    } else {
      this.w = 45;
      this.h = 25;
      this.y = 265;
    }
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    push();
    if (this.type === "goomba") {
      fill(140, 70, 20);
      rect(this.x, this.y, this.w, this.h, 6);
    } else {
      fill(20);
      rect(this.x, this.y, this.w, this.h, 10);
    }
    pop();
  }

  hits(mario) {
    let b = mario.getBounds();
    return (
      this.x < b.x + b.w &&
      this.x + this.w > b.x &&
      this.y < b.y + b.h &&
      this.y + this.h > b.y
    );
  }

  offscreen() {
    return this.x < -this.w;
  }
}

class QuestionBlock {
  constructor() {
    this.x = width;
    this.y = 220;
    this.w = 35;
    this.h = 35;
    this.speed = 6;
  }

  update() {
    this.x -= this.speed;
  }

  draw() {
    push();
    fill(248, 216, 0);
    stroke(0);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h, 4);
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(18);
    text("?", this.x + this.w / 2, this.y + this.h / 2);
    pop();
  }

  hits(mario) {
    let b = mario.getBounds();
    return (
      mario.isPunching &&
      this.x < b.x + b.w &&
      this.x + this.w > b.x &&
      this.y < b.y + b.h &&
      this.y + this.h > b.y
    );
  }

  offscreen() {
    return this.x < -this.w;
  }
}

// ---------------- HELPER DRAWINGS ----------------

function drawGround() {
  fill(200, 76, 12);
  rect(0, 350, width, 50);
  fill(0, 168, 0);
  rect(0, 350, width, 8);
}

function drawClouds() {
  fill(255);
  noStroke();
  ellipse(150, 80, 60, 30);
  ellipse(500, 120, 80, 40);
  ellipse(720, 70, 50, 25);
}

function drawUI() {
  // Scoreboard Retro
  fill(255);
  textAlign(LEFT);
  textSize(12);
  text(`MARIO: ${score}`, 20, 30);
  fill(248, 216, 0);
  text(`COINS: $${coins}`, 20, 50);

  // Status Pose & Level Confidence
  fill(0);
  rect(width - 270, 10, 250, 40, 4);
  fill(255);
  textSize(9);
  text(`LABEL: ${currentLabel.toUpperCase()} (${confidenceScore}%)`, width - 260, 34);

  // Preview Webcam Kecil
  image(video, width - 150, height - 110, 140, 100);
  noFill();
  stroke(255);
  strokeWeight(2);
  rect(width - 150, height - 110, 140, 100);
}