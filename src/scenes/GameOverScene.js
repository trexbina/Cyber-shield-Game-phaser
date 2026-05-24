import Phaser from 'phaser';
import SoundEffects from '../utils/SoundEffects.js';

class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    init(data) {
        // Collect score and wave stats passed from GameScene
        this.finalScore = data.score || 0;
        this.finalWave = data.wave || 1;
        this.isNewHighScore = false;

        // Check and save High Score to localStorage
        const prevHighScore = parseInt(localStorage.getItem('cyberShield_highScore') || '0');
        if (this.finalScore > prevHighScore) {
            localStorage.setItem('cyberShield_highScore', String(this.finalScore));
            this.isNewHighScore = true;
        }
    }

    create() {
        // 1. Setup slowly scrolling starfield background
        this.background = this.add.tileSprite(512, 384, 1024, 768, 'star_bg');
        this.background.setScrollFactor(0);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;


        // 3. Glitching SYSTEM FAILURE Title (Vector glow shadow for absolute reliability)
        const failureTitle = this.add.text(width / 2, height / 2 - 70, 'SYSTEM FAILURE', {
            fontFamily: 'Orbitron',
            fontSize: '44px',
            fontWeight: '900',
            fill: '#ffffff',
            stroke: '#ff0055',
            strokeThickness: 2,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff0055',
                blur: 16,
                stroke: true,
                fill: true
            },
            letterSpacing: 6
        }).setOrigin(0.5);

        // Pulsing glow tween
        this.tweens.add({
            targets: failureTitle.style,
            shadowBlur: 26,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => { failureTitle.updateText(); }
        });

        // 4. Score Display (Perfectly unified & centered with glowing cyan shadow to prevent any overlaps)
        const scoreText = this.add.text(width / 2, height / 2 - 5, `FINAL CORE SCORE:  ${String(this.finalScore).padStart(6, '0')}`, {
            fontFamily: 'Orbitron',
            fontSize: '15px',
            fill: '#ffffff',
            stroke: '#00ffff',
            strokeThickness: 1.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#00ffff',
                blur: 8,
                stroke: true,
                fill: true
            },
            letterSpacing: 2
        }).setOrigin(0.5);

        // 5. Wave Display (Perfectly unified & centered with glowing magenta shadow to prevent any overlaps)
        const waveText = this.add.text(width / 2, height / 2 + 40, `TACTICAL WAVES CLEARED:  ${String(this.finalWave - 1).padStart(2, '0')}`, {
            fontFamily: 'Orbitron',
            fontSize: '15px',
            fill: '#ffffff',
            stroke: '#ff00ff',
            strokeThickness: 1.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ff00ff',
                blur: 8,
                stroke: true,
                fill: true
            },
            letterSpacing: 2
        }).setOrigin(0.5);

        // 6. NEW HIGH SCORE Celebration Splash! (Styled with green vector shadow glow)
        if (this.isNewHighScore) {
            const hsSplash = this.add.text(width / 2, height / 2 - 170, '// NEW SYSTEM HIGH SCORE RECORDED //', {
                fontFamily: 'Orbitron',
                fontSize: '14px',
                fill: '#ffffff',
                stroke: '#39ff14', // Glowing green!
                strokeThickness: 1,
                shadow: {
                    offsetX: 0,
                    offsetY: 0,
                    color: '#39ff14',
                    blur: 10,
                    stroke: true,
                    fill: true
                },
                fontWeight: '700',
                letterSpacing: 4
            }).setOrigin(0.5);

            this.tweens.add({
                targets: hsSplash,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // play positive noise
            SoundEffects.playPowerup();
        }

        // 7. INTERACTIVE BUTTON 1: Restart / Re-deploy
        const restartBtn = this.add.text(width / 2, height / 2 + 180, '// REDEPLOY JET //', {
            fontFamily: 'Orbitron',
            fontSize: '18px',
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
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5).setInteractive();

        restartBtn.on('pointerover', () => {
            SoundEffects.playMenuClick();
            restartBtn.setFill('#ff00ff');
            restartBtn.setStroke('#ff00ff', 0.5);
            restartBtn.setShadow(0, 0, '#ff00ff', 10, true, true);
            this.tweens.add({
                targets: restartBtn,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 120,
                ease: 'Back.easeOut'
            });
        });

        restartBtn.on('pointerout', () => {
            restartBtn.setFill('#00ffff');
            restartBtn.setStroke('#00ffff', 0.5);
            restartBtn.setShadow(0, 0, '#00ffff', 0, true, true);
            this.tweens.add({
                targets: restartBtn,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 120,
                ease: 'Power1'
            });
        });

        restartBtn.on('pointerdown', () => {
            SoundEffects.playLaser();
            this.cameras.main.flash(300, 0, 255, 255);
            this.tweens.add({
                targets: [restartBtn, failureTitle],
                alpha: 0,
                scaleY: 0,
                duration: 350,
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        });

        // 8. INTERACTIVE BUTTON 2: Return to HQ
        const menuBtn = this.add.text(width / 2, height / 2 + 230, 'RETURN TO TACTICAL HQ', {
            fontFamily: 'Orbitron',
            fontSize: '14px',
            fill: '#ffffff',
            alpha: 0.6,
            fontWeight: '700',
            stroke: '#ffffff',
            strokeThickness: 0.5,
            shadow: {
                offsetX: 0,
                offsetY: 0,
                color: '#ffffff',
                blur: 0,
                stroke: true,
                fill: true
            },
            letterSpacing: 2,
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        menuBtn.on('pointerover', () => {
            SoundEffects.playMenuClick();
            menuBtn.setFill('#ff00ff');
            menuBtn.setStroke('#ff00ff', 0.5);
            menuBtn.setAlpha(1.0);
            menuBtn.setShadow(0, 0, '#ff00ff', 8, true, true);
            this.tweens.add({
                targets: menuBtn,
                scaleX: 1.06,
                scaleY: 1.06,
                duration: 120,
                ease: 'Back.easeOut'
            });
        });

        menuBtn.on('pointerout', () => {
            menuBtn.setFill('#ffffff');
            menuBtn.setStroke('#ffffff', 0.5);
            menuBtn.setAlpha(0.6);
            menuBtn.setShadow(0, 0, '#ffffff', 0, true, true);
            this.tweens.add({
                targets: menuBtn,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 120,
                ease: 'Power1'
            });
        });

        menuBtn.on('pointerdown', () => {
            SoundEffects.playMenuClick();
            this.tweens.add({
                targets: [menuBtn, restartBtn],
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    this.scene.start('MenuScene');
                }
            });
        });
    }

    update() {
        // Slowly scroll starfield in reverse coordinates for game over ambiance
        this.background.tilePositionY += 0.35;
        this.background.tilePositionX += 0.1;
    }
}

export default GameOverScene;
