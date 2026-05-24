import Phaser from 'phaser';
import SoundEffects from '../utils/SoundEffects.js';

class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // 0. Background Music Management
        if (!this.sound.get('bg_music')) {
            this.bgMusic = this.sound.add('bg_music', { volume: 0.5, loop: true });
            this.bgMusic.play();
        } else if (!this.sound.get('bg_music').isPlaying) {
            this.sound.get('bg_music').play();
        }

        // 1. Setup slowly scrolling starfield background tile sprite
        this.background = this.add.tileSprite(512, 384, 1024, 768, 'star_bg');
        this.background.setScrollFactor(0);

        // 2. Add floating neon green ambient particles in the background
        this.ambientParticles = this.add.particles(512, 0, 'spark', {
            x: { min: 0, max: 1024 },
            velocityY: { min: 30, max: 80 },
            lifespan: 12000,
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.1, end: 0.5 },
            color: [0x39ff14, 0x00ffff, 0x050510], // Fade from neon green to cyan to dark
            quantity: 1,
            frequency: 100
        });

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 3. Cyberpunk neon grid decoration line in the middle
        const decorativeGrid = this.add.graphics();
        decorativeGrid.lineStyle(1, 0xff00ff, 0.2);
        decorativeGrid.lineBetween(0, height / 2 - 120, width, height / 2 - 120);
        decorativeGrid.lineBetween(0, height / 2 + 180, width, height / 2 + 180);


        // 5. Game Title (Styled with vector shadow glow for absolute stability)
        const titleText = this.add.text(width / 2, height / 2 - 40, 'CYBER SHIELD', {
            fontFamily: 'Orbitron',
            fontSize: '56px',
            fontWeight: '900',
            fill: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 2,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#00ffff',
                blur: 16,
                stroke: true,
                fill: true
            },
            letterSpacing: 8
        }).setOrigin(0.5);

        // Neon pulsing shadow glow using Phaser's dynamic text update loop
        this.tweens.add({
            targets: titleText.style,
            shadowBlur: 28,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => { titleText.updateText(); }
        });

        // 6. Subtitle (Styled with vector magenta glow)
        const subtitleText = this.add.text(width / 2, height / 2 + 30, 'TACTICAL VECTOR DEFENDER', {
            fontFamily: 'Orbitron',
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#ff00ff',
            strokeThickness: 1.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff00ff',
                blur: 10,
                stroke: true,
                fill: true
            },
            letterSpacing: 6
        }).setOrigin(0.5);

        // 7. Interactive Start Button
        const startBtn = this.add.text(width / 2, height / 2 + 140, '// START DEPLOYMENT //', {
            fontFamily: 'Orbitron',
            fontSize: '22px',
            fill: '#00ffff',
            fontWeight: '700',
            stroke: '#00ffff',
            strokeThickness: 0.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#00ffff',
                blur: 0,
                stroke: true,
                fill: true
            },
            letterSpacing: 3,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();

        // Button hover events
        startBtn.on('pointerover', () => {
            SoundEffects.playMenuClick();
            startBtn.setFill('#ff00ff');
            startBtn.setStroke('#ff00ff', 0.5);
            startBtn.setShadow(0, 0, '#ff00ff', 12, true, true);
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 150,
                ease: 'Back.easeOut'
            });
        });

        startBtn.on('pointerout', () => {
            startBtn.setFill('#00ffff');
            startBtn.setStroke('#00ffff', 0.5);
            startBtn.setShadow(0, 0, '#00ffff', 0, true, true);
            this.tweens.add({
                targets: startBtn,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 150,
                ease: 'Power1'
            });
        });

        // Click event - Flash screen and launch game!
        startBtn.on('pointerdown', () => {
            SoundEffects.playLaser();
            
            // Screen flash effect
            this.cameras.main.flash(300, 0, 255, 255);
            
            this.tweens.add({
                targets: [titleText, subtitleText, startBtn],
                alpha: 0,
                scaleY: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        });

        // 8. High Score Readout
        const highScoreVal = localStorage.getItem('cyberShield_highScore') || '0';
        this.add.text(width / 2, height - 60, `HIGH SCORE: ${highScoreVal.padStart(6, '0')}`, {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            fill: '#ffffff',
            alpha: 0.6,
            stroke: '#ffffff',
            strokeThickness: 0.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ffffff',
                blur: 6,
                stroke: true,
                fill: true
            },
            letterSpacing: 2
        }).setOrigin(0.5);

        // 8.5 Developer Name
        this.add.text(100, height - 100, 'Developer: Patrick Jake T. Biña', {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            fill: '#bd1616',
            alpha: 0.5
        }).setOrigin(0, 1);

        // 9. Floating player ship display drawing in the corner
        const decoShip = this.add.image(width / 2, height / 2 - 200, 'player_ship')
            .setScale(2)
            .setAlpha(0.7)
            .setAngle(0); // pointing UP aligned with flight scrolling
            
        decoShip.enableFilters();
        decoShip.filters.internal.addGlow(0x00ffff, 4);

        // Hover ship anim
        this.tweens.add({
            targets: decoShip,
            y: height / 2 - 215,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update() {
        // Scroll the starfield slowly for a dynamic parallax look
        this.background.tilePositionY -= 0.5;
        this.background.tilePositionX -= 0.15;
    }
}

export default MenuScene;
