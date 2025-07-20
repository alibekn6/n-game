import Phaser from 'phaser';

const getGameSize = () => ({ width: window.innerWidth, height: window.innerHeight });

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftArrow?: Phaser.GameObjects.Polygon;
  private rightArrow?: Phaser.GameObjects.Polygon;
  private leftPressed = false;
  private rightPressed = false;
  private playerPosition: { x: number; y: number } | null = null;

  constructor() {
    super('MainScene');
  }

  init(data: any) {
    // Receive player position from other scenes
    this.playerPosition = data.playerPosition || null;
  }

  preload() {
    this.load.image('player_idle', '/walking/static.png');
    this.load.image('cloud1', '/street/cloud.png');
    this.load.image('cloud2', '/street/cloud2.png');
    this.load.image('cloud3', '/street/cloud3.png');
    this.load.image('satbayev', '/street/satbayev.png');
    this.load.image('unihub', '/street/unihub.png');
    this.load.image('cu', '/street/cu.png');
    
    // Load corridor with error handling
    this.load.image('coridor', '/building/coridor.png');
    this.load.on('loaderror', (file: any) => {
      if (file.key === 'coridor') {
        console.warn('Failed to load corridor image:', file.url);
      }
    });
    
    // Load unihub image
    this.load.image('unihub_inside', '/building/unihub.png');
      
    // Load cu image
    this.load.image('cu_inside', '/building/cu.png');
    
    // Load cafeteria image
    this.load.image('unihub_cafeteria', '/building/unihub2.png');
    
    // Load walking-up animation frames
    for (let i = 1; i <= 3; i++) {
      this.load.image(`walk_up${i}`, `/walking/walking-up${i}.png`);
    }
    // Load walking-down animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_down${i}`, `/walking/walking-down${i}.png`);
    }
    
    // Новые кадры ходьбы
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
    
    // Load health and resource images
    this.load.image('heart', '/other/heart.png');
    this.load.image('eat', '/other/eat.png');
    this.load.image('code', '/other/code.png');
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
    this.player = this.physics.add.sprite(
      this.playerPosition ? this.playerPosition.x : width / 2,
      this.playerPosition ? this.playerPosition.y : roadY + roadHeight * 0.2,
      'player_idle'
    );
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

    // Add escooter mini-game button
    const escooterButton = this.add.text(width * 0.5, height * 0.1, '🚗 Play Escooter Mini-Game', {
      fontSize: '24px',
      color: '#fff',
      backgroundColor: '#ff6600',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);
    escooterButton.on('pointerdown', () => this.startEscooterGame());

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
    
    // Create health and resource UI
    this.createHealthUI();
    this.createResourceUI();
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

  createHealthUI() {
    const { width, height } = this.scale;
    const heartSize = 40;
    const heartSpacing = 10;
    const startX = width - 300; // Start from left side
    const startY = 50;

    // Clear existing hearts
    this.heartIcons.forEach(icon => icon.destroy());
    this.heartIcons = [];

    // Create heart icons horizontally
    for (let i = 0; i < 5; i++) {
      const heartIcon = this.add.image(
        startX + i * (heartSize + heartSpacing),
        startY,
        'heart'
      ).setScale(0.1).setDepth(20);
      
      this.heartIcons.push(heartIcon);
    }
  }

  createResourceUI() {
    const { width, height } = this.scale;
    const iconSize = 35;
    const iconSpacing = 8;
    const startX = width - 300; // Same horizontal position as hearts
    const eatingStartY = 120; // Below hearts
    const codingStartY = 160; // Below eating points

    // Clear existing resource icons
    this.eatingIcons.forEach(icon => icon.destroy());
    this.codingIcons.forEach(icon => icon.destroy());
    this.eatingIcons = [];
    this.codingIcons = [];

    // Create eating point icons horizontally
    for (let i = 0; i < 3; i++) {
      const eatingIcon = this.add.image(
        startX + i * (iconSize + iconSpacing),
        eatingStartY,
        'eat'
      ).setScale(0.08).setDepth(20);
      
      this.eatingIcons.push(eatingIcon);
    }

    // Create coding point icons horizontally
    for (let i = 0; i < 3; i++) {
      const codingIcon = this.add.image(
        startX + i * (iconSize + iconSpacing),
        codingStartY,
        'code'
      ).setScale(0.08).setDepth(20);
      
      this.codingIcons.push(codingIcon);
    }
  }

  updateHealthUI() {
    // Hide hearts that are lost
    for (let i = 0; i < this.heartIcons.length; i++) {
      if (i < this.hearts) {
        this.heartIcons[i].setVisible(true);
      } else {
        this.heartIcons[i].setVisible(false);
      }
    }
  }

  updateEatingUI() {
    // Hide eating points that are lost
    for (let i = 0; i < this.eatingIcons.length; i++) {
      if (i < this.eatingPoints) {
        this.eatingIcons[i].setVisible(true);
      } else {
        this.eatingIcons[i].setVisible(false);
      }
    }
  }

  updateCodingUI() {
    // Hide coding points that are lost
    for (let i = 0; i < this.codingIcons.length; i++) {
      if (i < this.codingPoints) {
        this.codingIcons[i].setVisible(true);
      } else {
        this.codingIcons[i].setVisible(false);
      }
    }
  }

  loseHeart() {
    this.hearts--;
    this.updateHealthUI();
    
    if (this.hearts <= 0) {
      this.restartGame();
    }
  }

  restartGame() {
    // Reset all values
    this.hearts = 5;
    this.eatingPoints = 3;
    this.codingPoints = 3;
    this.resourceTimer = 0;
    
    // Update UI
    this.updateHealthUI();
    this.updateEatingUI();
    this.updateCodingUI();
    
    // Show restart message
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Игра перезапущена!', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#ff0000',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setDepth(30);
    
    // Remove message after 3 seconds
    this.time.delayedCall(3000, () => {
      message.destroy();
    });
  }

  walkFrame: number = 0;
  walkTimer: number = 0;
  lastDirection: 'left' | 'right' = 'right';
  idleMessages: string[] = [
    'че встал',
    'чо там?',
    'двигайся уже',
    'заснул ?',
    'ты там?'
  ];
  idleTimer: number = 0;
  idleBubble: Phaser.GameObjects.Text | null = null;

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
  
  // Система здоровья и ресурсов
  hearts: number = 5;
  eatingPoints: number = 3;
  codingPoints: number = 3;
  heartIcons: Phaser.GameObjects.Image[] = [];
  eatingIcons: Phaser.GameObjects.Image[] = [];
  codingIcons: Phaser.GameObjects.Image[] = [];
  resourceTimer: number = 0;

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return; // Add null check for player
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

    // Check if player is moving
    const isMoving = velocity !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

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
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
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
    if (this.satbayevZone && this.player) {
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
    if (this.unihubZone && this.player) {
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
    if (this.cuZone && this.player) {
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
    // Store player position before entering building
    const playerPosition = {
      x: this.player.x,
      y: this.player.y
    };
    this.scene.start('SatbayevInside', { playerPosition });
  }

  enterUnihub() {
    // Store player position before entering building
    const playerPosition = {
      x: this.player.x,
      y: this.player.y
    };
    this.scene.pause();
    this.scene.launch('UnihubInside', { playerPosition });
  }

  enterCu() {
    // Store player position before entering building
    const playerPosition = {
      x: this.player.x,
      y: this.player.y
    };
    this.scene.pause();
    this.scene.launch('CUInside', { playerPosition });
  }

  startEscooterGame() {
    this.scene.pause();
    this.scene.launch('EscooterGameScene');
  }
}

// Сцена для "внутри здания"
class SatbayevInside extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private playerPosition: { x: number; y: number } | null = null;
  private upPressed = false;
  private downPressed = false;
  private walkUpFrame = 0;
  private walkUpTimer = 0;
  private walkDownFrame = 0;
  private walkDownTimer = 0;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  
  // Glass door interaction
  private glassDoorZone: Phaser.Geom.Rectangle | null = null;
  private enterLectureButton: Phaser.GameObjects.Text | null = null;
  
  // Idle bubble system
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'двигайся уже',
    'заснул что ли?',
    'эй, ты там?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;
  
  // Система здоровья и ресурсов
  hearts: number = 5;
  eatingPoints: number = 3;
  codingPoints: number = 3;
  heartIcons: Phaser.GameObjects.Image[] = [];
  eatingIcons: Phaser.GameObjects.Image[] = [];
  codingIcons: Phaser.GameObjects.Image[] = [];
  resourceTimer: number = 0;

  constructor() {
    super('SatbayevInside');
  }

  init(data: any) {
    // Receive player position from MainScene
    this.playerPosition = data.playerPosition || null;
  }

  preload() {
    console.log('SatbayevInside preload() called');
    // Load corridor texture
    this.load.image('coridor', '/building/coridor.png');
    console.log('Loading corridor texture from /building/coridor.png');
    // Load player idle texture
    this.load.image('player_idle', '/walking/static.png');
    // Load walking-up animation frames
    for (let i = 1; i <= 3; i++) {
      this.load.image(`walk_up${i}`, `/walking/walking-up${i}.png`);
    }
    // Load walking-down animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_down${i}`, `/walking/walking-down${i}.png`);
    }
    // Load walking-right animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
    }
    // Load walking-left animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
    
    // Load health and resource images
    this.load.image('heart', '/other/heart.png');
    this.load.image('eat', '/other/eat.png');
    this.load.image('code', '/other/code.png');
  }

  create() {
    const { width, height } = this.scale;

    console.log('SatbayevInside create() called');
    console.log('Available textures:', this.textures.getTextureKeys());
    console.log('Corridor texture exists:', this.textures.exists('coridor'));

    // Check if texture exists before using it
    if (!this.textures.exists('coridor')) {
      console.warn('Corridor texture missing! Showing fallback background.');
      // Create a fallback background
      const graphics = this.add.graphics();
      graphics.fillStyle(0x87CEEB, 1); // Sky blue
      graphics.fillRect(0, 0, width, height);
      graphics.fillStyle(0x8B4513, 1); // Brown floor
      graphics.fillRect(0, height * 0.7, width, height * 0.3);
      
      // Add some corridor-like elements
      graphics.fillStyle(0xFFFFFF, 1);
      for (let i = 0; i < 5; i++) {
        graphics.fillRect(width * 0.1 + i * width * 0.15, height * 0.2, width * 0.1, height * 0.4);
      }
      
      // Add text
      this.add.text(width / 2, height / 2, 'Коридор Сатпаев', {
        fontSize: '48px',
        color: '#000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    } else {
      console.log('Corridor texture found! Creating background image...');
      // Show corridor image as background, scaled to cover the scene
      const corridorBg = this.add.image(width / 2, height / 2, 'coridor');
      corridorBg.setDisplaySize(width, height);  // Stretch to fit screen
      corridorBg.setScrollFactor(0);
      corridorBg.setDepth(0); // Ensure it's behind everything
      console.log('Corridor background created:', corridorBg);
    }

    // Add player character in the corridor
    this.player = this.physics.add.sprite(width * 0.2, height * 0.7, 'player_idle');
    this.player.setScale(0.5); // Much bigger scale
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10); // Ensure player is on top

    // Create glass door interaction zone (positioned near the center-right of the corridor)
    this.glassDoorZone = new Phaser.Geom.Rectangle(width * 0.7, height * 0.4, 120, 80);

    // Add keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add up/down movement buttons
    // Up button
    const upArrowPoints = [
      50, 0,
      100, 100,
      0, 100
    ];
    const upBtn = this.add.polygon(width - 100, height - 200, upArrowPoints, 0xffffff)
      .setOrigin(0.5).setDepth(20).setAlpha(0.5).setInteractive({ useHandCursor: true });
    upBtn.on('pointerdown', () => { this.upPressed = true; });
    upBtn.on('pointerup', () => { this.upPressed = false; });
    upBtn.on('pointerout', () => { this.upPressed = false; });

    // Down button
    const downArrowPoints = [
      0, 0,
      100, 0,
      50, 100
    ];
    const downBtn = this.add.polygon(width - 100, height - 80, downArrowPoints, 0xffffff)
      .setOrigin(0.5).setDepth(20).setAlpha(0.5).setInteractive({ useHandCursor: true });
    downBtn.on('pointerdown', () => { this.downPressed = true; });
    downBtn.on('pointerup', () => { this.downPressed = false; });
    downBtn.on('pointerout', () => { this.downPressed = false; });

    // Exit button at the bottom center
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20); // Above player
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      // Pass player position back to MainScene
      this.scene.start('MainScene', { playerPosition: this.playerPosition });
    });
    
    // Note: Health and resource UI methods are not needed for this scene
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    let velocityY = 0;
    
    // Horizontal movement
    if (this.cursors.left?.isDown) {
      velocityX = -160;
    } else if (this.cursors.right?.isDown) {
      velocityX = 160;
    }
    
    // Vertical movement
    if (this.cursors.up?.isDown || this.upPressed) {
      velocityY = -160;
    } else if (this.cursors.down?.isDown || this.downPressed) {
      velocityY = 160;
    }
    
    this.player.setVelocityX(velocityX);
    this.player.setVelocityY(velocityY);

    // Check if player is moving
    const isMoving = velocityX !== 0 || velocityY !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Walking animations
    if (velocityY < 0) {
      // Walking up
      this.walkUpTimer += delta;
      if (this.walkUpTimer > 120) {
        this.walkUpFrame = (this.walkUpFrame + 1) % 3;
        this.walkUpTimer = 0;
      }
      this.player.setTexture(`walk_up${this.walkUpFrame + 1}`);
      // Scale decreases as player moves up (gets smaller when moving away)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityY > 0) {
      // Walking down
      this.walkDownTimer += delta;
      if (this.walkDownTimer > 120) {
        this.walkDownFrame = (this.walkDownFrame + 1) % 4;
        this.walkDownTimer = 0;
      }
      this.player.setTexture(`walk_down${this.walkDownFrame + 1}`);
      // Scale increases as player moves down (gets bigger when closer)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX > 0) {
      // Walking right
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      // Walking left
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      // Idle
      this.player.setTexture('player_idle');
      // Reset all animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      // Reset scale when not moving
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }

    // Check glass door interaction
    if (this.glassDoorZone && this.player) {
      const playerRect = new Phaser.Geom.Rectangle(this.player.x - 20, this.player.y - 20, 40, 40);
      if (Phaser.Geom.Rectangle.Overlaps(this.glassDoorZone, playerRect)) {
        if (!this.enterLectureButton) {
          this.enterLectureButton = this.add.text(this.glassDoorZone.x + this.glassDoorZone.width / 2, this.glassDoorZone.y + this.glassDoorZone.height + 30, 'Войти в аудиторию', {
            fontSize: '24px',
            color: '#fff',
            backgroundColor: '#4CAF50',
            padding: { left: 15, right: 15, top: 8, bottom: 8 },
          }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
          this.enterLectureButton.on('pointerdown', () => this.enterLectureHall());
        }
      } else {
        if (this.enterLectureButton) {
          this.enterLectureButton.destroy();
          this.enterLectureButton = null;
        }
      }
    }
  }

  enterLectureHall() {
    // Store player position before entering lecture hall
    const playerPosition = {
      x: this.player.x,
      y: this.player.y
    };
    this.scene.start('LectureHallScene', { playerPosition });
  }
}

