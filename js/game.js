var gameProperties = {
	screenWidth: 640,
	screenHeight: 480,
		
	delayToStartLevel: 3,
	padding: 30,
};

var states = {
	main: "main",
	game: "game",
};

var graphicAssets = {
	// Load in the gwahphics
	ship:{URL:'assets/ship.png',name:'ship'},
	bullet:{URL:'assets/bullet.png',name:'bullet'},

	asteroidLarge:{URL:'assets/asteroidLarge.png', name:'asteroidLarge'},
	asteroidMedium:{URL:'assets/asteroidMedium.png', name:'asteroidMedium'},
	asteroidSmall:{URL:'assets/asteroidSmall.png', name:'asteroidSmall'},
};

var soundAssets = {
	// Browsers can only use .m4a or .ogg
	// Phaser decides which to use depending on the browser
	fire:{URL:['assets/fire.m4a', 'assets/fire.ogg'], name:'fire'},
	destroyed:{URL:['assets/destroyed.m4a', 'assets/destroyed.ogg'], name:'destroyed'},
};

var shipProperties = {
	startX: gameProperties.screenWidth*0.5,
	startY: gameProperties.screenHeight*0.5,
	acceleration: 200,
	drag: 20, // friction
	maxVelocity: 300,
	angularVelocity: 260, // how fast the ship can rotate
	startingLives: 3,
	timeToReset: 3,
	blinkDelay: 0.1,
};

var bulletProperties = {
	speed: 400,
	interval: 250, // firing rate: 1 round every 0.25 seconds.
	lifespan: 2000,
	maxCount: 30,
};

var asteroidProperties = {
	startingAsteroids: 4, // when starting a new game
	maxAsteroids: 20,
	incrementAsteroids: 1, // increase num. of asteroids after each round
		
	asteroidLarge: { minVelocity: 50, maxVelocity: 150, minAngularVelocity: 0, maxAngularVelocity: 200, score: 20, nextSize: graphicAssets.asteroidMedium.name, pieces: 2 },
	asteroidMedium: { minVelocity: 50, maxVelocity: 200, minAngularVelocity: 0, maxAngularVelocity: 200, score: 50, nextSize: graphicAssets.asteroidSmall.name, pieces: 2 },
	asteroidSmall: { minVelocity: 50, maxVelocity: 300, minAngularVelocity: 0, maxAngularVelocity: 200, score: 100 },
};

var fontAssets = {
	counterFontStyle:{font: '20px Arial', fill: '#FFFFFF', align: 'center'},
};
	
var gameState = function (game) {
	this.shipSprite;
	this.shipIsInvulnerable;
		
	this.key_left;
	this.key_right;
	this.key_thrust;
	this.key_fire;
		
	this.bulletGroup;
	this.asteroidGroup;
	this.lifeGroup;
		
	this.tf_lives; // used to display lives counter

	this.tf_score; // text field to display score
		
	this.sndDestroyed;
	this.sndFire;
};

