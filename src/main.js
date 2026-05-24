import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';

// Phaser 4 Game Configuration
const config = {
    type: Phaser.AUTO, // WebGL is automatically used for premium filter effects
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#030308',
    
    // Scale and Responsive Manager
    scale: {
        mode: Phaser.Scale.FIT, // Letterbox resize to fit the glassmorphic card perfectly
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    
    // Core physics engine (no gravity for classic space shooting physics)
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false // Set to true to view hitboxes during debugging
        }
    },
    
    // Register Scenes (First one boots automatically)
    scene: [BootScene, MenuScene, GameScene, GameOverScene]
};

// Initialize the game only after all sci-fi Web Fonts are fully downloaded and active!
document.fonts.ready.then(() => {
    const game = new Phaser.Game(config);
    
    // Expose game instance globally for debugging / sound integration
    window.phaserGame = game;
});
