import Phaser from 'phaser';
import SoundEffects from '../utils/SoundEffects.js';

class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Set background color
        this.cameras.main.setBackgroundColor('#05050c');

        // Create a beautiful cyberpunk glowing title text while loading
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const titleText = this.add.text(width / 2, height / 2 - 50, 'INITIALIZING SYSTEMS', {
            fontFamily: 'Orbitron',
            fontSize: '32px',
            color: '#00ffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Add a neon pulsing glow effect to the text using tweens
        this.tweens.add({
            targets: titleText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Simple progress bar outline
        const progressBg = this.add.graphics();
        progressBg.lineStyle(2, 0xff00ff, 0.4);
        progressBg.strokeRoundedRect(width / 2 - 160, height / 2 + 20, 320, 16, 8);

        const progressBar = this.add.graphics();

        // Simulate progress loading while we generate procedural assets
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.1;
            if (progress >= 1.0) {
                progress = 1.0;
                clearInterval(interval);
            }

            progressBar.clear();
            progressBar.fillStyle(0x00ffff, 0.8);
            progressBar.fillRoundedRect(width / 2 - 156, height / 2 + 24, 312 * progress, 8, 4);
        }, 80);

        // Add Developer Name in lower left
        this.add.text(20, height - 20, 'Developer: Patrick Jake T. Biña', {
            fontFamily: 'Orbitron',
            fontSize: '12px',
            fill: '#982f2f',
            alpha: 0.5,

        }).setOrigin(0, 1);

        // Load custom modular ship assets
        this.load.image('ship_base_full', 'assets/ship/base_full.png');
        this.load.image('ship_base_slight', 'assets/ship/base_slight.png');
        this.load.image('ship_base_damaged', 'assets/ship/base_damaged.png');
        this.load.image('ship_base_very_damaged', 'assets/ship/base_very_damaged.png');
        this.load.image('ship_engines', 'assets/ship/engines.png');
        this.load.image('ship_engine_thrust', 'assets/ship/engine_thrust.png');
        this.load.image('ship_weapons', 'assets/ship/weapons.png');
        this.load.image('ship_shield', 'assets/ship/shield.png');

        // Load custom enemy ships directly mapped to game keys
        this.load.image('enemy_scout', 'assets/enemy/scout.png');
        this.load.image('enemy_fighter', 'assets/enemy/fighter.png');
        this.load.image('enemy_bomber', 'assets/enemy/bomber.png');
        this.load.image('enemy_support', 'assets/enemy/support.png');
        this.load.image('enemy_torpedo', 'assets/enemy/torpedo.png');
        this.load.image('enemy_battlecruiser', 'assets/enemy/battlecruiser.png');
        this.load.image('enemy_boss', 'assets/enemy/boss.png');
        this.load.image('enemy_boss_battlecruiser', 'assets/enemy/boss_battlecruiser.png');

        // Load high-quality enemy and boss projectiles as sliceable spritesheets
        this.load.spritesheet('enemy_projectile_bullet', 'assets/projectiles/Nautolan - Bullet.png', { frameWidth: 12, frameHeight: 12 });
        this.load.spritesheet('enemy_projectile_bomb', 'assets/projectiles/Nautolan - Bomb.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('enemy_projectile_ray', 'assets/projectiles/Nautolan - Ray.png', { frameWidth: 24, frameHeight: 38 });
        this.load.spritesheet('enemy_projectile_rocket', 'assets/projectiles/Nautolan - Rocket.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('enemy_projectile_spin', 'assets/projectiles/Nautolan - Spinning Bullet.png', { frameWidth: 8, frameHeight: 8 });
        this.load.spritesheet('enemy_projectile_wave', 'assets/projectiles/Nautolan - Wave.png', { frameWidth: 64, frameHeight: 64 });

        // Initialize sound synthesizers
        SoundEffects.init();
    }

    create() {
        // Procedurally draw and register all textures in memory!
        this.createProceduralTextures();

        // Register animations for Nautolan high-quality enemy projectiles
        const animConfigs = [
            { key: 'enemy_projectile_bullet', frames: 6, rate: 12 },
            { key: 'enemy_projectile_bomb', frames: 16, rate: 16 },
            { key: 'enemy_projectile_ray', frames: 3, rate: 8 },
            { key: 'enemy_projectile_rocket', frames: 3, rate: 8 },
            { key: 'enemy_projectile_spin', frames: 8, rate: 16 },
            { key: 'enemy_projectile_wave', frames: 6, rate: 12 }
        ];

        animConfigs.forEach(cfg => {
            this.anims.create({
                key: cfg.key + '_anim',
                frames: this.anims.generateFrameNumbers(cfg.key, { start: 0, end: cfg.frames - 1 }),
                frameRate: cfg.rate,
                repeat: -1
            });
        });

        // Delay slightly for the perfect retro loading feel, then boot menu!
        this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
        });
    }

    createProceduralTextures() {
        let g;

        // 1. Compose Custom Player Ship using Canvas (48x48)
        const damageStates = [
            { key: 'player_ship_3', baseKey: 'ship_base_full' },
            { key: 'player_ship_2', baseKey: 'ship_base_slight' },
            { key: 'player_ship_1', baseKey: 'ship_base_damaged' },
            { key: 'player_ship_0', baseKey: 'ship_base_very_damaged' }
        ];

        damageStates.forEach(state => {
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');

            const enginesImg = this.textures.get('ship_engines').getSourceImage();
            const baseImg = this.textures.get(state.baseKey).getSourceImage();
            const weaponsImg = this.textures.get('ship_weapons').getSourceImage();

            // Stack custom layers (engines at the bottom, then ship fuselage base, then front gun weapons)
            ctx.drawImage(enginesImg, 0, 0);
            ctx.drawImage(baseImg, 0, 0);
            ctx.drawImage(weaponsImg, 0, 0);

            // Register canvas texture in Phaser
            this.textures.addCanvas(state.key, canvas);
        });

        // Register default 'player_ship' alias (using full health state) for compatibility across all scenes
        const canvasFull = document.createElement('canvas');
        canvasFull.width = 48;
        canvasFull.height = 48;
        const ctxFull = canvasFull.getContext('2d');
        ctxFull.drawImage(this.textures.get('ship_engines').getSourceImage(), 0, 0);
        ctxFull.drawImage(this.textures.get('ship_base_full').getSourceImage(), 0, 0);
        ctxFull.drawImage(this.textures.get('ship_weapons').getSourceImage(), 0, 0);
        this.textures.addCanvas('player_ship', canvasFull);







        // 5. Cyan Player Laser (8x16)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x00ffff, 0.4);
        g.fillRect(0, 0, 8, 16);
        g.fillStyle(0xffffff, 1);
        g.fillRect(2, 2, 4, 12);
        g.generateTexture('player_laser', 8, 16);
        g.destroy();

        // 6. Colored Enemy Lasers (8x16 procedural graphics matches player laser)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xff00ff, 0.4);
        g.fillRect(0, 0, 8, 16);
        g.fillStyle(0xffffff, 1);
        g.fillRect(2, 2, 4, 12);
        g.generateTexture('enemy_laser', 8, 16);
        g.destroy();

        const laserColors = {
            'red': 0xff0033,
            'magenta': 0xff00ff,
            'cyan': 0x00ffff,
            'yellow': 0xffff00,
            'green': 0x00ff66,
            'orange': 0xffaa00
        };

        for (const [name, colorHex] of Object.entries(laserColors)) {
            g = this.make.graphics({ x: 0, y: 0, add: false });
            g.fillStyle(colorHex, 0.4);
            g.fillRect(0, 0, 8, 16);
            g.fillStyle(0xffffff, 1);
            g.fillRect(2, 2, 4, 12);
            g.generateTexture(`enemy_laser_${name}`, 8, 16);
            g.destroy();
        }

        // 7. Spark Particle (4x4)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture('spark', 4, 4);
        g.destroy();

        // 8. Shield Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0x00ff66, 1);
        g.fillStyle(0x002211, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        // Central '+' symbol
        g.fillStyle(0x00ff66, 1);
        g.fillRect(14, 8, 4, 16);
        g.fillRect(8, 14, 16, 4);
        g.generateTexture('powerup_shield', 32, 32);
        g.destroy();

        // 9. Fire-rate Rapid Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0xffff00, 1);
        g.fillStyle(0x222200, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        // Central lightning symbol
        g.fillStyle(0xffff00, 1);
        g.fillTriangle(18, 6, 24, 14, 18, 14);
        g.fillTriangle(14, 26, 8, 18, 14, 18);
        g.fillRect(13, 13, 6, 6);
        g.generateTexture('powerup_fire', 32, 32);
        g.destroy();

        // Triple Shot Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0x00ffff, 1);
        g.fillStyle(0x002222, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        g.fillStyle(0x00ffff, 1);
        g.fillRect(14, 8, 4, 16);
        g.fillRect(8, 10, 4, 12);
        g.fillRect(20, 10, 4, 12);
        g.generateTexture('powerup_triple', 32, 32);
        g.destroy();

        // Repair Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0xff0055, 1);
        g.fillStyle(0x220005, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        g.fillStyle(0xff0055, 1);
        // Draw heart shape
        g.fillCircle(12, 14, 4);
        g.fillCircle(20, 14, 4);
        g.fillTriangle(8, 15, 24, 15, 16, 24);
        g.generateTexture('powerup_repair', 32, 32);
        g.destroy();

        // Nuke Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0xffaa00, 1);
        g.fillStyle(0x221100, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        g.fillStyle(0xffaa00, 1);
        g.fillCircle(16, 16, 4);
        g.fillTriangle(16, 16, 10, 8, 22, 8);
        g.fillTriangle(16, 16, 10, 24, 22, 24);
        g.generateTexture('powerup_nuke', 32, 32);
        g.destroy();

        // Speed Power-up (32x32)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.lineStyle(2, 0xff5500, 1);
        g.fillStyle(0x220500, 0.8);
        g.fillCircle(16, 16, 14);
        g.strokeCircle(16, 16, 14);
        g.fillStyle(0xff5500, 1);
        // Chevron upwards ^
        g.fillTriangle(16, 6, 8, 14, 24, 14);
        g.fillStyle(0x220500, 1);
        g.fillTriangle(16, 10, 10, 15, 22, 15);
        g.fillStyle(0xff5500, 1);
        g.fillTriangle(16, 14, 8, 22, 24, 22);
        g.fillStyle(0x220500, 1);
        g.fillTriangle(16, 18, 10, 23, 22, 23);
        g.generateTexture('powerup_speed', 32, 32);
        g.destroy();

        // 10. Starfield Repeating Tileable Background (512x512)
        g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x050510, 1); // Dark background
        g.fillRect(0, 0, 512, 512);

        // Render 80 randomized stars with differing alphas, sizes, and colors
        for (let i = 0; i < 80; i++) {
            const x = Phaser.Math.Between(0, 512);
            const y = Phaser.Math.Between(0, 512);
            const size = Phaser.Math.Between(1, 3);
            const alpha = Phaser.Math.FloatBetween(0.2, 0.9);

            // Choose color: mostly white, some neon cyan, some neon magenta stars
            const colorRoll = Math.random();
            if (colorRoll > 0.85) {
                g.fillStyle(0x00ffff, alpha); // Cyan neon star
            } else if (colorRoll > 0.7) {
                g.fillStyle(0xff00ff, alpha); // Magenta star
            } else {
                g.fillStyle(0xffffff, alpha); // Classic white star
            }

            g.fillCircle(x, y, size);
        }
        g.generateTexture('star_bg', 512, 512);
        g.destroy();
    }
}

export default BootScene;
