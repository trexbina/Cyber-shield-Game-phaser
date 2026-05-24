import Phaser from 'phaser';
import SoundEffects from '../utils/SoundEffects.js';

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        // Reset gameplay state parameters on restart
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.gameOver = false;

        this.lastFired = 0;
        this.fireDelay = 180; // Standard fire rate delay in ms

        this.isInvincible = false;

        // Power-up states
        this.shieldActive = false;
        this.rapidActive = false;
        this.tripleActive = false;
        this.speedActive = false;
        this.shieldTime = 0;
        this.rapidTime = 0;
        this.tripleTime = 0;
        this.speedTime = 0;

        // Travel warp progress parameters
        this.travelProgress = 0;
        this.bossSpawned = false;
        this.scrollSpeed = 2.0;

        // Wave management spawner parameters
        this.spawnTimer = 0;
        this.spawnInterval = 1200;
        this.currentWaveEnemies = [];
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 1. Setup rapidly scrolling starfield background
        this.background = this.add.tileSprite(512, 384, 1024, 768, 'star_bg');
        this.background.setScrollFactor(0);

        // 2. Spawn Player Ship
        this.player = this.physics.add.sprite(width / 2, height - 120, 'player_ship');
        this.player.setCollideWorldBounds(true);
        this.player.setDrag(400, 400); // Gives super smooth momentum based deceleration

        // Apply beautiful neon cyan glow filter to player ship
        this.player.enableFilters();
        this.playerGlow = this.player.filters.internal.addGlow(0x00ffff, 4, 0, 1);

        // 3. Thruster Particle Exhaust System
        this.thrusterParticles = this.add.particles(0, 0, 'spark', {
            speedY: { min: 80, max: 150 },
            speedX: { min: -15, max: 15 },
            lifespan: { min: 200, max: 400 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.8, end: 0 },
            color: [0x00ffff, 0x0088ff, 0x050510],
            follow: this.player,
            followOffset: { x: 0, y: 24 }, // Adjusted to match the bottom edge of the larger 48x48 ship
            emitting: true
        });

        // Render exhaust behind the player ship
        this.thrusterParticles.setDepth(1);
        this.player.setDepth(2);

        // 4. Procedural Vector Shield Bubble (draws on player coordinate in update)
        this.shieldBubble = this.add.graphics();
        this.shieldBubble.lineStyle(2.5, 0x39ff14, 1); // Neon green shield bubble
        this.shieldBubble.strokeCircle(0, 0, 24);

        // Shield glow filter
        this.shieldBubble.enableFilters();
        this.shieldGlow = this.shieldBubble.filters.internal.addGlow(0x39ff14, 6, 0, 1);
        this.shieldBubble.setVisible(false);
        this.shieldBubble.setDepth(3);

        // 5. Physics Groups setup
        this.playerLasers = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 30,
            runChildUpdate: true
        });

        this.enemyLasers = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite,
            maxSize: 40,
            runChildUpdate: true
        });

        this.enemies = this.physics.add.group({
            runChildUpdate: true
        });

        this.powerups = this.physics.add.group();

        // 6. Setup Keyboard Input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Support WASD keys as well
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // 7. Interactive Colliders & Overlaps
        // Player lasers hitting enemies
        this.physics.add.overlap(this.playerLasers, this.enemies, this.hitEnemy, null, this);

        // Enemy lasers hitting Player
        this.physics.add.overlap(this.enemyLasers, this.player, this.hitPlayer, null, this);

        // Enemies directly crashing into Player
        this.physics.add.overlap(this.enemies, this.player, this.crashPlayer, null, this);

        // Player collecting powerups
        this.physics.add.overlap(this.powerups, this.player, this.collectPowerup, null, this);

        // 8. HUD HUD Layout (Styled with robust vector glow shadows)
        this.scoreText = this.add.text(20, 20, 'SCORE: 000000', {
            fontFamily: 'Orbitron',
            fontSize: '18px',
            fill: '#ffffff',
            fontWeight: '700',
            stroke: '#ffffff',
            strokeThickness: 0.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ffffff',
                blur: 8,
                stroke: true,
                fill: true
            },
            letterSpacing: 2
        });

        this.waveText = this.add.text(width - 150, 20, 'WAVE: 01', {
            fontFamily: 'Orbitron',
            fontSize: '18px',
            fill: '#ff00ff',
            fontWeight: '700',
            stroke: '#ff00ff',
            strokeThickness: 0.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff00ff',
                blur: 10,
                stroke: true,
                fill: true
            },
            letterSpacing: 2
        });

        // Visual Battery graphics for Shield/Health HUD
        this.add.text(20, 45, 'SHIELD BATTERIES:', {
            fontFamily: 'Orbitron',
            fontSize: '10px',
            fill: '#00ffff',
            alpha: 0.7
        });

        this.hudLivesGraphics = this.add.graphics();
        this.hudLivesGraphics.setDepth(10);
        this.drawHUD();

        // 9. Boss Health Bar Overlay (Hidden by default)
        this.bossHealthBarContainer = this.add.graphics();
        this.bossHealthBarFill = this.add.graphics();
        this.bossHealthBarText = this.add.text(width / 2, 45, 'WARSHIP CORE INTEGRITY', {
            fontFamily: 'Orbitron',
            fontSize: '10px',
            fill: '#ff0055',
            fontWeight: '700',
            letterSpacing: 1
        }).setOrigin(0.5);

        this.bossHealthBarContainer.setVisible(false);
        this.bossHealthBarFill.setVisible(false);
        this.bossHealthBarText.setVisible(false);

        // 10. Travel/Warp Progress HUD (Bottom Dashboard)
        this.progressHUDGraphics = this.add.graphics();
        this.progressHUDGraphics.setDepth(10);

        this.progressText = this.add.text(width / 2, height - 42, 'SECTOR WARP PROGRESS: 0%', {
            fontFamily: 'Orbitron',
            fontSize: '11px',
            fill: '#00ffaa',
            fontWeight: '700',
            stroke: '#00ffaa',
            strokeThickness: 0.2,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffaa', blur: 6, stroke: true, fill: true },
            letterSpacing: 1
        }).setOrigin(0.5);

        // Start the wave spawn engine
        this.startWave(1);
    }

    update(time, delta) {
        if (this.gameOver) return;

        // A. Scroll starfield vertically downward with dynamic speed
        this.background.tilePositionY -= this.scrollSpeed;

        // B. Handle player flight movements (WASD / Arrow keys)
        this.handlePlayerMovement();

        // C. Handle laser fire (Spacebar holds or presses)
        if (this.spacebar.isDown && time > this.lastFired) {
            this.firePlayerLaser();
            this.lastFired = time + (this.rapidActive ? this.fireDelay / 2 : this.fireDelay);
        }

        // D. Update vector shield bubble position
        if (this.shieldActive) {
            this.shieldBubble.setPosition(this.player.x, this.player.y);
            this.shieldBubble.setVisible(true);

            // Check shield expiration
            if (time > this.shieldTime) {
                this.deactivateShield();
            }
        } else {
            this.shieldBubble.setVisible(false);
        }

        // E. Check power-up expirations
        if (this.rapidActive && time > this.rapidTime) {
            this.deactivateRapidFire();
        }
        if (this.tripleActive && time > this.tripleTime) {
            this.deactivateTriple();
        }
        if (this.speedActive && time > this.speedTime) {
            this.deactivateSpeed();
        }

        // F. Run travel progress calculator & boss flagship spawn
        if (!this.bossSpawned && !this.gameOver) {
            // Speed boosters make travel faster!
            const travelStep = this.speedActive ? 0.08 : 0.05;
            this.travelProgress += travelStep * (1 + this.wave * 0.05);

            if (this.travelProgress >= 100) {
                this.travelProgress = 100;
                this.bossSpawned = true;

                // Spawn the Dreadnought Boss Flagship!
                this.spawnEnemy('boss');

                // Shockwave and alerts
                this.cameras.main.flash(400, 255, 0, 85);
                this.cameras.main.shake(300, 0.02);
                SoundEffects.playPowerup();
            }
        }
        this.updateTravelProgress();

        // G. Run enemy spawner & AI
        this.handleWaveSpawning(time);
        this.handleEnemyAI(time);

        // H. Clean up offscreen lasers
        this.cleanOffscreenLasers();
    }

    handlePlayerMovement() {
        const speed = this.speedActive ? 520 : 360;
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -speed;
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = speed;
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -speed;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = speed;
        }

        // Set player velocity
        this.player.setVelocity(vx, vy);

        // Rotate thruster engine flare based on horizontal movement
        if (vx < 0) {
            this.player.setAngle(-5);
            this.thrusterParticles.followOffset.x = 4;
        } else if (vx > 0) {
            this.player.setAngle(5);
            this.thrusterParticles.followOffset.x = -4;
        } else {
            this.player.setAngle(0);
            this.thrusterParticles.followOffset.x = 0;
        }
    }

    firePlayerLaser() {
        SoundEffects.playLaser();

        const x = this.player.x;
        const y = this.player.y - 12;

        if (this.tripleActive) {
            // Triple Shot: center, left-angled, right-angled spreads
            const velocities = [
                { vx: 0, vy: -700, ox: 0 },
                { vx: -160, vy: -650, ox: -12 },
                { vx: 160, vy: -650, ox: 12 }
            ];

            // If rapid is ALSO active, unleash 5-laser fire shotgun chaos!
            if (this.rapidActive) {
                velocities.push({ vx: -300, vy: -580, ox: -24 });
                velocities.push({ vx: 300, vy: -580, ox: 24 });
            }

            velocities.forEach(v => {
                const laser = this.playerLasers.get(x + v.ox, y, 'player_laser');
                if (laser) {
                    laser.setActive(true).setVisible(true);
                    this.physics.world.enable(laser);
                    laser.body.setVelocity(v.vx, v.vy);
                    laser.enableFilters();
                    laser.filters.internal.addGlow(this.rapidActive ? 0xffff00 : 0x00ffaa, 2);
                }
            });
        } else if (this.rapidActive) {
            // Twin shot! Fire two lasers from wingtips
            const laser1 = this.playerLasers.get(x - 10, y, 'player_laser');
            const laser2 = this.playerLasers.get(x + 10, y, 'player_laser');

            if (laser1 && laser2) {
                laser1.setActive(true).setVisible(true);
                laser2.setActive(true).setVisible(true);
                this.physics.world.enable(laser1);
                this.physics.world.enable(laser2);
                laser1.body.setVelocityY(-700);
                laser2.body.setVelocityY(-700);

                // Add bullet glows
                laser1.enableFilters();
                laser1.filters.internal.addGlow(0x00ffff, 2);
                laser2.enableFilters();
                laser2.filters.internal.addGlow(0x00ffff, 2);
            }
        } else {
            // Single central shot
            const laser = this.playerLasers.get(x, y, 'player_laser');
            if (laser) {
                laser.setActive(true).setVisible(true);
                this.physics.world.enable(laser);
                laser.body.setVelocityY(-600);

                laser.enableFilters();
                laser.filters.internal.addGlow(0x00ffff, 2);
            }
        }
    }

    startWave(waveNumber) {
        this.wave = waveNumber;
        this.drawHUD();

        // Sound signal for system wave deployment
        SoundEffects.playPowerup();

        // 1. Randomize Space Scene Stars scrolling speeds
        this.scrollSpeed = Phaser.Math.FloatBetween(2.0, 4.5) + (waveNumber * 0.1);

        // 2. Randomize galactic space nebula tint
        const spaceTints = [0xffffff, 0x88ccff, 0xbb99ff, 0xffaacc, 0x88ffcc, 0xffeebb, 0xaa88ff];
        const chosenTint = Phaser.Math.RND.pick(spaceTints);
        this.background.setTint(chosenTint);

        // Reset travel progress
        this.travelProgress = 0;
        this.bossSpawned = false;

        // Spawn timer setup
        this.spawnTimer = this.time.now + 600;
    }

    handleWaveSpawning(time) {
        if (this.gameOver || this.bossSpawned) return;

        // Dynamic random spawner!
        const activeCount = this.enemies.countActive();
        // Dynamic scaling: base 3 + 2 more enemies allowed per wave, capped at 16 active ships max
        const maxAllowed = Math.min(3 + this.wave * 2, 16);

        if (activeCount < maxAllowed && time > this.spawnTimer) {
            // Weighted list based on current wave!
            const pool = ['scout'];

            if (this.wave >= 2) {
                // Highly aggressive mix of advanced craft
                pool.push('fighter', 'fighter', 'torpedo', 'bomber', 'support', 'battlecruiser');
            } else {
                pool.push('scout', 'fighter');
            }

            if (this.wave >= 3) {
                pool.push('bomber', 'support', 'battlecruiser', 'battlecruiser');
            }

            if (this.wave >= 4) {
                pool.push('battlecruiser', 'torpedo', 'bomber');
            }

            const chosenType = Phaser.Math.RND.pick(pool);
            this.spawnEnemy(chosenType);

            // Set next spawn cooldown interval - gets dynamically faster with each wave!
            const baseMin = Math.max(150, 1000 - (this.wave - 1) * 200);
            const baseMax = Math.max(300, 2200 - (this.wave - 1) * 350);
            const delay = Phaser.Math.Between(baseMin, baseMax);
            this.spawnTimer = time + delay;
        }
    }

    spawnEnemy(type) {
        const width = this.cameras.main.width;
        const x = Phaser.Math.Between(50, width - 50);
        const y = -40; // Spawn just offscreen top

        let enemy;
        if (type === 'scout') {
            enemy = this.enemies.create(x, y, 'enemy_scout');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(180); // Fast flyer

            enemy.hp = 1;
            enemy.enemyType = 'scout';
            enemy.fireTimer = this.time.now + Phaser.Math.Between(1000, 3000);

            enemy.setDisplaySize(80, 80);
            enemy.setAngle(180);
            enemy.body.setSize(28, 28);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0x00ffaa, 2); // Cyan-green glow
        } else if (type === 'fighter') {
            enemy = this.enemies.create(x, y, 'enemy_fighter');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(130);

            enemy.hp = 2;
            enemy.enemyType = 'fighter';
            enemy.fireTimer = this.time.now + Phaser.Math.Between(800, 2500);
            enemy.spawnTime = this.time.now + x;

            enemy.setDisplaySize(80, 80);
            enemy.setAngle(180);
            enemy.body.setSize(32, 32);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0x00ffff, 2); // Cyber cyan glow
        } else if (type === 'bomber') {
            enemy = this.enemies.create(x, y, 'enemy_bomber');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(90); // Slow heavy bomber

            enemy.hp = 3;
            enemy.enemyType = 'bomber';
            enemy.fireTimer = this.time.now + Phaser.Math.Between(1500, 3500);

            enemy.setDisplaySize(80, 80);
            enemy.setAngle(180);
            enemy.body.setSize(36, 36);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0xffaa00, 2); // Orange glow
        } else if (type === 'support') {
            enemy = this.enemies.create(x, y, 'enemy_support');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(100);

            enemy.hp = 2;
            enemy.enemyType = 'support';
            enemy.hasShield = true; // Support ship has an active energy shield!
            enemy.fireTimer = this.time.now + Phaser.Math.Between(1500, 3000);

            enemy.setDisplaySize(80, 80);
            enemy.setAngle(180);
            enemy.body.setSize(34, 34);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0x00ff66, 2); // Healing green glow
        } else if (type === 'torpedo') {
            enemy = this.enemies.create(x, y, 'enemy_torpedo');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(120);

            enemy.hp = 2;
            enemy.enemyType = 'torpedo';
            enemy.fireTimer = this.time.now + Phaser.Math.Between(1200, 2800);

            enemy.setDisplaySize(80, 80);
            enemy.setAngle(180);
            enemy.body.setSize(34, 34);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0xff0055, 2); // Red glow
        } else if (type === 'battlecruiser') {
            enemy = this.enemies.create(x, y, 'enemy_battlecruiser');
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(75); // Slow elite cruiser

            enemy.hp = 6 + this.wave * 2;
            enemy.enemyType = 'battlecruiser';
            enemy.fireTimer = this.time.now + Phaser.Math.Between(1000, 2500);

            enemy.setDisplaySize(50, 50);
            enemy.setAngle(180);
            enemy.body.setSize(44, 44);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(0xff00ff, 3); // Elite magenta glow
        } else if (type === 'boss') {
            // Spawn Ultimate Dreadnought/Battlecruiser Boss in horizontal center
            const texture = this.wave >= 2 ? 'enemy_boss_battlecruiser' : 'enemy_boss';
            enemy = this.enemies.create(width / 2, y - 50, texture);
            this.physics.world.enable(enemy);
            enemy.body.setVelocityY(60); // creeps down slowly

            enemy.hp = 25 + this.wave * 10; // Epic scaling boss health
            enemy.maxHp = enemy.hp;
            enemy.enemyType = 'boss';
            enemy.fireTimer = this.time.now + 2000;

            enemy.setDisplaySize(110, 110);
            enemy.setAngle(180);
            enemy.body.setSize(96, 96);

            enemy.enableFilters();
            enemy.filters.internal.addGlow(this.wave >= 2 ? 0xff00ff : 0xff0033, 4); // Purple for battlecruiser, red for dreadnought

            // Display glowing Boss Health HUD
            this.showBossHUD(enemy.maxHp);
        }

        enemy.setDepth(2);
    }

    handleEnemyAI(time) {
        const height = this.cameras.main.height;

        this.enemies.getChildren().forEach((enemy) => {
            // Out of bounds checker - despawn if slips past player bottom
            if (enemy.y > height + 40) {
                // If it's the dreadnought boss flagship, hide the health bar overlay
                if (enemy.enemyType === 'boss') {
                    this.hideBossHUD();
                    this.travelProgress = 0;
                    this.bossSpawned = false;
                }
                enemy.destroy();
                return;
            }

            // 1. Scout AI: Swift standard descent
            if (enemy.enemyType === 'scout') {
                // simple swift descent
            }

            // 2. Fighter AI: Smooth sine zig-zag flight paths
            else if (enemy.enemyType === 'fighter') {
                const phase = (time - enemy.spawnTime) / 140;
                enemy.body.setVelocityX(Math.sin(phase) * 150);
            }

            // 3. Bomber AI: Slow flight speed with micro-glides
            else if (enemy.enemyType === 'bomber') {
                enemy.body.setVelocityX(Math.sin(time / 1000) * 35);
            }

            // 4. Support AI: Gently sweeps left/right tracking player coordinates
            else if (enemy.enemyType === 'support') {
                const dx = this.player.x - enemy.x;
                enemy.body.setVelocityX(Math.sign(dx) * 45);
            }

            // 5. Torpedo AI: Hyper swift straight flyer (no horizontal deviation)

            // 6. Battlecruiser AI: Slow elite cruiser entering to Y=120 and hovering back/forth
            else if (enemy.enemyType === 'battlecruiser') {
                if (enemy.y >= 120 && enemy.body.velocity.y > 0) {
                    enemy.body.setVelocityY(0);
                }
                if (enemy.body.velocity.y === 0) {
                    enemy.body.setVelocityX(Math.sin(time / 800) * 55);
                }
            }

            // 7. Dreadnought Boss AI: Stays locked gracefully at the back (Y=110), bobbing and tracking player X
            else if (enemy.enemyType === 'boss') {
                if (enemy.y >= 110 && enemy.body.velocity.y > 0) {
                    enemy.body.setVelocityY(0);
                }
                if (enemy.body.velocity.y === 0) {
                    // Staying at the back with subtle hover bobbing
                    enemy.y = 110 + Math.sin(time / 450) * 8;

                    // Track player horizontally to stay in visual focus
                    const dx = this.player.x - enemy.x;
                    enemy.body.setVelocityX(Math.sign(dx) * Math.min(Math.abs(dx) * 2.5, 90 + this.wave * 10));
                }
            }

            // --- AUTOMATED ATTACK ROTATIONS ---
            if (enemy.enemyType === 'scout' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x, enemy.y + 16, 0, 300, 0x00ff66, 1.0, 'enemy_laser_green');
                enemy.fireTimer = time + Phaser.Math.Between(1800, 3200);
            } else if (enemy.enemyType === 'fighter' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x - 8, enemy.y + 16, 0, 320, 0x00ffff, 1.0, 'enemy_laser_cyan');
                this.fireEnemyLaser(enemy.x + 8, enemy.y + 16, 0, 320, 0x00ffff, 1.0, 'enemy_laser_cyan');
                enemy.fireTimer = time + Phaser.Math.Between(1500, 2800);
            } else if (enemy.enemyType === 'bomber' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x, enemy.y + 20, 0, 220, 0xffaa00, 1.8, 'enemy_laser_orange'); // heavy slow atomic plasma laser
                enemy.fireTimer = time + Phaser.Math.Between(2200, 3800);
            } else if (enemy.enemyType === 'support' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x, enemy.y + 16, 0, 260, 0x00ff66, 1.0, 'enemy_laser_green'); // support laser
                enemy.fireTimer = time + Phaser.Math.Between(2000, 3500);
            } else if (enemy.enemyType === 'torpedo' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x, enemy.y + 16, 0, 480, 0xff0033, 1.3, 'enemy_laser_red'); // fast red laser
                enemy.fireTimer = time + Phaser.Math.Between(2500, 4200);
            } else if (enemy.enemyType === 'battlecruiser' && time > enemy.fireTimer) {
                this.fireEnemyLaser(enemy.x, enemy.y + 24, 0, 260, 0xff00ff, 1.5, 'enemy_laser_magenta');
                this.fireEnemyLaser(enemy.x - 12, enemy.y + 16, -80, 240, 0xff00ff, 1.2, 'enemy_laser_magenta');
                this.fireEnemyLaser(enemy.x + 12, enemy.y + 16, 80, 240, 0xff00ff, 1.2, 'enemy_laser_magenta');
                enemy.fireTimer = time + Phaser.Math.Between(1400, 2500);
            } else if (enemy.enemyType === 'boss' && time > enemy.fireTimer) {
                if (!enemy.attackPhase) enemy.attackPhase = 0;
                enemy.attackPhase = (enemy.attackPhase + 1) % 3;

                if (enemy.attackPhase === 0) {
                    // 5-way spread of beautiful animated plasma energy rays
                    for (let i = -2; i <= 2; i++) {
                        this.fireEnemyLaser(enemy.x, enemy.y + 45, i * 70, 240, 0xff0033, 1.3, 'enemy_projectile_ray');
                    }
                } else if (enemy.attackPhase === 1) {
                    // Homing/Targeted rapid animated rocket bursts
                    let delay = 0;
                    for (let i = 0; i < 3; i++) {
                        this.time.delayedCall(delay, () => {
                            if (enemy.active && this.player.active) {
                                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                                const vx = Math.cos(angle) * 350;
                                const vy = Math.sin(angle) * 350;
                                this.fireEnemyLaser(enemy.x, enemy.y + 45, vx, vy, 0xff0055, 1.2, 'enemy_projectile_rocket');
                            }
                        });
                        delay += 250;
                    }
                } else {
                    // Circular burst of 8 radial animated wave capsules
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                        const vx = Math.cos(angle) * 200;
                        const vy = Math.sin(angle) * 200;
                        this.fireEnemyLaser(enemy.x, enemy.y + 45, vx, vy, 0xffaa00, 0.8, 'enemy_projectile_wave');
                    }
                }

                const cooldown = Math.max(1600 - this.wave * 100, 1000);
                enemy.fireTimer = time + cooldown;
            }
        });
    }

    fireEnemyLaser(x, y, vx, vy, color = 0xff00ff, scale = 1.0, textureKey = 'enemy_laser') {
        const laser = this.enemyLasers.get(x, y, textureKey);
        if (laser) {
            laser.setTexture(textureKey);
            laser.setActive(true).setVisible(true);
            this.physics.world.enable(laser);
            laser.body.setVelocity(vx, vy);

            // Play animation if it exists, otherwise stop animation and set to frame 0
            if (laser.anims) {
                const animKey = textureKey + '_anim';
                if (this.anims.exists(animKey)) {
                    laser.play(animKey);
                } else {
                    laser.anims.stop();
                    laser.setFrame(0);
                }
            }

            // Rotate projectile dynamically to match its velocity direction!
            // Nautolan projectile assets naturally face upwards (0 degrees in Phaser)
            const angleRad = Math.atan2(vy, vx);
            laser.setRotation(angleRad + Math.PI / 2);

            // Determine appropriate dimensions based on the projectile type to avoid squishing
            let w = 8, h = 16;
            if (textureKey === 'enemy_projectile_bullet') { w = 12; h = 12; }
            else if (textureKey === 'enemy_projectile_bomb') { w = 16; h = 16; }
            else if (textureKey === 'enemy_projectile_ray') { w = 24; h = 38; }
            else if (textureKey === 'enemy_projectile_rocket') { w = 32; h = 32; }
            else if (textureKey === 'enemy_projectile_spin') { w = 8; h = 8; }
            else if (textureKey === 'enemy_projectile_wave') { w = 64; h = 64; }

            laser.setDisplaySize(w * scale, h * scale);
            laser.body.setSize(w, h);

            laser.enableFilters();
            laser.filters.internal.addGlow(color, 2);
        }
    }

    cleanOffscreenLasers() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Remove player lasers out top/bottom/sides of screen
        this.playerLasers.getChildren().forEach((laser) => {
            if (laser.y < -40 || laser.y > height + 40 || laser.x < -40 || laser.x > width + 40) {
                laser.destroy();
            }
        });

        // Remove enemy lasers out top/bottom/sides of screen
        this.enemyLasers.getChildren().forEach((laser) => {
            if (laser.y < -40 || laser.y > height + 40 || laser.x < -40 || laser.x > width + 40) {
                laser.destroy();
            }
        });
    }

    // --- COLLISION HANDLERS ---

    hitEnemy(laser, enemy) {
        laser.destroy(); // Remove laser bullet

        // Support ship energy shield absorption
        if (enemy.enemyType === 'support' && enemy.hasShield) {
            enemy.hasShield = false;
            // Pop shield sound & green ring explosion
            SoundEffects.playPowerup();
            this.createExplosion(enemy.x, enemy.y, 0x00ff66);
            return;
        }

        // Reduce hitpoints
        enemy.hp--;

        // Update Boss Health Bar if it hits Dreadnought boss flagship
        if (enemy.enemyType === 'boss') {
            this.updateBossHUD(enemy.hp, enemy.maxHp);
        }

        if (enemy.hp <= 0) {
            // Enemy vanquished!
            SoundEffects.playExplosion();

            // Neon spark explosion color based on enemy type
            let explosionColor = 0xff00ff; // Basic Magenta
            let points = 100;

            if (enemy.enemyType === 'scout') {
                explosionColor = 0x00ffaa;
                points = 100;
            } else if (enemy.enemyType === 'fighter') {
                explosionColor = 0x00ffff;
                points = 150;
            } else if (enemy.enemyType === 'bomber') {
                explosionColor = 0xffaa00;
                points = 250;
            } else if (enemy.enemyType === 'support') {
                explosionColor = 0x00ff66;
                points = 200;
            } else if (enemy.enemyType === 'torpedo') {
                explosionColor = 0xff0055;
                points = 200;
            } else if (enemy.enemyType === 'battlecruiser') {
                explosionColor = 0xff00ff;
                points = 500;
            } else if (enemy.enemyType === 'boss') {
                explosionColor = 0xff0033;
                points = 2500 + this.wave * 500;
                this.hideBossHUD();

                // Reset warp progress & advance wave!
                this.travelProgress = 0;
                this.bossSpawned = false;

                this.cameras.main.flash(600, 255, 255, 255);
                this.cameras.main.shake(800, 0.05);

                this.time.delayedCall(1500, () => {
                    this.startWave(this.wave + 1);
                });
            }

            this.createExplosion(enemy.x, enemy.y, explosionColor);

            // Spawn power-ups on kill
            if (enemy.enemyType === 'boss') {
                // Boss guarantees quadruple legendary power-ups!
                this.spawnPowerup(enemy.x - 50, enemy.y, 'powerup_shield');
                this.spawnPowerup(enemy.x - 15, enemy.y, 'powerup_triple');
                this.spawnPowerup(enemy.x + 15, enemy.y, 'powerup_repair');
                this.spawnPowerup(enemy.x + 50, enemy.y, 'powerup_speed');
            } else if (enemy.enemyType === 'battlecruiser') {
                // Battlecruiser guaranteed drop
                this.spawnPowerup(enemy.x, enemy.y);
            } else if (Math.random() < 0.18) {
                this.spawnPowerup(enemy.x, enemy.y);
            }

            enemy.destroy();
            this.score += points;
            this.drawHUD();
        } else {
            // Hit impact spark visual
            this.createExplosion(laser.x, laser.y, 0xffffff);

            // Flashes the enemy outline white momentarily
            this.tweens.add({
                targets: enemy,
                alpha: 0.3,
                duration: 50,
                yoyo: true,
                repeat: 1
            });
        }
    }

    hitPlayer(player, laser) {
        laser.destroy();

        if (this.isInvincible || this.gameOver) return;

        if (this.shieldActive) {
            // Shield bubble absorbs damage!
            this.deactivateShield();
            SoundEffects.playPowerup();

            // Add flash
            this.createExplosion(player.x, player.y - 10, 0x39ff14);
            return;
        }

        // Damage shields/lives
        this.lives--;
        this.drawHUD();

        // Update modular custom player ship damage state texture in real-time
        if (this.player && this.player.active) {
            this.player.setTexture('player_ship_' + Math.max(0, this.lives));
        }

        SoundEffects.playHurt();
        this.cameras.main.shake(200, 0.025); // Premium impact shake
        this.createExplosion(player.x, player.y, 0x00ffff);

        if (this.lives <= 0) {
            this.triggerPlayerDeath();
        } else {
            this.makeInvincible();
        }
    }

    crashPlayer(player, enemy) {
        if (this.isInvincible || this.gameOver) return;

        // Instantly obliterate enemy
        SoundEffects.playExplosion();
        this.createExplosion(enemy.x, enemy.y, 0xff00ff);

        // Update boss health bar if boss was crashed (kamikaze)
        if (enemy.enemyType === 'boss') {
            this.hideBossHUD();
            this.travelProgress = 0;
            this.bossSpawned = false;
            this.time.delayedCall(1200, () => {
                this.startWave(this.wave + 1);
            });
        }

        enemy.destroy();

        if (this.shieldActive) {
            // Shield bubble absorbs direct crash and pops!
            this.deactivateShield();
            SoundEffects.playPowerup();
            return;
        }

        // Direct ship crash damage
        this.lives--;
        this.drawHUD();

        // Update modular custom player ship damage state texture in real-time
        if (this.player && this.player.active) {
            this.player.setTexture('player_ship_' + Math.max(0, this.lives));
        }

        SoundEffects.playHurt();
        this.cameras.main.shake(300, 0.035);
        this.createExplosion(player.x, player.y, 0x00ffff);

        if (this.lives <= 0) {
            this.triggerPlayerDeath();
        } else {
            this.makeInvincible();
        }
    }

    makeInvincible() {
        this.isInvincible = true;

        this.tweens.add({
            targets: this.player,
            alpha: 0.15,
            duration: 80,
            yoyo: true,
            repeat: 12,
            onComplete: () => {
                this.player.alpha = 1.0;
                this.isInvincible = false;
            }
        });
    }

    triggerPlayerDeath() {
        this.gameOver = true;
        this.player.setVisible(false);
        this.thrusterParticles.stop();
        this.shieldBubble.setVisible(false);

        // Huge final neon blue explosion
        SoundEffects.playExplosion();
        this.createExplosion(this.player.x, this.player.y, 0x00ffff);
        this.createExplosion(this.player.x - 15, this.player.y + 10, 0xff00ff);
        this.createExplosion(this.player.x + 15, this.player.y - 10, 0xffffff);

        // Darken screen
        this.cameras.main.fade(1200, 5, 5, 12, false, (camera, progress) => {
            if (progress >= 1.0) {
                this.scene.start('GameOverScene', { score: this.score, wave: this.wave });
            }
        });
    }

    // --- POWERUP ENGINE ---

    spawnPowerup(x, y, forcedType = null) {
        const types = [
            'powerup_shield',
            'powerup_fire',
            'powerup_triple',
            'powerup_repair',
            'powerup_nuke',
            'powerup_speed'
        ];

        const type = forcedType || Phaser.Math.RND.pick(types);
        const powerup = this.powerups.create(x, y, type);

        this.physics.world.enable(powerup);
        powerup.body.setVelocityY(90); // Drifts down gently

        powerup.enableFilters();

        let color = 0x00ffaa;
        if (type === 'powerup_shield') color = 0x00ff66;
        else if (type === 'powerup_fire') color = 0xffff00;
        else if (type === 'powerup_triple') color = 0x00ffff;
        else if (type === 'powerup_repair') color = 0xff0055;
        else if (type === 'powerup_nuke') color = 0xffaa00;
        else if (type === 'powerup_speed') color = 0xff5500;

        powerup.filters.internal.addGlow(color, 2);
        powerup.powerupType = type;

        // Slow hover oscillation animation
        this.tweens.add({
            targets: powerup,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collectPowerup(player, powerup) {
        const type = powerup.powerupType;
        powerup.destroy();

        SoundEffects.playPowerup();
        this.score += 250;
        this.drawHUD();

        // Overlay glowing trigger flash
        this.cameras.main.flash(200, 255, 255, 255, true);

        if (type === 'powerup_shield') {
            this.activateShield();
        } else if (type === 'powerup_fire') {
            this.activateRapidFire();
        } else if (type === 'powerup_triple') {
            this.activateTriple();
        } else if (type === 'powerup_repair') {
            // Repair one health point battery (max 3)
            this.lives = Math.min(3, this.lives + 1);
            this.drawHUD();
            if (this.player && this.player.active) {
                this.player.setTexture('player_ship_' + Math.max(0, this.lives));
            }
            this.createExplosion(player.x, player.y, 0x00ffaa);
        } else if (type === 'powerup_nuke') {
            // Screen Nuke! Absolute atomic clearance
            this.cameras.main.flash(400, 255, 170, 0);
            this.cameras.main.shake(500, 0.04);
            SoundEffects.playExplosion();

            // Destroy all active small enemies, deal 15 damage to Bosses
            this.enemies.getChildren().forEach((e) => {
                if (e.enemyType !== 'boss') {
                    this.time.delayedCall(Phaser.Math.Between(0, 300), () => {
                        if (e.active) {
                            this.createExplosion(e.x, e.y, 0xffaa00);
                            this.score += 100;
                            e.destroy();
                            this.drawHUD();
                        }
                    });
                } else {
                    e.hp = Math.max(1, e.hp - 15);
                    this.updateBossHUD(e.hp, e.maxHp);
                    this.createExplosion(e.x, e.y, 0xff0033);
                }
            });
        } else if (type === 'powerup_speed') {
            this.activateSpeed();
        }
    }

    activateShield() {
        this.shieldActive = true;
        this.shieldTime = this.time.now + 10000; // Shields hold up to 10 seconds
        this.thrusterParticles.setParticleTint(0x39ff14); // neon shield green
    }

    deactivateShield() {
        this.shieldActive = false;
        this.shieldBubble.setVisible(false);
        this.thrusterParticles.setParticleTint(this.speedActive ? 0xff5500 : 0x00ffff);
    }

    activateRapidFire() {
        this.rapidActive = true;
        this.rapidTime = this.time.now + 8000; // Double fire-rate rapid mode holds for 8s
        this.playerGlow.color = 0xffff00; // glowing weapon yellow
    }

    deactivateRapidFire() {
        this.rapidActive = false;
        if (!this.tripleActive && !this.speedActive) {
            this.playerGlow.color = 0x00ffff; // Restore standard cyan glow
        } else if (this.tripleActive) {
            this.playerGlow.color = 0x00ffaa;
        } else if (this.speedActive) {
            this.playerGlow.color = 0xff5500;
        }
    }

    activateTriple() {
        this.tripleActive = true;
        this.tripleTime = this.time.now + 8000; // Triple shot active for 8s
        this.playerGlow.color = 0x00ffaa; // vibrant cyber-green glow
    }

    deactivateTriple() {
        this.tripleActive = false;
        if (!this.rapidActive && !this.speedActive) {
            this.playerGlow.color = 0x00ffff;
        } else if (this.rapidActive) {
            this.playerGlow.color = 0xffff00;
        } else if (this.speedActive) {
            this.playerGlow.color = 0xff5500;
        }
    }

    activateSpeed() {
        this.speedActive = true;
        this.speedTime = this.time.now + 8000; // Speed Boost active for 8s
        this.thrusterParticles.setParticleTint(0xff5500); // fiery speed orange/red trail
        this.playerGlow.color = 0xff5500;
    }

    deactivateSpeed() {
        this.speedActive = false;
        this.thrusterParticles.setParticleTint(this.shieldActive ? 0x39ff14 : 0x00ffff);
        if (!this.rapidActive && !this.tripleActive) {
            this.playerGlow.color = 0x00ffff;
        } else if (this.rapidActive) {
            this.playerGlow.color = 0xffff00;
        } else if (this.tripleActive) {
            this.playerGlow.color = 0x00ffaa;
        }
    }

    updateTravelProgress() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        if (this.travelProgress > 100) this.travelProgress = 100;

        // Update travel progress dashboard text
        if (this.travelProgress < 100) {
            this.progressText.setText(`SECTOR WARP PROGRESS: ${Math.floor(this.travelProgress)}%`);
            this.progressText.setFill('#00ffaa');
            this.progressText.setAlpha(1.0);
        } else {
            this.progressText.setText(`// BOSS FLAGSHIP IMMINENT //`);
            this.progressText.setFill('#ff0055');
            // Flash color alert in boss phase
            if (Math.floor(this.time.now / 200) % 2 === 0) {
                this.progressText.setAlpha(0.3);
            } else {
                this.progressText.setAlpha(1.0);
            }
        }

        // Draw warp progress bar inside bottom dashboard layout
        this.progressHUDGraphics.clear();
        this.progressHUDGraphics.lineStyle(1.5, this.travelProgress < 100 ? 0x00ffaa : 0xff0055, 0.4);
        this.progressHUDGraphics.fillStyle(0x050510, 0.6);
        this.progressHUDGraphics.strokeRoundedRect(width / 2 - 120, height - 28, 240, 8, 2);
        this.progressHUDGraphics.fillRoundedRect(width / 2 - 120, height - 28, 240, 8, 2);

        this.progressHUDGraphics.fillStyle(this.travelProgress < 100 ? 0x00ffaa : 0xff0055, 0.85);
        this.progressHUDGraphics.fillRoundedRect(width / 2 - 118, height - 26, 236 * (this.travelProgress / 100), 4, 1);
    }

    // --- HUD HELPERS ---

    drawHUD() {
        this.scoreText.setText(`SCORE: ${String(this.score).padStart(6, '0')}`);
        this.waveText.setText(`WAVE: ${String(this.wave).padStart(2, '0')}`);

        // Redraw lives visual battery blocks
        this.hudLivesGraphics.clear();
        for (let i = 0; i < 3; i++) {
            // Draw battery frames
            this.hudLivesGraphics.lineStyle(1.5, 0x00ffff, 0.3);
            this.hudLivesGraphics.strokeRect(20 + i * 26, 62, 20, 10);

            // Draw filled batteries if lives hold
            if (i < this.lives) {
                this.hudLivesGraphics.fillStyle(0x00ffff, 0.85);
                this.hudLivesGraphics.fillRect(22 + i * 26, 64, 16, 6);
            }
        }
    }

    showBossHUD(maxHp) {
        this.bossHealthBarContainer.setVisible(true);
        this.bossHealthBarFill.setVisible(true);
        this.bossHealthBarText.setVisible(true);

        this.updateBossHUD(maxHp, maxHp);
    }

    updateBossHUD(hp, maxHp) {
        const width = this.cameras.main.width;
        const progress = Math.max(hp / maxHp, 0);

        this.bossHealthBarContainer.clear();
        this.bossHealthBarContainer.lineStyle(2, 0xff0055, 0.4);
        this.bossHealthBarContainer.fillStyle(0x050510, 0.7);
        this.bossHealthBarContainer.strokeRoundedRect(width / 2 - 200, 18, 400, 14, 4);
        this.bossHealthBarContainer.fillRoundedRect(width / 2 - 200, 18, 400, 14, 4);

        this.bossHealthBarFill.clear();
        if (progress > 0) {
            this.bossHealthBarFill.fillStyle(0xff0055, 0.8);
            this.bossHealthBarFill.fillRoundedRect(width / 2 - 197, 21, 394 * progress, 8, 2);
        }
    }

    hideBossHUD() {
        this.bossHealthBarContainer.setVisible(false);
        this.bossHealthBarFill.setVisible(false);
        this.bossHealthBarText.setVisible(false);
    }

    createExplosion(x, y, color) {
        const explosion = this.add.particles(x, y, 'spark', {
            speed: { min: 30, max: 280 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: { min: 300, max: 700 },
            color: [color, 0xffffff, 0x05050f],
            emitting: false
        });

        explosion.explode(22);

        // Auto-cleanup emitter object from graphics stack
        this.time.delayedCall(800, () => {
            explosion.destroy();
        });
    }
}

export default GameScene;
