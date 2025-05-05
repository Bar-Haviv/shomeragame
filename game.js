const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==== Classes ====
class Entity {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
    }
}

class Player extends Entity {
    constructor() {
        super(400, 500, 50, 50, 10);
        this.baseSpeed = 10;
        this.fireRate = 500;
        this.lastShot = 0;
        this.imageKey = "player1"; // default
    }

    move(keys) {
        if (!game.isGameOver) {
            if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
            if (keys['ArrowRight'] && this.x < canvas.width - this.width) this.x += this.speed;
        }
    }
}

class Bullet extends Entity {}
class Enemy extends Entity {}
class Money extends Entity {}
class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30, 2);
        this.type = type;
    }
}

// ==== Assets ====
const images = {
    player1: new Image(),
    player2: new Image(),
    player3: new Image(),
    enemy: new Image(),
    bullet: new Image(),
    money: new Image(),
    powerUp: new Image(),
    explosion: new Image(),
    heart: new Image()
};

const sounds = {
    shoot: new Audio('sounds/shoot.mp3'),
    hit: new Audio('sounds/hit.mp3'),
    collect: new Audio('sounds/collect.mp3'),
    levelUp: new Audio('sounds/levelup.mp3')
};

// ==== Game State ====
const POWERUP_TYPES = {
    SPEED: 'speed',
    RAPID_FIRE: 'rapid_fire'
};

const levelConfig = {
    1: { spawnRate: 0.02, speed: 2 },
    2: { spawnRate: 0.03, speed: 2.5 },
    3: { spawnRate: 0.04, speed: 3 },
    4: { spawnRate: 0.05, speed: 3.5 },
    5: { spawnRate: 0.06, speed: 4 }
};

let game;
let keys = {};
let lives = 3;
let gameState = "menu"; // menu, playing, gameOver
let selectedPlayer = "player1";

function resetGame() {
    game = {
        player: new Player(),
        bullets: [],
        enemies: [],
        moneys: [],
        powerUps: [],
        explosions: [],
        score: 0,
        level: 1,
        enemiesDestroyed: 0,
        isGameOver: false
    };

    game.player.imageKey = selectedPlayer;

    keys = {};
    lives = 3;
}