// Сцена для "внутри UniHub"
class UnihubInside extends Phaser.Scene {
  private playerPosition: { x: number; y: number } | null = null;
  private selectedFood: string | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private upPressed = false;
  private downPressed = false;
  private walkUpFrame = 0;
  private walkUpTimer = 0;
  private walkDownFrame = 0;
  private walkDownTimer = 0;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  private kitchenZone: Phaser.Geom.Rectangle | null = null;
  private enterKitchenButton: Phaser.GameObjects.Text | null = null;
  private eatButton: Phaser.GameObjects.Text | null = null;
  private selectedFoodIndicator: Phaser.GameObjects.Image | null = null;
  
  // Idle bubble properties
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'пошли гулять',
    'скучно...',
    'может покушаем?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('UnihubInside');
  }

  init(data: any) {
    // Receive player position from MainScene
    this.playerPosition = data.playerPosition || null;
    this.selectedFood = data.selectedFood || null;
  }

  preload() {
    // Load unihub image if not already loaded
    if (!this.textures.exists('unihub_inside')) {
      this.load.image('unihub_inside', '/building/unihub.png');
    }
    // Load player idle texture if not already loaded
    if (!this.textures.exists('player_idle')) {
      this.load.image('player_idle', '/walking/static.png');
    }
    
    // Load walking-up animation frames
    for (let i = 1; i <= 3; i++) {
      this.load.image(`walk_up${i}`, `/walking/walking-up${i}.png`);
    }
    // Load walking-down animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_down${i}`, `/walking/walking-down${i}.png`);
    }
    // Load walking-right animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
    }
    // Load walking-left animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Check if texture exists before using it
    if (!this.textures.exists('unihub_inside')) {
      console.warn('UniHub texture missing! Showing fallback background.');
    this.cameras.main.setBackgroundColor('#fff');
    this.add.text(width / 2, height / 2, 'Внутри UniHub', {
      fontSize: '40px',
      color: '#222',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    } else {
      // Show UniHub image as background, scaled to cover the scene
      this.add.image(width / 2, height / 2, 'unihub_inside')
        .setDisplaySize(width, height)  // Stretch to fit screen
        .setScrollFactor(0);
    }

    // Add player character in UniHub
    this.player = this.physics.add.sprite(width * 0.2, height * 0.7, 'player_idle');
    this.player.setScale(0.5); // Big scale like in corridor
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10); // Ensure player is on top

    // Add keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Показываем выбранную еду в руке персонажа
    if (this.selectedFood) {
      this.showSelectedFood();
    }

    // Зона взаимодействия для места выдачи еды
    const kitchenZoneWidth = 200;
    const kitchenZoneHeight = 100;
    const kitchenZoneX = width * 0.6; // Примерно в центре-справа
    const kitchenZoneY = height * 0.5; // Примерно в центре по высоте
    this.kitchenZone = new Phaser.Geom.Rectangle(
      kitchenZoneX - kitchenZoneWidth / 2,
      kitchenZoneY - kitchenZoneHeight / 2,
      kitchenZoneWidth,
      kitchenZoneHeight
    );
    this.enterKitchenButton = null;

    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20); // Above player
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene', { playerPosition: this.playerPosition });
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    let velocityY = 0;
    
    // Horizontal movement
    if (this.cursors.left?.isDown) {
      velocityX = -240;
    } else if (this.cursors.right?.isDown) {
      velocityX = 240;
    }
    
    // Vertical movement
    if (this.cursors.up?.isDown || this.upPressed) {
      velocityY = -240;
    } else if (this.cursors.down?.isDown || this.downPressed) {
      velocityY = 240;
    }
    
    this.player.setVelocityX(velocityX);
    this.player.setVelocityY(velocityY);

    // Check if player is moving
    const isMoving = velocityX !== 0 || velocityY !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Walking animations
    if (velocityY < 0) {
      // Walking up
      this.walkUpTimer += delta;
      if (this.walkUpTimer > 120) {
        this.walkUpFrame = (this.walkUpFrame + 1) % 3;
        this.walkUpTimer = 0;
      }
      this.player.setTexture(`walk_up${this.walkUpFrame + 1}`);
      // Scale decreases as player moves up (gets smaller when moving away)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityY > 0) {
      // Walking down
      this.walkDownTimer += delta;
      if (this.walkDownTimer > 120) {
        this.walkDownFrame = (this.walkDownFrame + 1) % 4;
        this.walkDownTimer = 0;
      }
      this.player.setTexture(`walk_down${this.walkDownFrame + 1}`);
      // Scale increases as player moves down (gets bigger when closer)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX > 0) {
      // Walking right
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      // Walking left
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      // Idle
      this.player.setTexture('player_idle');
      // Reset all animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      // Reset scale when not moving
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }

    // Проверка зоны кухни
    if (this.kitchenZone && this.player) {
      const playerBounds = this.player.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(this.kitchenZone, playerBounds)) {
        // Показываем кнопку "Зайти в кухню"
        if (!this.enterKitchenButton) {
          this.enterKitchenButton = this.add.text(this.scale.width / 2, this.scale.height - 120, 'Взять хавчик', {
            fontSize: '32px',
            color: '#fff',
            backgroundColor: '#0077ff',
            padding: { left: 20, right: 20, top: 10, bottom: 10 },
          }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
          this.enterKitchenButton.on('pointerdown', () => {
            this.enterKitchen();
          });
        }
      } else {
        // Скрываем кнопку если игрок не в зоне
        if (this.enterKitchenButton) {
          this.enterKitchenButton.destroy();
          this.enterKitchenButton = null;
        }
      }
    }

    // Обновляем позицию еды в руке
    if (this.selectedFoodIndicator && this.player) {
      this.selectedFoodIndicator.setPosition(this.player.x + 25, this.player.y - 10);
    }

    // Показываем кнопку "скушать" если есть выбранная еда
    if (this.selectedFood && !this.eatButton) {
      this.eatButton = this.add.text(this.scale.width / 2, this.scale.height - 120, 'Скушать', {
        fontSize: '28px',
        color: '#fff',
        backgroundColor: '#ff6600',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
      this.eatButton.on('pointerdown', () => {
        this.eatFood();
      });
    } else if (!this.selectedFood && this.eatButton) {
      this.eatButton.destroy();
      this.eatButton = null;
    }
  }

  eatFood() {
    if (this.selectedFood) {
      console.log(`Скушали: ${this.selectedFood}`);
      
      // Удаляем еду с руки
      if (this.selectedFoodIndicator) {
        this.selectedFoodIndicator.destroy();
        this.selectedFoodIndicator = null;
      }
      
      // Удаляем кнопку
      if (this.eatButton) {
        this.eatButton.destroy();
        this.eatButton = null;
      }
      
      // Очищаем выбранную еду
      this.selectedFood = null;
      
      // Показываем сообщение
      const message = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Вкусно!', {
        fontSize: '40px',
        color: '#fff',
        backgroundColor: '#00aa00',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      }).setOrigin(0.5).setDepth(30);
      
      // Удаляем сообщение через 2 секунды
      this.time.delayedCall(2000, () => {
        message.destroy();
      });
    }
  }

  enterKitchen() {
    this.scene.pause();
    this.scene.launch('UnihubKitchen', { playerPosition: this.playerPosition });
  }

  showSelectedFood() {
    // Удаляем предыдущий индикатор еды если есть
    if (this.selectedFoodIndicator) {
      this.selectedFoodIndicator.destroy();
      this.selectedFoodIndicator = null;
    }
    
    if (this.selectedFood && this.player) {
      const foodIndicator = this.add.image(
        this.player.x + 25, 
        this.player.y - 10, 
        this.selectedFood
      ).setScale(0.08).setDepth(15);
      
      this.selectedFoodIndicator = foodIndicator;
    }
  }
}