gameState.prototype = {

	preload: function () {
		// game.load function is used to preload all external content
		game.load.image(graphicAssets.asteroidLarge.name, graphicAssets.asteroidLarge.URL);
		game.load.image(graphicAssets.asteroidMedium.name, graphicAssets.asteroidMedium.URL);
		game.load.image(graphicAssets.asteroidSmall.name, graphicAssets.asteroidSmall.URL);

		game.load.image(graphicAssets.bullet.name, graphicAssets.bullet.URL);
		game.load.image(graphicAssets.ship.name, graphicAssets.ship.URL);
		
		game.load.audio(soundAssets.destroyed.name, soundAssets.destroyed.URL);
		game.load.audio(soundAssets.fire.name, soundAssets.fire.URL);
	},
	
	init: function () {
		// The first function that is called when starting a new state
		// executed before the create and preload function
		this.bulletInterval = 0;
		this.asteroidsCount = asteroidProperties.startingAsteroids;
		this.shipLives = shipProperties.startingLives; // how many lives left (default is 3)
		this.score = 0;
	},

	create: function () {
		this.initGraphics();
		this.initSounds();
		this.initPhysics();
		this.initKeyboard();
		this.resetAsteroids();
	},

	update: function () {
		this.checkPlayerInput();
		this.checkBoundaries(this.shipSprite);
		this.bulletGroup.forEachExists(this.checkBoundaries, this);
		this.asteroidGroup.forEachExists(this.checkBoundaries,this);
		
		// See if bulletGroup and asteroidGroup bounding boxes overlap
		// if they do, pass the overlapping sprites into asteroidCollision
		game.physics.arcade.overlap(this.bulletGroup, this.asteroidGroup, this.asteroidCollision, null, this);
		// Same thing as above but with the ship and the asteroids
		if (!this.shipIsInvulnerable) {
			game.physics.arcade.overlap(this.shipSprite, this.asteroidGroup, this.asteroidCollision, null, this);
		}
	},

	initGraphics: function () {
		this.shipSprite = game.add.sprite(shipProperties.startX,shipProperties.startY,graphicAssets.ship.name);
		this.shipSprite.angle = -90; // facing upwards
		this.shipSprite.anchor.set(0.5, 0.5); // rotating on 50% of its width and height
		
		this.bulletGroup = game.add.group();
		this.asteroidGroup = game.add.group();
		this.lifeGroup = game.add.group();
				
		//this.tf_lives = game.add.text(20, 10, "LIVES : "+shipProperties.startingLives, fontAssets.counterFontStyle);
		this.tf_score = game.add.text(20,10,"0", fontAssets.counterFontStyle);
		this.tf_score.align = 'left';
		this.tf_score.anchor.set(0, 0); // anchor the text field at the top right
	
		this.drawLives();
	},
	
	drawLives: function() {
		// -- THIS FUNCTION IS BROKEN --
		if (this.shipLives === shipProperties.startingLives) {
			// Initializing sprites
			for (i=0; i< shipProperties.startingLives; i++) {
				// I draw them backwards just to use the "getFirstExists" function
				var r = this.shipSprite.width*shipProperties.startingLives;
				var lifeSprite = this.lifeGroup.create(r-(i*this.shipSprite.width),60,graphicAssets.ship.name);
				lifeSprite.angle = -90;
				lifeSprite.anchor.set(0,0);
			}
		} else {
			// Remove a sprite
			var topLife = this.lifeGroup.getFirstExists(true);
			topLife.kill();
		}
	},
		
    initSounds: function () {
        this.sndDestroyed = game.add.audio(soundAssets.destroyed.name);
        this.sndFire = game.add.audio(soundAssets.fire.name);
    },

	initPhysics: function () {
		game.physics.startSystem(Phaser.Physics.ARCADE);

		game.physics.enable(this.shipSprite, Phaser.Physics.ARCADE);
		this.shipSprite.body.drag.set(shipProperties.drag);
		this.shipSprite.body.maxVelocity.set(shipProperties.maxVelocity);
		
		this.bulletGroup.enableBody = true;
		this.bulletGroup.physicsBodyType = Phaser.Physics.ARCADE;
		this.bulletGroup.createMultiple(bulletProperties.maxCount, graphicAssets.bullet.name);
		this.bulletGroup.setAll('anchor.x',0.5);
		this.bulletGroup.setAll('anchor.y',0.5);
		this.bulletGroup.setAll('lifespan',bulletProperties.lifespan);
		
		this.asteroidGroup.enableBody = true;
		this.asteroidGroup.physicsBodyType = Phaser.Physics.ARCADE;
	},

	initKeyboard: function () {
		this.key_left = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
		this.key_right = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		this.key_thrust = game.input.keyboard.addKey(Phaser.Keyboard.UP);
		this.key_fire = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
				
	},

	checkPlayerInput: function () {
	 	// Called every frame loop
		if (this.key_left.isDown) {
				// Rotate counter-clockwise
				this.shipSprite.body.angularVelocity = -shipProperties.angularVelocity;
		} else if (this.key_right.isDown) { 
				// Rotate clockwise
				this.shipSprite.body.angularVelocity = shipProperties.angularVelocity;
		} else { // Stop rotating
				this.shipSprite.body.angularVelocity = 0;
		}

		if (this.key_thrust.isDown) {
				game.physics.arcade.accelerationFromRotation(this.shipSprite.rotation, shipProperties.acceleration, this.shipSprite.body.acceleration);
		} else {
				this.shipSprite.body.acceleration.set(0);
		}
		
		if (this.key_fire.isDown) {
			this.fire();
		}
	},
	
	hyperspace: function () {
		// Teleport to a random place on the screen when the
		// hyperspace key is pressed (see: initKeyboard).
	},
		
	checkBoundaries: function (sprite) {
		// Wrapping an object around the screen
		if (sprite.x + gameProperties.padding < 0) {
            sprite.x = game.width + gameProperties.padding;
        } else if (sprite.x - gameProperties.padding> game.width) {
            sprite.x = -gameProperties.padding;
        } 

        if (sprite.y + gameProperties.padding < 0) {
            sprite.y = game.height + gameProperties.padding;
        } else if (sprite.y - gameProperties.padding> game.height) {
            sprite.y = -gameProperties.padding;
        }
	},
		
	fire: function () {
		if (!this.shipSprite.alive) { 
			return; 
		}
		// First check whether or not the bullet has expired
		if (game.time.now > this.bulletInterval) {
			this.sndFire.play();
			// get the first object in our bulletGroup
			// retrieve an object that does not exist in the game world
			var bullet = this.bulletGroup.getFirstExists(false);
			
			if (bullet) {
				var length = this.shipSprite.width * 0.5; // position the bullet in front of the ship
				var x = this.shipSprite.x + (Math.cos(this.shipSprite.rotation) * length);
				var y = this.shipSprite.y + (Math.sin(this.shipSprite.rotation) * length);
				
				bullet.reset(x, y); // move our bullet to the x and y coords
				bullet.lifespan = bulletProperties.lifespan; // 2 seconds
				bullet.rotation - this.shipSprite.rotation;
				
				game.physics.arcade.velocityFromRotation(this.shipSprite.rotation, bulletProperties.speed, bullet.body.velocity);
				this.bulletInterval = game.time.now + bulletProperties.interval;
			}
		}
	},
		
	createAsteroid: function (x, y, size, pieces) {
		if (pieces === undefined) { pieces = 1; }
				
		for (var i=0; i<pieces; i++) {
			var asteroid = this.asteroidGroup.create(x, y, size);
			asteroid.anchor.set(0.5, 0.5);
			asteroid.body.angularVelocity = game.rnd.integerInRange(asteroidProperties[size].minAngularVelocity, asteroidProperties[size].maxAngularVelocity);
			
			var randomAngle = game.math.degToRad(game.rnd.angle());
			var randomVelocity = game.rnd.integerInRange(asteroidProperties[size].minVelocity, asteroidProperties[size].maxVelocity);
			
			game.physics.arcade.velocityFromRotation(randomAngle, randomVelocity, asteroid.body.velocity);
		}
	},
		
	resetAsteroids: function () {
		for (var i=0; i< this.asteroidsCount; i++) {
			// Randomly position the asteroid on the screen
			// Random variables used to determine which side of the screen
			var side = Math.round(Math.random()); // either 0 or 1
			var x;
			var y;
		
			if (side) {
				x = Math.round(Math.random()) * gameProperties.screenWidth;
				y = Math.random() * gameProperties.screenHeight;
			} else {
				x = Math.random() * gameProperties.screenWidth;
				y = Math.round(Math.random()) * gameProperties.screenHeight;
			}
			this.createAsteroid(x, y, graphicAssets.asteroidLarge.name);
		}
	},
		
	asteroidCollision: function (target, asteroid) {
		this.sndDestroyed.play();
		
		target.kill();
		asteroid.kill();
		
		if (target.key == graphicAssets.ship.name) {
			this.destroyShip();
		}
		
		this.splitAsteroid(asteroid);
		this.updateScore(asteroidProperties[asteroid.key].score);
		
		// Check if there are any more existing asteroids
		// If there are none, start timer to the next level
		if (!this.asteroidGroup.countLiving()) {
			game.time.events.add(Phaser.Timer.SECOND * gameProperties.delayToStartLevel, this.nextLevel, this);
		}
	},
		
	destroyShip: function () {
		this.shipLives-=1;
		//this.tf_lives.text = "LIVES : " + this.shipLives;
		this.drawLives();
		
		if (this.shipLives > 0) { // if shipLives is not 0
			// Call the reset function when the time runs out
			// timeToReset is 3, so the reset is called after 3000 miliseconds.
			game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.resetShip, this);
		} else {
			// The player has died: go to game over
			game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.endGame, this);
		}
	},
		
	resetShip: function () {
		this.shipIsInvulnerable = true;
		this.shipSprite.reset(shipProperties.startX, shipProperties.startY);
		this.shipSprite.angle = -90;
		
		game.time.events.add(Phaser.Timer.SECOND * shipProperties.timeToReset, this.shipReady, this);
		game.time.events.repeat(Phaser.Timer.SECOND * shipProperties.blinkDelay, shipProperties.timeToReset / shipProperties.blinkDelay, this.shipBlink, this);
	},
	
	shipReady: function () {
		this.shipIsInvulnerable = false;
		this.shipSprite.visible = true;
	},
	
	shipBlink: function () {
		this.shipSprite.visible = !this.shipSprite.visible;
	},
		
	splitAsteroid: function (asteroid) {
		// Check to see if the asteroid has a smaller size
		if (asteroidProperties[asteroid.key].nextSize) {
			this.createAsteroid(asteroid.x,asteroid.y,asteroidProperties[asteroid.key].nextSize, asteroidProperties[asteroid.key].pieces);
			
		}
	},
		
	updateScore: function (score) {
		this.score += score;
		this.tf_score.text = this.score;
	},
		
	nextLevel: function () {
		// Release items in asteroidGroup from memory.
		// Increase the amount of starting asteroids (increased difficulty).
		// Repopulate the game world.
		this.asteroidGroup.removeAll(true);
        if (this.asteroidsCount < asteroidProperties.maxAsteroids) {
            this.asteroidsCount += asteroidProperties.incrementAsteroids;
        }
        this.resetAsteroids();
	},
	
	endGame: function () {
		game.state.start(states.main);
	},
};

var mainState = function(game) {
	this.tf_start; // text field for instructions
};

mainState.prototype = {
	create: function () {
        var startInstructions = 'ASTEROIDS\n\nUP arrow to thrust.\n\nLEFT and RIGHT arrows to turn.\n\nSPACE to fire.\n\nClick to Start';
        
        this.tf_start = game.add.text(game.world.centerX, game.world.centerY, startInstructions, fontAssets.counterFontStyle);
        this.tf_start.align = 'center';
        this.tf_start.anchor.set(0.5, 0.5);
        
        game.input.onDown.addOnce(this.startGame, this);
	},
	
	startGame: function () {
		game.state.start(states.game);
	},
};

var game = new Phaser.Game(gameProperties.screenWidth, gameProperties.screenHeight, Phaser.AUTO, 'gameDiv');
game.state.add(states.main, mainState);
game.state.add(states.game, gameState);
game.state.start(states.main);