// ==== Functions ====
function isColliding(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function drawPlayer() {
    ctx.drawImage(images[game.player.imageKey], game.player.x, game.player.y, game.player.width, game.player.height);
}

function drawBullets() {
    game.bullets.forEach((b, i) => {
        b.y -= b.speed;
        ctx.drawImage(images.bullet, b.x, b.y, 10, 10);

        game.enemies.forEach((e, j) => {
            if (isColliding(b, e)) {
                game.enemies.splice(j, 1);
                game.bullets.splice(i, 1);
                game.score += 10 * game.level;
                game.enemiesDestroyed++;

                game.explosions.push({
                    x: e.x + e.width / 2,
                    y: e.y + e.height / 2,
                    duration: 15
                });

                for (let i = 0; i < 3; i++) {
                    game.moneys.push(new Money(e.x + Math.random() * 30, e.y, 2 + Math.random() * 2));
                }

                playSound(sounds.hit);
            }
        });
    });

    game.bullets = game.bullets.filter(b => b.y > 0);
}

function spawnEnemy() {
    const config = levelConfig[game.level] || levelConfig[5];
    if (Math.random() < config.spawnRate && !game.isGameOver) {
        game.enemies.push(new Enemy(
            Math.random() * (canvas.width - 50),
            -50,
            50, 50,
            config.speed
        ));
    }
}

function drawEnemies() {
    game.enemies.forEach((e, i) => {
        e.y += e.speed;
        ctx.drawImage(images.enemy, e.x, e.y, e.width, e.height);

        if (isColliding(e, game.player)) {
            lives--;
            game.enemies.splice(i, 1);

            if (lives <= 0) {
                game.isGameOver = true;
            }
        }

        if (e.y > canvas.height) {
            game.enemies.splice(i, 1);
        }
    });
}

function spawnPowerUp() {
    if (Math.random() < 0.005 && !game.isGameOver) {
        const types = Object.values(POWERUP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];
        game.powerUps.push(new PowerUp(
            Math.random() * (canvas.width - 30),
            -30,
            type
        ));
    }
}

function drawPowerUps() {
    game.powerUps.forEach((p, i) => {
        p.y += p.speed;
        ctx.drawImage(images.powerUp, p.x, p.y, p.width, p.height);

        if (isColliding(p, game.player)) {
            game.powerUps.splice(i, 1);
            playSound(sounds.collect);

            if (p.type === POWERUP_TYPES.SPEED) {
                game.player.speed = game.player.baseSpeed * 1.5;
                setTimeout(() => { game.player.speed = game.player.baseSpeed; }, 5000);
            } else if (p.type === POWERUP_TYPES.RAPID_FIRE) {
                game.player.fireRate = 200;
                setTimeout(() => { game.player.fireRate = 500; }, 5000);
            }
        }
    });

    game.powerUps = game.powerUps.filter(p => p.y < canvas.height);
}

function drawMoneys() {
    game.moneys.forEach((m, i) => {
        m.y += m.speed;
        ctx.drawImage(images.money, m.x, m.y, 20, 20);

        if (isColliding(m, game.player)) {
            game.moneys.splice(i, 1);
            game.score += 5 * game.level;
            playSound(sounds.collect);
        }
    });

    game.moneys = game.moneys.filter(m => m.y < canvas.height);
}

function drawExplosions() {
    game.explosions.forEach((exp, i) => {
        ctx.drawImage(images.explosion, exp.x - 32, exp.y - 32, 64, 64);
        exp.duration--;

        if (exp.duration <= 0) {
            game.explosions.splice(i, 1);
        }
    });
}

function drawUI() {
    // Set text style and background box (right side)
    ctx.font = "20px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    
    const boxWidth = 160;
    const boxHeight = 100;
    const padding = 10;
    const x = canvas.width - boxWidth - padding;
    const y = padding;

    ctx.fillRect(x, y, boxWidth, boxHeight); // Draw background box

    // Score & Level
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${game.score}`, x + 5, y + 25);
    ctx.fillText(`Level: ${game.level}`, x + 5, y + 55);

    // Lives as hearts
    const heartSize = 20;
    const heartStartX = x + 5;
    const heartStartY = y + 75;

    for (let i = 0; i < lives; i++) {
        ctx.drawImage(images.heart, heartStartX + i * (heartSize + 5), heartStartY, heartSize, heartSize);
    }

    if (game.isGameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2);
        ctx.font = "20px Arial";
        ctx.fillText(`Final Score: ${game.score}`, canvas.width / 2, canvas.height / 2 + 40);

        document.getElementById("restartBtn").style.display = "inline-block";
    }
}

function drawMenu() {
    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Choose Your Ship", canvas.width / 2, 80);

    const size = 60;
    const padding = 20;

    ctx.drawImage(images.player1, padding, 150, size, size);
    ctx.drawImage(images.player2, canvas.width / 2 - size / 2, 150, size, size);
    ctx.drawImage(images.player3, canvas.width - size - padding, 150, size, size);

    // Highlight selected
    if (selectedPlayer === "player1") ctx.strokeRect(padding, 150, size, size);
    if (selectedPlayer === "player2") ctx.strokeRect(canvas.width / 2 - size / 2, 150, size, size);
    if (selectedPlayer === "player3") ctx.strokeRect(canvas.width - size - padding, 150, size, size);

    // Start button
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(canvas.width / 2 - 75, 250, 150, 50);
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Start Game", canvas.width / 2, 280);
}

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (e.key === ' ' && Date.now() - game.player.lastShot >= game.player.fireRate && !game.isGameOver) {
        game.bullets.push(new Bullet(game.player.x + 20, game.player.y, 10, 10, 10));
        game.player.lastShot = Date.now();
        playSound(sounds.shoot);
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('click', (e) => {
    if (gameState === "menu") {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const size = 60;
        const padding = 20;

        // Choose ship
        if (mouseY >= 150 && mouseY <= 210) {
            if (mouseX >= padding && mouseX <= padding + size) selectedPlayer = "player1";
            if (mouseX >= canvas.width / 2 - size / 2 && mouseX <= canvas.width / 2 + size / 2) selectedPlayer = "player2";
            if (mouseX >= canvas.width - size - padding && mouseX <= canvas.width - padding + size) selectedPlayer = "player3";
        }

        // Start game
        if (
            mouseX >= canvas.width / 2 - 75 &&
            mouseX <= canvas.width / 2 + 75 &&
            mouseY >= 250 &&
            mouseY <= 300
        ) {
            resetGame();
            gameState = "playing";
        }
    }
});

document.getElementById("restartBtn").addEventListener("click", () => {
    gameState = "menu";
    document.getElementById("restartBtn").style.display = "none";
});

function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "menu") {
        drawMenu();
    } else if (gameState === "playing") {
        game.player.move(keys);
        drawPlayer();
        drawBullets();
        spawnEnemy();
        drawEnemies();
        spawnPowerUp();
        drawPowerUps();
        drawMoneys();
        drawExplosions();
        drawUI();
    }

    requestAnimationFrame(gameLoop);
}

// ==== Load Assets ====
const assetsToLoad = [
    { key: 'player1', src: 'images/player1.png' },
    { key: 'player2', src: 'images/player2.png' },
    { key: 'player3', src: 'images/player3.png' },
    { key: 'enemy', src: 'images/enemyRed.png' },
    { key: 'bullet', src: 'images/laserBlue01.png' },
    { key: 'money', src: 'images/coinGold.png' },
    { key: 'powerUp', src: 'images/powerupYellow_shield.png' },
    { key: 'explosion', src: 'images/explosion.png' },
    { key: 'heart', src: 'images/heart.png' }
];

let loadedAssets = 0;

assetsToLoad.forEach(asset => {
    images[asset.key].src = asset.src;
    images[asset.key].onload = () => {
        loadedAssets++;
        if (loadedAssets === assetsToLoad.length) {
            resetGame();
            requestAnimationFrame(gameLoop);
        }
    };
});