// Сцена для "внутри CU"
class CUInside extends Phaser.Scene {
  private playerPosition: { x: number; y: number } | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private upPressed = false;
  private downPressed = false;
  private walkUpFrame = 0;
  private walkUpTimer = 0;
  private walkDownFrame = 0;
  private walkDownTimer = 0;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  
  // Idle bubble properties
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'пошли гулять',
    'скучно...',
    'может покушаем?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('CUInside');
  }

  init(data: any) {
    // Receive player position from MainScene
    this.playerPosition = data.playerPosition || null;
  }

  preload() {
    // Load cu image if not already loaded
    if (!this.textures.exists('cu_inside')) {
      this.load.image('cu_inside', '/building/cu.png');
    }
    // Load player idle texture if not already loaded
    if (!this.textures.exists('player_idle')) {
      this.load.image('player_idle', '/walking/static.png');
    }
    // Load walking-up animation frames
    for (let i = 1; i <= 3; i++) {
      this.load.image(`walk_up${i}`, `/walking/walking-up${i}.png`);
    }
    // Load walking-down animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_down${i}`, `/walking/walking-down${i}.png`);
    }
    // Load walking-right animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
    }
    // Load walking-left animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
  }

  create() {
    const { width, height } = this.scale;

    // Check if texture exists before using it
    if (!this.textures.exists('cu_inside')) {
      console.warn('CU texture missing! Showing fallback background.');
    this.cameras.main.setBackgroundColor('#fff');
    this.add.text(width / 2, height / 2, 'Внутри CU', {
      fontSize: '40px',
      color: '#222',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    } else {
      // Show CU image as background, scaled to cover the scene
      this.add.image(width / 2, height / 2, 'cu_inside')
        .setDisplaySize(width, height)  // Stretch to fit screen
        .setScrollFactor(0);
    }

    // Add player character in CU
    this.player = this.physics.add.sprite(width * 0.2, height * 0.7, 'player_idle');
    this.player.setScale(0.5); // Big scale like in other buildings
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10); // Ensure player is on top

    // Add keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20); // Above player
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene', { playerPosition: this.playerPosition });
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    let velocityY = 0;
    
    // Horizontal movement
    if (this.cursors.left?.isDown) {
      velocityX = -160;
    } else if (this.cursors.right?.isDown) {
      velocityX = 160;
    }
    
    // Vertical movement
    if (this.cursors.up?.isDown || this.upPressed) {
      velocityY = -160;
    } else if (this.cursors.down?.isDown || this.downPressed) {
      velocityY = 160;
    }
    
    this.player.setVelocityX(velocityX);
    this.player.setVelocityY(velocityY);

    // Check if player is moving
    const isMoving = velocityX !== 0 || velocityY !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Walking animations
    if (velocityY < 0) {
      // Walking up
      this.walkUpTimer += delta;
      if (this.walkUpTimer > 120) {
        this.walkUpFrame = (this.walkUpFrame + 1) % 3;
        this.walkUpTimer = 0;
      }
      this.player.setTexture(`walk_up${this.walkUpFrame + 1}`);
      // Scale decreases as player moves up (gets smaller when moving away)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityY > 0) {
      // Walking down
      this.walkDownTimer += delta;
      if (this.walkDownTimer > 120) {
        this.walkDownFrame = (this.walkDownFrame + 1) % 4;
        this.walkDownTimer = 0;
      }
      this.player.setTexture(`walk_down${this.walkDownFrame + 1}`);
      // Scale increases as player moves down (gets bigger when closer)
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX > 0) {
      // Walking right
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      // Walking left
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      // Scale based on Y position
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      // Idle
      this.player.setTexture('player_idle');
      // Reset all animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      // Reset scale when not moving
      const scaleFactor = 0.5 - ((this.scale.height - this.player.y) / this.scale.height) * 0.5;
      this.player.setScale(Math.max(0.15, scaleFactor));
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }
  }
}

