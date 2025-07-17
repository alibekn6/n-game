import Phaser from 'phaser';

const getGameSize = () => ({ width: window.innerWidth, height: window.innerHeight });

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftArrow?: Phaser.GameObjects.Rectangle;
  private rightArrow?: Phaser.GameObjects.Rectangle;
  private leftPressed = false;
  private rightPressed = false;

  constructor() {
    super('MainScene');
  }

  preload() {
    this.load.image('player_idle', '/sprite.png');
    this.load.image('player_walk1', '/walking sprite1.png');
    this.load.image('player_walk2', '/walking sprite2.png');
    this.load.image('player_walk_left1', '/walking-sprite-left1.png');
    this.load.image('player_walk_left2', '/walking-sprite-left2.png');
    this.load.image('player_walk_right1', '/walking-sprite-right1.png');
    this.load.image('player_walk_right2', '/walking-sprite-right2.png');
  }

  create() {
    const { width, height } = this.scale;
    this.player = this.physics.add.sprite(width / 2, height / 2, 'player_idle');
    this.player.setScale(0.3);
    this.player.setCollideWorldBounds(true);

    // Для анимации ходьбы
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.lastDirection = 'right';

    this.cursors = this.input.keyboard.createCursorKeys();

    // Центрируем стрелки внизу
    const buttonY = height - 80;
    const buttonSpacing = 40;
    const buttonSize = 80;
    const hitSize = 100;
    const offset = buttonSpacing + buttonSize / 2;
    const leftX = width / 2 - offset;
    const rightX = width / 2 + offset;

    // Стрелка влево (большая иконка, интерактивная, origin 0,0)
    const leftArrowPoints = [
      0, 50,
      100, 0,
      100, 100
    ];
    const leftIcon = this.add.polygon(leftX - 50, buttonY - 100, leftArrowPoints, 0xffffff).setOrigin(0, 0).setDepth(1).setInteractive({ useHandCursor: true });
    leftIcon.on('pointerdown', () => { this.leftPressed = true; });
    leftIcon.on('pointerup', () => { this.leftPressed = false; });
    leftIcon.on('pointerout', () => { this.leftPressed = false; });
    this.leftArrow = leftIcon;

    // Стрелка вправо (большая иконка, интерактивная, origin 0,0)
    const rightArrowPoints = [
      100, 50,
      0, 0,
      0, 100
    ];
    const rightIcon = this.add.polygon(rightX - 50, buttonY - 100, rightArrowPoints, 0xffffff).setOrigin(0, 0).setDepth(1).setInteractive({ useHandCursor: true });
    rightIcon.on('pointerdown', () => { this.rightPressed = true; });
    rightIcon.on('pointerup', () => { this.rightPressed = false; });
    rightIcon.on('pointerout', () => { this.rightPressed = false; });
    this.rightArrow = rightIcon;

    // Resize listener
    this.scale.on('resize', this.handleResize, this);
  }

  handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const buttonY = height - 80;
    const buttonSpacing = 40;
    const buttonSize = 80;
    const offset = buttonSpacing + buttonSize / 2;
    const leftX = width / 2 - offset;
    const rightX = width / 2 + offset;
    if (this.leftArrow) {
      this.leftArrow.setPosition(leftX - 50, buttonY - 100);
    }
    if (this.rightArrow) {
      this.rightArrow.setPosition(rightX - 50, buttonY - 100);
    }
  }

  walkFrame: number = 0;
  walkTimer: number = 0;
  lastDirection: 'left' | 'right' = 'right';

  update(time: number, delta: number) {
    if (!this.cursors) return;
    let velocity = 0;
    let direction: 'left' | 'right' | null = null;
    if (this.cursors.left?.isDown || this.leftPressed) {
      velocity = -160;
      direction = 'left';
    } else if (this.cursors.right?.isDown || this.rightPressed) {
      velocity = 160;
      direction = 'right';
    }
    this.player.setVelocityX(velocity);

    // Анимация ходьбы
    if (velocity !== 0 && direction) {
      this.lastDirection = direction;
      this.walkTimer += delta;
      if (this.walkTimer > 200) {
        this.walkFrame = (this.walkFrame + 1) % 2;
        this.walkTimer = 0;
      }
      if (direction === 'left') {
        this.player.setTexture(this.walkFrame === 0 ? 'player_walk_left1' : 'player_walk_left2');
      } else {
        this.player.setTexture(this.walkFrame === 0 ? 'player_walk_right1' : 'player_walk_right2');
      }
    } else {
      this.player.setTexture('player_idle');
      this.walkFrame = 0;
      this.walkTimer = 0;
    }
  }
}

const { width, height } = getGameSize();
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width,
  height,
  backgroundColor: '#222',
  parent: 'phaser-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: MainScene,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export default function startPhaserGame() {
  return new Phaser.Game(config);
} 