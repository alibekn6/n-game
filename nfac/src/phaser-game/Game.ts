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
    this.load.image('player_idle', '/walking/static.png');
    this.load.image('cloud1', '/street/cloud.png');
    this.load.image('cloud2', '/street/cloud2.png');
    this.load.image('cloud3', '/street/cloud3.png');
    this.load.image('satbayev', '/street/satbayev.png');
    this.load.image('unihub', '/street/unihub.png');
    this.load.image('cu', '/street/cu.png');
    // Новые кадры ходьбы
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Фон: небо и дорога (как раньше, но без облаков)
    const bg = this.add.graphics();
    bg.fillStyle(0x87ceeb, 1); // голубой
    bg.fillRect(0, 0, width, height);
    const roadHeight = height * 0.15;
    const roadY = height - roadHeight;
    bg.fillStyle(0x444444, 1);
    bg.fillRect(0, roadY, width, roadHeight);
    bg.fillStyle(0xffff00, 1);
    const markWidth = 60;
    const markHeight = 10;
    const markY = roadY + roadHeight / 2 - markHeight / 2;
    for (let x = 0; x < width; x += 120) {
      bg.fillRect(x + 20, markY, markWidth, markHeight);
    }

    // Персонаж на дороге
    this.player = this.physics.add.sprite(width / 2, roadY + roadHeight * 0.2, 'player_idle');
    this.player.setScale(0.15);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(2);

    // Облака (3 штуки, массив)
    this.clouds = [
      this.add.image(width * 0.15, height * 0.13, 'cloud1').setScale(0.25),
      this.add.image(width * 0.5, height * 0.10, 'cloud2').setScale(0.25),
      this.add.image(width * 0.85, height * 0.16, 'cloud3').setScale(0.25)
    ];

    // Здание Satbayev слева на дороге
    // Позиция здания: низ совпадает с центром разметки
    const satbayevImgY = markY + markHeight / 2;
    const satbayevImg = this.add.image(width * 0.18, satbayevImgY, 'satbayev').setOrigin(0.5, 1).setScale(0.4).setDepth(1);
    this.satbayev = satbayevImg;
    const satbayevZoneWidth = satbayevImg.displayWidth;
    const satbayevZoneHeight = 80;
    this.satbayevZone = new Phaser.Geom.Rectangle(
      satbayevImg.x - satbayevZoneWidth / 2,
      satbayevImgY - satbayevZoneHeight,
      satbayevZoneWidth,
      satbayevZoneHeight
    );
    this.enterButton = null;

    // Здание CU по центру
    const cuImg = this.add.image(width * 0.5, satbayevImgY, 'cu').setOrigin(0.5, 1).setScale(0.4).setDepth(1);
    this.cu = cuImg;
    const cuZoneWidth = cuImg.displayWidth;
    const cuZoneHeight = 80;
    this.cuZone = new Phaser.Geom.Rectangle(
      cuImg.x - cuZoneWidth / 2,
      satbayevImgY - cuZoneHeight,
      cuZoneWidth,
      cuZoneHeight
    );
    this.enterCuButton = null;

    // Здание UniHub справа на дороге
    const unihubImg = this.add.image(width * 0.82, satbayevImgY, 'unihub').setOrigin(0.5, 1).setScale(0.4).setDepth(1);
    this.unihub = unihubImg;
    const unihubZoneWidth = unihubImg.displayWidth;
    const unihubZoneHeight = 80;
    this.unihubZone = new Phaser.Geom.Rectangle(
      unihubImg.x - unihubZoneWidth / 2,
      satbayevImgY - unihubZoneHeight,
      unihubZoneWidth,
      unihubZoneHeight
    );
    this.enterUnihubButton = null;

    // Для анимации ходьбы
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.lastDirection = 'right';

    // Массивы кадров для анимации
    this.walkFramesRight = ['walk_right1', 'walk_right2', 'walk_right3', 'walk_right4'];
    this.walkFramesLeft = ['walk_left1', 'walk_left2', 'walk_left3', 'walk_left4'];

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
    const leftIcon = this.add.polygon(leftX - 50, buttonY - 100, leftArrowPoints, 0xffffff).setOrigin(0, 0).setDepth(10).setAlpha(0.5).setInteractive({ useHandCursor: true });
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
    const rightIcon = this.add.polygon(rightX - 50, buttonY - 100, rightArrowPoints, 0xffffff).setOrigin(0, 0).setDepth(10).setAlpha(0.5).setInteractive({ useHandCursor: true });
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

  clouds: Phaser.GameObjects.Image[] = [];
  satbayev: Phaser.GameObjects.Image | null = null;
  satbayevZone: Phaser.Geom.Rectangle | null = null;
  enterButton: Phaser.GameObjects.Text | null = null;
  unihub: Phaser.GameObjects.Image | null = null;
  unihubZone: Phaser.Geom.Rectangle | null = null;
  enterUnihubButton: Phaser.GameObjects.Text | null = null;
  cu: Phaser.GameObjects.Image | null = null;
  cuZone: Phaser.Geom.Rectangle | null = null;
  enterCuButton: Phaser.GameObjects.Text | null = null;
  walkFramesRight: string[] = [];
  walkFramesLeft: string[] = [];

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
      if (this.walkTimer > 120) {
        this.walkFrame = (this.walkFrame + 1) % 4;
        this.walkTimer = 0;
      }
      if (direction === 'left') {
        this.player.setTexture(this.walkFramesLeft[this.walkFrame]);
      } else {
        this.player.setTexture(this.walkFramesRight[this.walkFrame]);
      }
    } else {
      this.player.setTexture('player_idle');
      this.walkFrame = 0;
      this.walkTimer = 0;
    }

    // Движение облаков
    const { width } = this.scale;
    for (const cloud of this.clouds) {
      cloud.x += 0.03 * delta; // скорость облака
      if (cloud.x - cloud.width * cloud.scaleX / 2 > width) {
        cloud.x = -cloud.width * cloud.scaleX / 2;
      }
    }

    // Проверка на приближение к зданию
    if (this.satbayevZone) {
      // Прямоугольник персонажа (центр в player.x, player.y, размер 40x40)
      const playerRect = new Phaser.Geom.Rectangle(this.player.x - 20, this.player.y - 20, 40, 40);
      if (Phaser.Geom.Rectangle.Overlaps(this.satbayevZone, playerRect)) {
        if (!this.enterButton) {
          this.enterButton = this.add.text(this.satbayev.x, this.satbayevZone.y + this.satbayevZone.height + 30, 'Зайти', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#0077ff',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          this.enterButton.on('pointerdown', () => this.enterSatbayev());
        }
      } else {
        if (this.enterButton) {
          this.enterButton.destroy();
          this.enterButton = null;
        }
      }
    }

    // Проверка на приближение к UniHub
    if (this.unihubZone) {
      const playerRect = new Phaser.Geom.Rectangle(this.player.x - 20, this.player.y - 20, 40, 40);
      if (Phaser.Geom.Rectangle.Overlaps(this.unihubZone, playerRect)) {
        if (!this.enterUnihubButton) {
          this.enterUnihubButton = this.add.text(this.unihub.x, this.unihubZone.y + this.unihubZone.height + 30, 'Зайти покушать', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#ff5555',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          this.enterUnihubButton.on('pointerdown', () => this.enterUnihub());
        }
      } else {
        if (this.enterUnihubButton) {
          this.enterUnihubButton.destroy();
          this.enterUnihubButton = null;
        }
      }
    }

    // Проверка на приближение к CU
    if (this.cuZone) {
      const playerRect = new Phaser.Geom.Rectangle(this.player.x - 20, this.player.y - 20, 40, 40);
      if (Phaser.Geom.Rectangle.Overlaps(this.cuZone, playerRect)) {
        if (!this.enterCuButton) {
          this.enterCuButton = this.add.text(this.cu.x, this.cuZone.y + this.cuZone.height + 30, 'Зайти в CU', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#7e5cff',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          this.enterCuButton.on('pointerdown', () => this.enterCu());
        }
      } else {
        if (this.enterCuButton) {
          this.enterCuButton.destroy();
          this.enterCuButton = null;
        }
      }
    }
  }

  enterSatbayev() {
    this.scene.pause();
    this.scene.launch('SatbayevInside');
  }

  enterUnihub() {
    this.scene.pause();
    this.scene.launch('UnihubInside');
  }

  enterCu() {
    this.scene.pause();
    this.scene.launch('CUInside');
  }
}

// Сцена для "внутри здания"
class SatbayevInside extends Phaser.Scene {
  constructor() {
    super('SatbayevInside');
  }
  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#fff');
    this.add.text(width / 2, height / 2, 'Внутри сатбаев уник', {
      fontSize: '40px',
      color: '#222',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height / 2 + 80, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene');
    });
  }
}

// Сцена для "внутри UniHub"
class UnihubInside extends Phaser.Scene {
  constructor() {
    super('UnihubInside');
  }
  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#fff');
    this.add.text(width / 2, height / 2, 'Внутри UniHub', {
      fontSize: '40px',
      color: '#222',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height / 2 + 80, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene');
    });
  }
}

// Сцена для "внутри CU"
class CUInside extends Phaser.Scene {
  constructor() {
    super('CUInside');
  }
  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#fff');
    this.add.text(width / 2, height / 2, 'Внутри CU', {
      fontSize: '40px',
      color: '#222',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height / 2 + 80, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene');
    });
  }
}

// Экспорт с двумя сценами
const { width, height } = { width: window.innerWidth, height: window.innerHeight };
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
  scene: [MainScene, SatbayevInside, UnihubInside, CUInside],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export default function startPhaserGame() {
  return new Phaser.Game(config);
} 