// Сцена для "кухня UniHub" (приближенный кадр)
class UnihubKitchen extends Phaser.Scene {
  private playerPosition: { x: number; y: number } | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftPressed = false;
  private rightPressed = false;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  private currentFoodIndex = 0;
  private selectedFood: string | null = null;
  private foodDisplay: Phaser.GameObjects.Container | null = null;
  private lastPlayerX = 0;
  private foodItems = [
    { name: 'lagman', displayName: 'Лагман', price: '150₸', image: 'lagman' },
    { name: 'plov', displayName: 'Плов', price: '200₸', image: 'plov' },
    { name: 'manti', displayName: 'Манты', price: '180₸', image: 'manti' }
  ];
  private selectedFoodIndicator: Phaser.GameObjects.Image | null = null;
  
  // Idle bubble properties
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'пошли гулять',
    'скучно...',
    'может пож?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;
  private resourceTimer: number = 0;
  private eatingPoints: number = 3;

  constructor() {
    super('UnihubKitchen');
  }

  init(data: any) {
    // Receive player position from UniHubInside
    this.playerPosition = data.playerPosition || null;
  }

  preload() {
    // Load kitchen image if not already loaded
    if (!this.textures.exists('unihub_kitchen')) {
      this.load.image('unihub_kitchen', '/building/unihub2.png');
    }
    // Load player idle texture if not already loaded
    if (!this.textures.exists('player_idle')) {
      this.load.image('player_idle', '/walking/static.png');
    }
    // Load walking-right animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
    }
    // Load walking-left animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
    // Load food images
    this.load.image('lagman', '/havchik/lagman.png');
    this.load.image('plov', '/havchik/plov.png');
    this.load.image('manti', '/havchik/manti.png');
  }

  create() {
    const { width, height } = this.scale;

    // Check if texture exists before using it
    if (!this.textures.exists('unihub_kitchen')) {
      console.warn('UniHub kitchen texture missing! Showing fallback background.');
      this.cameras.main.setBackgroundColor('#fff');
      this.add.text(width / 2, height / 2, 'Кухня UniHub', {
        fontSize: '40px',
        color: '#222',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    } else {
      // Show kitchen image as background, scaled to cover the scene
      this.add.image(width / 2, height / 2, 'unihub_kitchen')
        .setDisplaySize(width, height)  // Stretch to fit screen
        .setScrollFactor(0);
    }

    // Add player character in kitchen
    this.player = this.physics.add.sprite(width * 0.8, height * 0.75, 'player_idle'); // Начинаем справа
    this.player.setScale(0.5);
    this.player.setCollideWorldBounds(false); // Отключаем стандартные границы
    this.player.setDepth(10);

    // Инициализируем последнюю позицию персонажа
    this.lastPlayerX = this.player.x;

    // Create food display UI
    this.createFoodDisplay();

    // Add keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add left/right movement buttons
    // Left button
    const leftArrowPoints = [
      0, 75,
      150, 0,
      150, 150
    ];
    const leftBtn = this.add.polygon(width - 300, height - 150, leftArrowPoints, 0x0077ff)
      .setOrigin(0, 0).setDepth(20).setAlpha(0.8).setInteractive({ useHandCursor: true });
    leftBtn.on('pointerdown', () => { this.leftPressed = true; });
    leftBtn.on('pointerup', () => { this.leftPressed = false; });
    leftBtn.on('pointerout', () => { this.leftPressed = false; });

    // Right button
    const rightArrowPoints = [
      150, 75,
      0, 0,
      0, 150
    ];
    const rightBtn = this.add.polygon(width - 150, height - 150, rightArrowPoints, 0x0077ff)
      .setOrigin(0, 0).setDepth(20).setAlpha(0.8).setInteractive({ useHandCursor: true });
    rightBtn.on('pointerdown', () => { this.rightPressed = true; });
    rightBtn.on('pointerup', () => { this.rightPressed = false; });
    rightBtn.on('pointerout', () => { this.rightPressed = false; });

    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.start('UnihubCafeteria', { 
        playerPosition: this.playerPosition,
        selectedFood: this.selectedFood 
      });
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    
    // Horizontal movement
    if (this.cursors.left?.isDown || this.leftPressed) {
      velocityX = -320;
    } else if (this.cursors.right?.isDown || this.rightPressed) {
      velocityX = 320;
    }
    
    this.player.setVelocityX(velocityX);

    // Check if player is moving
    const isMoving = velocityX !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Ограничение движения персонажа только по полу
    const minX = 100;
    const maxX = this.scale.width - 100;
    const minY = this.scale.height * 0.7; // Нижняя граница - пол
    const maxY = this.scale.height * 0.85; // Верхняя граница - не выше столов

    // Проверяем и ограничиваем позицию
    if (this.player.x < minX) {
      this.player.x = minX;
      this.player.setVelocityX(0);
    } else if (this.player.x > maxX) {
      this.player.x = maxX;
      this.player.setVelocityX(0);
    }

    if (this.player.y < minY) {
      this.player.y = minY;
      this.player.setVelocityY(0);
    } else if (this.player.y > maxY) {
      this.player.y = maxY;
      this.player.setVelocityY(0);
    }

    // Показ еды в зависимости от позиции персонажа
    this.updateFoodDisplay();
    
    // Обновляем позицию еды в руке персонажа
    if (this.selectedFoodIndicator && this.player) {
      this.selectedFoodIndicator.setPosition(this.player.x + 25, this.player.y - 10);
    }

    // Walking animations
    if (velocityX > 0) {
      // Walking right
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      // Reset left animation
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      // Walking left
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      // Reset right animation
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      // Idle
      this.player.setTexture('player_idle');
      // Reset all animations
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }

    // Resource timer logic
    this.resourceTimer += delta;
    if (this.resourceTimer >= 10000) { // 10 seconds
      this.resourceTimer = 0;
      
      // Lose eating point
      if (this.eatingPoints > 0) {
        this.eatingPoints--;
        this.updateEatingUI();
      }
      
      // If no eating points left, lose a heart
      if (this.eatingPoints <= 0) {
        this.loseHeart();
      }
    }
  }

  createFoodDisplay() {
    const { width, height } = this.scale;
    
    // Удаляем старое меню если есть
    if (this.foodDisplay) {
      this.foodDisplay.destroy();
    }
    
    // Определяем позицию блюда в зависимости от позиции персонажа
    let foodX = width / 2;
    if (this.player) {
      if (this.player.x < width * 0.4) {
        foodX = width * 0.25; // Манты слева
      } else if (this.player.x < width * 0.7) {
        foodX = width * 0.5; // Плов в центре
      } else {
        foodX = width * 0.75; // Лагман справа
      }
    }
    
    const foodDisplay = this.add.container(foodX, height - 500); // Подняли блюда еще выше
    foodDisplay.setDepth(20);

    // Определяем какое блюдо показывать в зависимости от позиции персонажа
    let foodIndex = 0;
    if (this.player) {
      if (this.player.x < width * 0.4) {
        foodIndex = 2; // Манты (слева)
      } else if (this.player.x < width * 0.7) {
        foodIndex = 1; // Плов (центр)
      } else {
        foodIndex = 0; // Лагман (справа)
      }
    }

    const currentFood = this.foodItems[foodIndex];
    
    // Изображение еды
    const foodImage = this.add.image(0, -20, currentFood.image).setScale(0.15);
    foodDisplay.add(foodImage);

    // Название блюда
    const foodName = this.add.text(0, 20, currentFood.displayName, {
      fontSize: '24px',
      color: '#000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    foodDisplay.add(foodName);

    // Цена
    const foodPrice = this.add.text(0, 45, currentFood.price, {
      fontSize: '20px',
      color: '#0077ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    foodDisplay.add(foodPrice);

    // Кнопка "Выбрать"
    const selectButton = this.add.text(0, 70, 'Выбрать', {
      fontSize: '18px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 15, right: 15, top: 8, bottom: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    selectButton.on('pointerdown', () => {
      this.selectFood(currentFood.name);
    });
    foodDisplay.add(selectButton);

    this.foodDisplay = foodDisplay;
  }

  selectFood(foodName: string) {
    this.selectedFood = foodName;
    console.log(`Выбрана еда: ${foodName}`);
    
    // Показываем выбранную еду на персонаже
    this.showSelectedFood();
    
    // Скрываем меню выбора еды
    if (this.foodDisplay) {
      this.foodDisplay.destroy();
      this.foodDisplay = null;
    }
  }

  showSelectedFood() {
    // Удаляем предыдущий индикатор еды если есть
    if (this.selectedFoodIndicator) {
      this.selectedFoodIndicator.destroy();
      this.selectedFoodIndicator = null;
    }
    
    if (this.selectedFood && this.player) {
      // Создаем индикатор выбранной еды, прикрепленный к руке персонажа
      const foodIndicator = this.add.image(
        this.player.x + 25, 
        this.player.y - 10, 
        this.selectedFood
      ).setScale(0.08).setDepth(15);
      
      // Сохраняем индикатор для последующего удаления
      this.selectedFoodIndicator = foodIndicator;
    }
  }

  updateFoodDisplay() {
    if (this.player) {
      const { width } = this.scale;
      const currentX = this.player.x;
      const distanceMoved = Math.abs(currentX - this.lastPlayerX);
      
      // Показываем меню только если персонаж в зоне прилавка
      if (currentX > width * 0.3 && currentX < width * 0.9) {
        // Меняем блюдо только если персонаж прошел достаточно далеко (100 пикселей)
        if (distanceMoved > 100 || !this.foodDisplay) {
          this.createFoodDisplay();
          this.lastPlayerX = currentX; // Обновляем последнюю позицию
        }
      } else {
        // Скрываем меню если персонаж не в зоне
        if (this.foodDisplay) {
          this.foodDisplay.destroy();
          this.foodDisplay = null;
        }
      }
    }
  }

  updateEatingUI() {
    // Placeholder method for eating UI updates
    console.log('Eating points:', this.eatingPoints);
  }

  loseHeart() {
    // Placeholder method for losing hearts
    console.log('Lost a heart!');
  }
}

class UnihubCafeteria extends Phaser.Scene {
  private playerPosition: { x: number; y: number } | null = null;
  private selectedFood: string | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private leftPressed = false;
  private rightPressed = false;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  private selectedFoodIndicator: Phaser.GameObjects.Image | null = null;
  
  // Idle bubble properties
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'пошли гулять',
    'скучно...',
    'может покушаем?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('UnihubCafeteria');
  }

  init(data: any) {
    this.playerPosition = data.playerPosition || null;
    this.selectedFood = data.selectedFood || null;
  }

  preload() {
    // Загружаем изображения для персонажа
    this.load.image('player_idle', '/walking/static.png');
    
    // Загружаем изображения для анимации ходьбы
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
    
    // Загружаем изображения еды
    this.load.image('lagman', '/food/lagman.png');
    this.load.image('plov', '/food/plov.png');
    this.load.image('manti', '/food/manti.png');
  }

  create() {
    const { width, height } = this.scale;

    // Показываем фон столовой
    if (this.textures.exists('unihub_cafeteria')) {
      this.add.image(width / 2, height / 2, 'unihub_cafeteria')
        .setDisplaySize(width, height)
        .setScrollFactor(0);
    } else {
      this.cameras.main.setBackgroundColor('#fff');
      this.add.text(width / 2, height / 2, 'Столовая UniHub', {
        fontSize: '40px',
        color: '#222',
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Добавляем персонажа
    this.player = this.physics.add.sprite(
      this.playerPosition ? this.playerPosition.x : width * 0.8,
      this.playerPosition ? this.playerPosition.y : height * 0.75,
      'player_idle'
    );
    this.player.setScale(0.5);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(10);

    // Показываем выбранную еду в руке персонажа
    if (this.selectedFood) {
      this.showSelectedFood();
    }

    // Добавляем управление
    this.cursors = this.input.keyboard.createCursorKeys();

    // Кнопки движения
    const leftArrowPoints = [0, 75, 150, 0, 150, 150];
    const leftBtn = this.add.polygon(width - 300, height - 150, leftArrowPoints, 0x0077ff)
      .setOrigin(0, 0).setDepth(20).setAlpha(0.8).setInteractive({ useHandCursor: true });
    leftBtn.on('pointerdown', () => { this.leftPressed = true; });
    leftBtn.on('pointerup', () => { this.leftPressed = false; });
    leftBtn.on('pointerout', () => { this.leftPressed = false; });

    const rightArrowPoints = [150, 75, 0, 0, 0, 150];
    const rightBtn = this.add.polygon(width - 150, height - 150, rightArrowPoints, 0x0077ff)
      .setOrigin(0, 0).setDepth(20).setAlpha(0.8).setInteractive({ useHandCursor: true });
    rightBtn.on('pointerdown', () => { this.rightPressed = true; });
    rightBtn.on('pointerup', () => { this.rightPressed = false; });
    rightBtn.on('pointerout', () => { this.rightPressed = false; });

    // Кнопка выйти
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
    exitBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.start('UnihubInside', { 
        playerPosition: this.playerPosition,
        selectedFood: this.selectedFood 
      });
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    
    if (this.cursors.left?.isDown || this.leftPressed) {
      velocityX = -320;
    } else if (this.cursors.right?.isDown || this.rightPressed) {
      velocityX = 320;
    }
    
    this.player.setVelocityX(velocityX);

    // Check if player is moving
    const isMoving = velocityX !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Ограничение движения
    const minX = 100;
    const maxX = this.scale.width - 100;
    const minY = this.scale.height * 0.7;
    const maxY = this.scale.height * 0.85;

    if (this.player.x < minX) {
      this.player.x = minX;
      this.player.setVelocityX(0);
    } else if (this.player.x > maxX) {
      this.player.x = maxX;
      this.player.setVelocityX(0);
    }

    if (this.player.y < minY) {
      this.player.y = minY;
      this.player.setVelocityY(0);
    } else if (this.player.y > maxY) {
      this.player.y = maxY;
      this.player.setVelocityY(0);
    }

    // Обновляем позицию еды в руке
    if (this.selectedFoodIndicator && this.player) {
      this.selectedFoodIndicator.setPosition(this.player.x + 25, this.player.y - 10);
    }

    // Анимация ходьбы
    if (velocityX > 0) {
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      this.player.setTexture('player_idle');
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }
  }

  showSelectedFood() {
    if (this.selectedFood && this.player) {
      const foodIndicator = this.add.image(
        this.player.x + 25, 
        this.player.y - 10, 
        this.selectedFood
      ).setScale(0.08).setDepth(15);
      
      this.selectedFoodIndicator = foodIndicator;
    }
  }
}

// Escooter Mini-Game Scene
class EscooterGameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private upPressed = false;
  private downPressed = false;
  private isJumping = false;
  private isSliding = false;
  private debugText?: Phaser.GameObjects.Text;
  private escooterFrame: number = 1;
  private escooterFrameTimer: number = 0;

  // Game state
  private gameTimer: number = 0;
  private gameDuration: number = 30000; // 30 seconds
  private score: number = 0;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private collectibles!: Phaser.Physics.Arcade.Group;

  // UI elements
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  private harshMessages = [
    'Ты что, не видишь препятствие?',
    'Скорость не главное, главное - контроль!',
    'Может, стоит сойти с самоката?',
    'Ты точно умеешь кататься?',
    'Попробуй еще раз, но медленнее!'
  ];

  constructor() {
    super('EscooterGameScene');
  }

  preload() {
    // Load assets
    this.load.image('scooter', '/escooter-minigame/escooter-sprite-1.png');
    this.load.image('bug', '/escooter-minigame/bug.PNG');
    this.load.image('pizza', '/escooter-minigame/pizza.png');
    this.load.image('deadline', '/escooter-minigame/deadline.png');
    this.load.image('paper', '/escooter-minigame/paper.png');
    this.load.image('energy', '/escooter-minigame/energy-drink-can.PNG');
    
    // Load escooter sprites
    this.load.image('escooter-sprite-1', '/escooter-minigame/escooter-sprite-1.png');
    this.load.image('escooter-sprite-2', '/escooter-minigame/escooter-sprite-2.png');
    this.load.image('escooter-sprite-3', '/escooter-minigame/escooter-sprite-3.png');
    
    // Load obstacles
    this.load.image('low-obstacle', '/obstacles/low-obstacle.png');
    this.load.image('high-obstacle', '/obstacles/high-obstacle.png');
    
    // Load collectibles
    this.load.image('energy-drink', '/collectibles/energy-drink.png');
  }

  create() {
    const { width, height } = this.scale;

    // Create background using the existing road style
    const bg = this.add.graphics();
    bg.fillStyle(0x87ceeb, 1); // Sky blue
    bg.fillRect(0, 0, width, height);
    
    // Road at bottom
    const roadHeight = height * 0.15;
    const roadY = height - roadHeight;
    bg.fillStyle(0x444444, 1);
    bg.fillRect(0, roadY, width, roadHeight);
    
    // Road markings
    bg.fillStyle(0xffff00, 1);
    const markWidth = 60;
    const markHeight = 10;
    const markY = roadY + roadHeight / 2 - markHeight / 2;
    for (let x = 0; x < width; x += 120) {
      bg.fillRect(x + 20, markY, markWidth, markHeight);
    }

    // Create player (escooter)
    this.player = this.physics.add.sprite(200, roadY - 20, 'escooter-sprite-1');
    this.player.setScale(0.3);
    this.player.setCollideWorldBounds(true);

    // Create groups
    this.obstacles = this.physics.add.group();
    this.collectibles = this.physics.add.group();

    // Setup collisions
    // this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.collectibles, this.collectItem, undefined, this);

    // Setup controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Touch controls
    this.setupTouchControls();

    // UI
    this.setupUI();

    // Start spawning
    this.spawnObstacles();
    this.spawnCollectibles();
  }

  setupTouchControls() {
    const { width, height } = this.scale;
    const buttonSize = 80;

    // Jump button (up)
    this.add.rectangle(width * 0.8, height - 150, buttonSize, buttonSize, 0x00ff00, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(20)
      .on('pointerdown', () => { this.upPressed = true; })
      .on('pointerup', () => { this.upPressed = false; })
      .on('pointerout', () => { this.upPressed = false; });

    // Slide button (down)
    this.add.rectangle(width * 0.8, height - 50, buttonSize, buttonSize, 0xff0000, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(20)
      .on('pointerdown', () => { this.downPressed = true; })
      .on('pointerup', () => { this.downPressed = false; })
      .on('pointerout', () => { this.downPressed = false; });
  }

  setupUI() {
    const { width } = this.scale;
    
    this.timerText = this.add.text(width - 20, 20, '30', {
      fontSize: '32px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(1, 0).setDepth(20);

    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '24px',
      color: '#fff'
    }).setDepth(20);
  }

  spawnObstacles() {
    const { width, height } = this.scale;
    
    // Define obstacle types with their properties
    const obstacleTypes = [
      { type: 'pizza', height: 'low', y: height * 0.85, scale: 0.08 },     // Low obstacle - jump over (on ground)
      { type: 'paper', height: 'low', y: height * 0.85, scale: 0.12 },     // Low obstacle - jump over (on ground)
      { type: 'deadline', height: 'high', y: height * 0.6, scale: 0.2 },   // High obstacle - duck under (head level)
      { type: 'bug', height: 'high', y: height * 0.6, scale: 0.15 }        // High obstacle - duck under (head level)
    ];
    
    const spawnObstacle = () => {
      if (this.gameTimer >= this.gameDuration) return;

      const obstacleData = Phaser.Utils.Array.GetRandom(obstacleTypes);
      const obstacle = this.obstacles.create(width + 50, obstacleData.y, obstacleData.type);
      obstacle.setScale(obstacleData.scale);
      obstacle.setVelocityX(-500); // Move from right to left (faster)
      
      // Store obstacle height type for collision detection
      obstacle.setData('height', obstacleData.height);
      obstacle.setData('removeAt', -100);
      
      // Add visual indicator for obstacle type
      if (obstacleData.height === 'high') {
        // Add a small red dot above high obstacles
        this.add.circle(obstacle.x, obstacle.y - 30, 5, 0xff0000).setDepth(15);
      } else {
        // Add a small green dot above low obstacles
        this.add.circle(obstacle.x, obstacle.y - 30, 5, 0x00ff00).setDepth(15);
      }
    };

    // Spawn obstacles every second, increasing frequency every 5 seconds
    const baseInterval = 3000; // 1 per 3 seconds (even slower)
    const difficultyLevel = Math.floor(this.gameTimer / 5000); // Every 5 seconds
    const spawnInterval = Math.max(1200, baseInterval - (difficultyLevel * 200)); // Even slower increase
    
    this.time.addEvent({
      delay: spawnInterval,
      callback: spawnObstacle,
      loop: true
    });
  }

  spawnCollectibles() {
    const { width, height } = this.scale;
    
    const spawnCollectible = () => {
      if (this.gameTimer >= this.gameDuration) return;

      const collectible = this.collectibles.create(width + 50, height * 0.7, 'energy');
      collectible.setScale(0.15);
      collectible.setVelocityX(-500);
      collectible.setData('removeAt', -100);
    };

    // Spawn collectibles every 3-5 seconds
    this.time.addEvent({
      delay: Phaser.Math.Between(3000, 5000),
      callback: spawnCollectible,
      loop: true
    });
  }

  update(time: number, delta: number) {
    // Update game timer
    this.gameTimer += delta;
    
    // Check for game end
    if (this.gameTimer >= this.gameDuration) {
      this.endGame();
      return;
    }

    // Update timer display
    const timeLeft = Math.ceil((this.gameDuration - this.gameTimer) / 1000);
    this.timerText.setText(timeLeft.toString());

    // Handle player movement
    this.handlePlayerMovement();

    // Update escooter animation
    this.updateEscooterAnimation(delta);

    // Manual collision detection
    this.checkCollisions();

    // Clean up off-screen objects
    this.cleanupObjects();
    
    // Update debug info
    this.updateDebugInfo();
  }
  
  updateEscooterAnimation(delta: number) {
    // Update frame timer
    this.escooterFrameTimer += delta;
    
    // Change frame every 150ms for smooth animation
    if (this.escooterFrameTimer >= 150) {
      this.escooterFrameTimer = 0;
      this.escooterFrame = this.escooterFrame % 3 + 1; // Cycle through 1, 2, 3
      this.player.setTexture(`escooter-sprite-${this.escooterFrame}`);
    }
  }
  
  updateDebugInfo() {
    // Remove old debug text if it exists
    if (this.debugText) {
      this.debugText.destroy();
    }
    
    // Create new debug text showing player state
    this.debugText = this.add.text(10, 10, `Jumping: ${this.isJumping}, Sliding: ${this.isSliding}`, {
      fontSize: '16px',
      color: '#ffff00',
      fontStyle: 'bold'
    }).setDepth(30);
  }

  handlePlayerMovement() {
    // Jumping
    if ((this.cursors.up?.isDown || this.upPressed) && !this.isJumping) {
      this.isJumping = true;
      this.tweens.add({
        targets: this.player,
        y: this.player.y - 200, // Much higher jump to clearly clear low obstacles
        duration: 600, // Longer duration for more realistic jump
        yoyo: true,
        ease: 'Power2',
        onComplete: () => { this.isJumping = false; }
      });
    }

    // Sliding
    if ((this.cursors.down?.isDown || this.downPressed) && !this.isSliding) {
      this.isSliding = true;
      this.player.setScale(0.3, 0.15);
      this.time.delayedCall(500, () => {
        this.player.setScale(0.3, 0.3);
        this.isSliding = false;
      });
    }
  }

  checkCollisions() {
    this.obstacles.children.each((obstacle: any) => {
      if (!obstacle.active) return;
      
      const obstacleHeight = obstacle.getData('height');
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, obstacle.x, obstacle.y);
      
      // Only check collision if obstacle is close enough
      if (distance < 80) {
        let shouldCollide = false;
        
        if (obstacleHeight === 'low') {
          // For low obstacles, check if player is jumping high enough
          if (!this.isJumping) {
            shouldCollide = true;
          } else {
            // Check if player is high enough in their jump
            const jumpTween = this.tweens.getTweensOf(this.player)[0];
            if (jumpTween) {
              const jumpProgress = jumpTween.progress;
              // Only safe if jump is more than 30% complete and less than 70% complete
              // This gives more time for landing without hitting obstacles
              if (jumpProgress < 0.3 || jumpProgress > 0.7) {
                shouldCollide = true;
              }
            }
          }
        } else if (obstacleHeight === 'high') {
          // For high obstacles, player hits them if NOT sliding
          // If sliding, they can pass under high obstacles
          if (!this.isSliding) {
            shouldCollide = true;
          }
        }
        
        if (shouldCollide) {
          // Add debug info
          console.log(`Collision! Height: ${obstacleHeight}, Distance: ${distance}, IsSliding: ${this.isSliding}, IsJumping: ${this.isJumping}`);
          
          // Add visual debug indicator
          const debugText = this.add.text(obstacle.x, obstacle.y - 50, `HIT! ${obstacleHeight}`, {
            fontSize: '16px',
            color: '#ff0000',
            fontStyle: 'bold'
          }).setOrigin(0.5).setDepth(20);
          
          this.time.delayedCall(500, () => {
            debugText.destroy();
          });
          
          this.hitObstacle(this.player, obstacle);
        }
      }
    });
  }

  cleanupObjects() {
    this.obstacles.children.each((obstacle: any) => {
      if (obstacle.x < -100) {
        obstacle.destroy();
      }
    });

    this.collectibles.children.each((collectible: any) => {
      if (collectible.x < -100) {
        collectible.destroy();
      }
    });
  }

  hitObstacle(player: any, obstacle: any) {
    // Show random harsh message
    const message = Phaser.Utils.Array.GetRandom(this.harshMessages);
    const text = this.add.text(this.scale.width / 2, this.scale.height / 2, message, {
      fontSize: '24px',
      color: '#ff0000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(30);

    this.time.delayedCall(1000, () => {
      text.destroy();
    });

    this.score -= 10;
    this.scoreText.setText(`Score: ${this.score}`);
    obstacle.destroy();
  }

  collectItem(player: any, collectible: any) {
    this.score += 20;
    this.scoreText.setText(`Score: ${this.score}`);
    collectible.destroy();
  }

  endGame() {
    // Show game over screen
    const { width, height } = this.scale;
    
    const gameOverText = this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontSize: '48px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(30);

    const finalScoreText = this.add.text(width / 2, height / 2, `Final Score: ${this.score}`, {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5).setDepth(30);

    const restartText = this.add.text(width / 2, height / 2 + 50, 'Tap to restart', {
      fontSize: '24px',
      color: '#00ff00'
    }).setOrigin(0.5).setDepth(30);

    // Make restart interactive
    restartText.setInteractive({ useHandCursor: true });
    restartText.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume('MainScene');
    });

    // Auto restart after 3 seconds
    this.time.delayedCall(3000, () => {
      this.scene.stop();
      this.scene.resume('MainScene');
    });
  }
}

// Add this before the config definition
class LectureHallScene extends Phaser.Scene {
  private playerPosition: { x: number; y: number } | null = null;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private upPressed = false;
  private downPressed = false;
  private walkUpFrame = 0;
  private walkUpTimer = 0;
  private walkDownFrame = 0;
  private walkDownTimer = 0;
  private walkRightFrame = 0;
  private walkRightTimer = 0;
  private walkLeftFrame = 0;
  private walkLeftTimer = 0;
  
  // Idle bubble properties
  private idleMessages: string[] = [
    'че встал',
    'что делаешь?',
    'пошли гулять',
    'скучно...',
    'может покушаем?'
  ];
  private idleTimer: number = 0;
  private idleBubble: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('LectureHallScene');
  }
  init(data: any) {
    this.playerPosition = data.playerPosition || null;
  }
  preload() {
    this.load.image('lecture_hall', '/building/lecture-hall.png');
    this.load.image('player_idle', '/walking/static.png');
    // Load walking-up animation frames
    for (let i = 1; i <= 3; i++) {
      this.load.image(`walk_up${i}`, `/walking/walking-up${i}.png`);
    }
    // Load walking-down animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_down${i}`, `/walking/walking-down${i}.png`);
    }
    // Load walking-right animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_right${i}`, `/walking/walking-right${i}.png`);
    }
    // Load walking-left animation frames
    for (let i = 1; i <= 4; i++) {
      this.load.image(`walk_left${i}`, `/walking/walking-left${i}.png`);
    }
  }
  create() {
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'lecture_hall')
      .setDisplaySize(width, height)
      .setScrollFactor(0);

    // Add player character at the bottom of the lecture hall
    this.player = this.physics.add.sprite(width * 0.5, height * 0.85, 'player_idle');
    this.player.setScale(0.4);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    // Add keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();

    // Add up/down movement buttons
    const upArrowPoints = [50, 0, 100, 100, 0, 100];
    const upBtn = this.add.polygon(width - 100, height - 200, upArrowPoints, 0xffffff)
      .setOrigin(0.5).setDepth(20).setAlpha(0.5).setInteractive({ useHandCursor: true });
    upBtn.on('pointerdown', () => { this.upPressed = true; });
    upBtn.on('pointerup', () => { this.upPressed = false; });
    upBtn.on('pointerout', () => { this.upPressed = false; });

    const downArrowPoints = [0, 0, 100, 0, 50, 100];
    const downBtn = this.add.polygon(width - 100, height - 80, downArrowPoints, 0xffffff)
      .setOrigin(0.5).setDepth(20).setAlpha(0.5).setInteractive({ useHandCursor: true });
    downBtn.on('pointerdown', () => { this.downPressed = true; });
    downBtn.on('pointerup', () => { this.downPressed = false; });
    downBtn.on('pointerout', () => { this.downPressed = false; });

    // Exit button
    const exitBtn = this.add.text(width / 2, height - 60, 'Выйти', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#0077ff',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(20);
    exitBtn.on('pointerdown', () => {
      this.scene.start('SatbayevInside', { playerPosition: this.playerPosition });
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.player) return;

    let velocityX = 0;
    let velocityY = 0;
    
    // Horizontal movement
    if (this.cursors.left?.isDown) {
      velocityX = -160;
    } else if (this.cursors.right?.isDown) {
      velocityX = 160;
    }
    
    // Vertical movement
    if (this.cursors.up?.isDown || this.upPressed) {
      velocityY = -160;
    } else if (this.cursors.down?.isDown || this.downPressed) {
      velocityY = 160;
    }
    
    this.player.setVelocityX(velocityX);
    this.player.setVelocityY(velocityY);

    // Check if player is moving
    const isMoving = velocityX !== 0 || velocityY !== 0;

    // Reset idle timer and bubble when moving
    if (isMoving) {
      this.idleTimer = 0;
      if (this.idleBubble) {
        this.idleBubble.destroy();
        this.idleBubble = null;
      }
    }

    // Walking animations with perspective scaling
    if (velocityY < 0) {
      // Walking up (away from camera - gets smaller)
      this.walkUpTimer += delta;
      if (this.walkUpTimer > 120) {
        this.walkUpFrame = (this.walkUpFrame + 1) % 3;
        this.walkUpTimer = 0;
      }
      this.player.setTexture(`walk_up${this.walkUpFrame + 1}`);
      // Scale decreases as player moves up (gets smaller when moving away)
      const scaleFactor = 0.4 - ((this.scale.height - this.player.y) / this.scale.height) * 0.3;
      this.player.setScale(Math.max(0.1, scaleFactor));
      // Reset other animations
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityY > 0) {
      // Walking down (towards camera - gets bigger)
      this.walkDownTimer += delta;
      if (this.walkDownTimer > 120) {
        this.walkDownFrame = (this.walkDownFrame + 1) % 4;
        this.walkDownTimer = 0;
      }
      this.player.setTexture(`walk_down${this.walkDownFrame + 1}`);
      // Scale increases as player moves down (gets bigger when closer)
      const scaleFactor = 0.4 - ((this.scale.height - this.player.y) / this.scale.height) * 0.3;
      this.player.setScale(Math.max(0.1, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX > 0) {
      // Walking right
      this.walkRightTimer += delta;
      if (this.walkRightTimer > 120) {
        this.walkRightFrame = (this.walkRightFrame + 1) % 4;
        this.walkRightTimer = 0;
      }
      this.player.setTexture(`walk_right${this.walkRightFrame + 1}`);
      // Scale based on Y position for perspective
      const scaleFactor = 0.4 - ((this.scale.height - this.player.y) / this.scale.height) * 0.3;
      this.player.setScale(Math.max(0.1, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
    } else if (velocityX < 0) {
      // Walking left
      this.walkLeftTimer += delta;
      if (this.walkLeftTimer > 120) {
        this.walkLeftFrame = (this.walkLeftFrame + 1) % 4;
        this.walkLeftTimer = 0;
      }
      this.player.setTexture(`walk_left${this.walkLeftFrame + 1}`);
      // Scale based on Y position for perspective
      const scaleFactor = 0.4 - ((this.scale.height - this.player.y) / this.scale.height) * 0.3;
      this.player.setScale(Math.max(0.1, scaleFactor));
      // Reset other animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
    } else {
      // Idle
      this.player.setTexture('player_idle');
      // Reset all animations
      this.walkUpFrame = 0;
      this.walkUpTimer = 0;
      this.walkDownFrame = 0;
      this.walkDownTimer = 0;
      this.walkRightFrame = 0;
      this.walkRightTimer = 0;
      this.walkLeftFrame = 0;
      this.walkLeftTimer = 0;
      // Reset scale when not moving
      const scaleFactor = 0.4 - ((this.scale.height - this.player.y) / this.scale.height) * 0.3;
      this.player.setScale(Math.max(0.1, scaleFactor));
      
      // Track idle time
      this.idleTimer += delta;
      
      // Show bubble message after 5 seconds of being idle
      if (this.idleTimer >= 5000 && !this.idleBubble) {
        const randomMessage = Phaser.Utils.Array.GetRandom(this.idleMessages) || this.idleMessages[0];
        this.idleBubble = this.add.text(this.player.x, this.player.y - 80, randomMessage, {
          fontSize: '20px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { left: 10, right: 10, top: 5, bottom: 5 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(30);
        
        // Remove bubble after 3 seconds
        this.time.delayedCall(3000, () => {
          if (this.idleBubble) {
            this.idleBubble.destroy();
            this.idleBubble = null;
          }
        });
      }
    }

    // Keep player within screen bounds
    const minX = 50;
    const maxX = this.scale.width - 50;
    const minY = this.scale.height * 0.7; // Bottom boundary
    const maxY = this.scale.height * 0.95; // Top boundary

    if (this.player.x < minX) {
      this.player.x = minX;
      this.player.setVelocityX(0);
    } else if (this.player.x > maxX) {
      this.player.x = maxX;
      this.player.setVelocityX(0);
    }

    if (this.player.y < minY) {
      this.player.y = minY;
      this.player.setVelocityY(0);
    } else if (this.player.y > maxY) {
      this.player.y = maxY;
      this.player.setVelocityY(0);
    }
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
  scene: [MainScene, SatbayevInside, UnihubInside, CUInside, UnihubKitchen, UnihubCafeteria, EscooterGameScene, LectureHallScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export default function startPhaserGame() {
  return new Phaser.Game(config);
} 