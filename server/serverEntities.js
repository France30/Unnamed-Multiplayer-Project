const {Inventory} = require('./inventory.js');
const Maps = require('./maps.js');
const Database = require('./Database.js');
const leaderboard = require('./leaderBoard.js');

const DEBUG = false;

class Entity {

	static initPack = {player:[], enemy:[], bullet:[], upgrade:[], item:[]};
	static removePack = {player:[], enemy:[], bullet:[], upgrade:[], item:[]};

	constructor(param) {
		this.id = param.id || Math.random();				
		this.map = param.map || 'field';
		this.mapGrid = Maps.list[this.map];
		this.x = param.x || Math.random() * Maps.list[this.map].width;
		this.y = param.y || Math.random() * Maps.list[this.map].height; 
		this.spdX = 0;
		this.spdY = 0;
		this.timer = 0;
		this.toRemove = false;		
	}
	
	update() {
		this.updatePosition();

		//delete all objects if no players in map
		if(Maps.list[this.map].playersInMap <= 0)
			this.toRemove = true;
	}
	
	updatePosition() {		
		this.x += this.spdX;
		this.y += this.spdY;		
	}
	
	getDistance(other_x, other_y) {
		return Math.sqrt(Math.pow(this.x-other_x,2) + Math.pow(this.y-other_y,2));
	}

	testCollision(other) {
		//check if colliding
		return (this.map === other.map && this.getDistance(other.x,other.y) < 32);				
	}

	isPosWall() {
		let leftBumper = {x:this.x - 30,y:this.y};
		let rightBumper = {x:this.x + 30,y:this.y};
		let upBumper = {x:this.x,y:this.y - 10};
		let downBumper = {x:this.x,y:this.y + 30};
		
		if(this.mapGrid.isPositionWall(rightBumper) || this.mapGrid.isPositionWall(leftBumper)
		|| this.mapGrid.isPositionWall(upBumper) || this.mapGrid.isPositionWall(downBumper)) {
			this.x= Math.random() * Maps.list[this.map].width;
			this.y= Math.random() * Maps.list[this.map].height;	
		}
	}

	toDelete() {
		if(this.timer++ > 100)
			this.toRemove = true;
	}

	getInitPack() {
		return {
			id:this.id,
			x:this.x,
			y:this.y,
			map:this.map,
		};
	}

	getUpdatePack() {
		return {
			id:this.id,
			x:this.x,
			y:this.y,		
		};
	}

	static randomMap() {
		let map = ['field','map2'];
		let index = Math.round(Math.random());

		return map[index];
	}	
}

class Actor extends Entity {
	
	constructor(param) {
		super(param);
		this.type = param.type;
		this.pressingRight = false;
		this.pressingLeft = false;
		this.pressingUp = false;
		this.pressingDown = false;
		this.isAttacking = false;
		this.aimAngle = 0;
		this.maxSpd = param.maxSpd || 5;
		this.hp = param.hp || 10 ;  
		this.hpMax = param.hpMax || 10;
		this.isDead = false;

		this.spriteAnimCounter = 0;

		this.bullets = param.bullets || 12;
		this.isReloading = false;
		this.reloadSpd = param.reloadSpd || 1;		
		this.atkSpd = param.atkSpd || 1;
		this.firingSpd = 1.5;

		this.getScore = param.getScore || 1;
	}

	update() {
		this.updateSpd();
		super.update();	
		this.updateSprite();

		this.timer+=0.1;
		if(this.timer > (this.firingSpd - (0.02*(this.atkSpd-1)))) {
			if(this.type === 'enemy')
				this.isAttacking = true;
			this.performAttack();
			this.timer = 0;
		}
		
		if(this.isReloading)
			this.reloadBullets();
	}

    updateSpd() {
        if(this.pressingRight)
            this.spdX = this.maxSpd;
        else if(this.pressingLeft)
            this.spdX = -this.maxSpd;
        else
            this.spdX = 0;

        if(this.pressingUp)
            this.spdY = -this.maxSpd;
        else if(this.pressingDown)
            this.spdY = this.maxSpd;
        else
            this.spdY = 0;
    }

	updateSprite() {
		if(this.pressingRight || this.pressingLeft || this.pressingDown || this.pressingUp)
			this.spriteAnimCounter += 0.2;
	}

	performAttack() {
		if(this.isAttacking && this.bullets !== 0 && !this.isReloading) {
			this.shootBullet(this.aimAngle);
			if(this.type === 'enemy')
				this.isAttacking = false;
			this.bullets--;
		} else if(!this.isReloading && this.bullets === 0)
			this.isReloading = true;
	}
	
	shootBullet(angle) {
        new Bullet({
			parent:this.id,
			parentType: this.type,
			angle:angle,
			x:this.x,
			y:this.y,
			map:this.map
		});
	}

	reloadBullets() {
		if(this.bullets >= 12 && this.isReloading) {
			this.bullets = 12;
			this.isReloading = false;
			return;
		}
		this.bullets+=this.reloadSpd;			
	}

	drop(chance){
		if((Math.random() * 100) > chance)
			return;

		let boost = ['boostSpd','boostAtk','boostReload','boostHP'];
		let category = boost[Math.round(Math.random() * 3)];

		if(DEBUG)
			category = boost[3];

		Upgrade.spawn({
			x: this.x,
			y: this.y,
			category: category,
			map: this.map
		});
	}
}

class Player extends Actor {
		
	constructor(param) {
		super(param);
		this.type= "player",
		this.username = param.username;
		this.socket = param.socket;
		this.rank = null;
		this.getScore = 3;
		//score
		this.score = 0;		
		this.highscore = param.progress.highscore;

		//player stuff
		this.inventory = new Inventory(this.id);				

		//base player stuff	
		this.baseSpd = this.maxSpd;
		this.baseAtkSpd = this.atkSpd;
		this.baseReload = this.reloadSpd;
		this.baseHP = this.hpMax;

		//stat caps
		this.MaxHP = 50;
		this.MaxReload = 5;
		this.MaxSpd = 15;

		Player.list[this.id] = this;
        Entity.initPack.player.push(this.getInitPack());
	}

	update() {
		this.isPosWall();		
		super.update();			

		if(leaderboard.updated)
			this.updatePlayerRank();
	}

	respawn() {
		if(this.hp <= 0) {
			this.drop(50);

			this.hpMax = 10;
			this.hp = this.hpMax;
			this.isDead = false;

			this.inventory.items = [];
			this.socket.emit('updateInventory', this.inventory);
			this.score = 0;

			this.atkSpd = 1;
			this.reloadSpd = 1;
			this.maxSpd = 5;
			this.bullets = 12;

			this.baseSpd = 5;
			this.baseAtkSpd = 1;
			this.baseReload = 1;
			this.baseHP = 10;

			this.getScore = 1;
		}

		this.x= Math.random() * Maps.list[this.map].width;
		this.y= Math.random() * Maps.list[this.map].height;
		
		//check if player spawned on wall
		let leftBumper = {x:this.x - 25,y:this.y};
		let rightBumper = {x:this.x + 25,y:this.y};
		let upBumper = {x:this.x,y:this.y - 10};
		let downBumper = {x:this.x,y:this.y + 30};
		
		if(this.mapGrid.isPositionWall(rightBumper) || this.mapGrid.isPositionWall(leftBumper)
		|| this.mapGrid.isPositionWall(upBumper) || this.mapGrid.isPositionWall(downBumper))
			this.respawn();					
	}

	isPosWall() {
		let leftBumper = {x:this.x - 25,y:this.y};
		let rightBumper = {x:this.x + 25,y:this.y};
		let upBumper = {x:this.x,y:this.y - 10};
		let downBumper = {x:this.x,y:this.y + 30};
		
		if(!this.mapGrid.isPositionWall(upBumper) && !this.mapGrid.isPositionWall(downBumper) && !this.mapGrid.isPositionWall(leftBumper) && !this.mapGrid.isPositionWall(rightBumper)) {			
			if(this.maxSpd === 0)
				this.maxSpd = this.baseSpd;
		}
		
		if(this.mapGrid.isPositionWall(rightBumper)) {
			this.maxSpd = 0;
			this.x -= 5;
		}
		
		if(this.mapGrid.isPositionWall(leftBumper)) {
			this.maxSpd = 0;
			this.x += 5;
		}

		if(this.mapGrid.isPositionWall(upBumper)) {
			this.maxSpd = 0;
			this.y += 5;
		}

		if(this.mapGrid.isPositionWall(downBumper)) {
			this.maxSpd = 0;
			this.y -= 5;
		}					
	}

	updatePlayerRank() {
		let player = this;

		Database.getRanking(player.username,player.map, data => {
			if(data) {			
				if(player.rank === data.rank)
					return;
				else
					player.rank = data.rank;
			} else
				player.rank = null;
		});
	}

	updateHighScore() {
		if(this.score < this.highscore)
			return;
			
		if(this.rank === null)
			leaderboard.updateLeaderboard(this);
		else
			leaderboard.updateRanking(this);			

		this.highscore = this.score;					
	}

    getInitPack() {
        return {
			id:this.id,
			x:this.x,
			y:this.y,	
			username:this.username,	
			hp:this.hp,
			hpMax:this.hpMax,
			score:this.score,
			highscore:this.highscore,
			map:this.map,
			spriteAnimCounter: this.spriteAnimCounter,
			aimAngle: this.aimAngle,
			inventory: this.inventory,
			bullets: this.bullets,
			atkSpd: this.atkSpd,
			reloadSpd:this.reloadSpd,
			maxSpd:this.maxSpd
		};		
    }

    getUpdatePack() {
        return {
			id:this.id,	
			x:this.x,
			y:this.y,	
			hp:this.hp,
			score:this.score,
			highscore:this.highscore,
			spriteAnimCounter: this.spriteAnimCounter,
			aimAngle: this.aimAngle,
			inventory: this.inventory,
			bullets: this.bullets,
			atkSpd: this.atkSpd,
			reloadSpd:this.reloadSpd,
			maxSpd:this.maxSpd
		};		
    }
	
    static list = {};

    static onConnect(socket, username, progress, map) {

		Database.userStatus({username:username,online:true});

		let player = new Player({
				username: username,
                id: socket.id,
                socket: socket,
				map: map,
				progress:progress
			});

		socket.emit('updateInventory', player.inventory);
		Maps.list[player.map].playersInMap += 1;

		leaderboard.updated = true;
		leaderboard.getLeaderBoard(player);
		//get player rank if any
		Database.getRanking(player.username,player.map, data => {
			if(data)
				player.rank = data.rank;
		});
		
		//check if player spawned on wall
		let leftBumper = {x:player.x - 30,y:player.y};
		let rightBumper = {x:player.x + 30,y:player.y};
		let upBumper = {x:player.x,y:player.y - 10};
		let downBumper = {x:player.x,y:player.y + 30};

		if(player.mapGrid.isPositionWall(rightBumper) || player.mapGrid.isPositionWall(leftBumper)
		|| player.mapGrid.isPositionWall(upBumper) || player.mapGrid.isPositionWall(downBumper))
			player.respawn();

		socket.emit('init',{
			selfId:socket.id,
			player:Player.getAllInitPack(),
			bullet:Bullet.getAllInitPack(),
			enemy:Enemy.getAllInitPack(),
			upgrade:Upgrade.getAllInitPack(),
			item:Item.getAllInitPack(),
		});

						
        socket.on('keyPress', data => {
            if(data.inputId === 'left')
                player.pressingLeft = data.state;
            else if(data.inputId === 'right')
                player.pressingRight = data.state;
            else if(data.inputId === 'up')
                player.pressingUp = data.state;
            else if(data.inputId === 'down')
                player.pressingDown = data.state;
            else if(data.inputId === 'attack')
                player.isAttacking = data.state;
            else if(data.inputId === 'mouseAngle')
                player.aimAngle = data.state;			
        });

		socket.on('useItem', data => {
			player.inventory.useItem(data.id, player);
			socket.emit('updateInventory', player.inventory);			
		});
		socket.on('refreshInven', data => {
			if(data)
				socket.emit('updateInventory', player.inventory);	
		});

		socket.on('sendMsgToServer', data => {
			if(data.length > 0){
				for(let i in Player.list)
					Player.list[i].socket.emit('addToChat',player.username + ': ' + data, player.map);
			}
		});
		socket.on('sendPmToServer', data => { //data:{username,message}
			let recipientSocket = null;
			let recipientMap = null;

			for(let i in Player.list)
				if(Player.list[i].username === data.username) {
					recipientSocket = Player.list[i].socket;
					recipientMap = Player.list[i].map;
				}

			if(recipientSocket === null)
				socket.emit('addToChat','The player ' + data.username + ' is not online.',player.map);

			else if(recipientMap === data.map) {
				recipientSocket.emit('addToChat','From ' + player.username + ':' + data.message,player.map);
				socket.emit('addToChat','To ' + data.username + ':' + data.message,player.map);
			} else
				socket.emit('addToChat','The player ' + data.username + ' is in another map.',player.map);
		});		
    }

    static onDisconnect(socket) {
		let player = Player.list[socket.id];	
		if(!player)
			return;

		Database.savePlayerProgress({
			username:player.username,
			highscore:player.highscore,
		},player.map);

		Database.userStatus({username:player.username,online:false});
		Maps.list[player.map].playersInMap -= 1;
		delete Player.list[socket.id];
		Entity.removePack.player.push(socket.id);
    }

    static getAllInitPack() {
        let players = [];
        for(let i in Player.list)
            players.push(Player.list[i].getInitPack());
        return players;
    }

    static update() {
        let pack = [];
        
        for(let i in Player.list) {
            let player = Player.list[i];
            player.update();
            pack.push(player.getUpdatePack());
        }
        return pack;
    }
}

class Enemy extends Actor {

	constructor(param) {
		super(param);
		this.type = 'enemy';
		this.enemyType = param.enemyType || 'bat';
		this.target = param.target || null;

		Enemy.list[this.id] = this;
        Entity.initPack.enemy.push(this.getInitPack());
	}

	update() {
		this.updateKeyPress(this.target);
		this.updateAim(this.target);
		super.update();

		if(Maps.list[this.map].playersInMap > 0)
			this.checkForPlayer(64);
	}

	checkForPlayer(distance) {
		if(Player.list[this.target.id] !== undefined) {
			for(let i in Player.list) 
				if(this.getDistance(Player.list[i].x,Player.list[i].y) < distance && this.map === Player.list[i].map)
					this.target = Player.list[i];
		}

		else if(Player.list[this.target.id] === undefined) {
			let playerKeys = Object.keys(Player.list);
			let randomIndex = playerKeys[Math.floor(Math.random() * playerKeys.length)];
			this.target = Player.list[randomIndex];

			while(this.target.map != this.map) {
				randomIndex = playerKeys[Math.floor(Math.random() * playerKeys.length)];
				this.target = Player.list[randomIndex];
			}
		}
	}

	updateKeyPress(player) {
		let diffX = player.x - this.x;
		let diffY = player.y - this.y;

		this.pressingRight = diffX > 3;
		this.pressingLeft = diffX < -3;
		this.pressingDown = diffY > 3;
		this.pressingUp = diffY < -3;
	}

	updateAim(player) {
		let diffX = player.x - this.x;
		let diffY = player.y - this.y;

		this.aimAngle = Math.atan2(diffY,diffX) / Math.PI * 180;
	}	

	getInitPack() {
        return {
			id:this.id,
			x:this.x,
			y:this.y,	
			enemyType: this.enemyType,	
			hp:this.hp,
			hpMax:this.hpMax,
			map:this.map,
			spriteAnimCounter: this.spriteAnimCounter,
			aimAngle: this.aimAngle,
		};		
    }

    getUpdatePack() {
        return {
			id:this.id,	
			x:this.x,
			y:this.y,	
			hp:this.hp,
			spriteAnimCounter: this.spriteAnimCounter,
			aimAngle: this.aimAngle,
		};		
    }

	static list = {};
	
	static update() {
        let pack = [];
		for(let i in Enemy.list) {
			let enemy = Enemy.list[i];
			enemy.update();
			if(enemy.toRemove){
				enemy.drop(25);				
				delete Enemy.list[i];
				Entity.removePack.enemy.push(enemy.id);
				Maps.list[enemy.map].enemiesInMap -= 1;
			} else
				pack.push(enemy.getUpdatePack());		
		}
		return pack;
	}

	static getAllInitPack() {
        let enemies = [];
	    for(let i in Enemy.list)
		    enemies.push(Enemy.list[i].getInitPack());
	    return enemies;
	}

	static spawn(data) {
		new Enemy({
			enemyType: data.type,
			maxSpd: data.maxSpd,
			map: data.map,
			target: data.target,
			getScore: data.getScore,
		});

		Maps.list[data.map].enemiesInMap += 1;
	}

	static randomGenerate() {
		let map = Entity.randomMap();

		if(Maps.list[map].playersInMap > 0 && Maps.list[map].enemiesInMap < 20)	{	
			let type = ["bat","bee"];
			let enemyType = type[Math.round(Math.random())];
			let maxSpd = 0;
			let getScore = 0;
			let playerKeys = Object.keys(Player.list);
			let randomIndex = playerKeys[Math.floor(Math.random() * playerKeys.length)];
			let target = Player.list[randomIndex];

			while(target.map != map) {
				randomIndex = playerKeys[Math.floor(Math.random() * playerKeys.length)];
				target = Player.list[randomIndex];
			}

			switch(enemyType) {
				case "bat":
					maxSpd = 2;
					getScore = 1;
					break;
				
				case "bee":
					maxSpd = 3;
					getScore = 2;
					break;
			}

			Enemy.spawn({
				type:enemyType,
				maxSpd:maxSpd,
				map:map,
				target: target,
				getScore: getScore
			});
		}
	}
}

class Bullet extends Entity {
	
	constructor(param) {
		super(param);
		this.angle = param.angle;
		this.spdX = Math.cos(param.angle/180*Math.PI) * 10;
		this.spdY = Math.sin(param.angle/180*Math.PI) * 10;
		this.parent = param.parent;		
		this.dmg = 3;
		this.combatType = param.parentType;
		
		Bullet.list[this.id] = this;
        Entity.initPack.bullet.push(this.getInitPack());
	}

	update() {
		super.update();
		this.isPosWall();

		this.toDelete();

		this.bulletCollision();
	}

	bulletCollision() {
		//check if bullet is hitting another player
		for(let i in Player.list) {
			let p = Player.list[i];
						
			if(this.testCollision(p) && this.parent !== p.id) {
				if(!DEBUG)
					p.hp -= this.dmg;	
				if(p.hp <= 0 && !p.isDead){
					p.isDead = true;					
					let shooter = Player.list[this.parent];
					if(shooter) {
						shooter.score += p.getScore;
						shooter.updateHighScore();						
					}					
					p.respawn();				
				}
				this.toRemove = true;
			}
		}

		//check if bullet is hitting an enemy and is being shot by a player
		for(let i in Enemy.list) {
			let e = Enemy.list[i];
			
			if(this.testCollision(e) && this.parent !== e.id && this.combatType === "player") {
				e.hp -= this.dmg;

				if(e.hp <= 0 && !e.isDead) {
					e.isDead = true;
					let shooter = Player.list[this.parent];
					if(shooter) {
						shooter.score += e.getScore;
						shooter.updateHighScore();						
					}										
					e.toRemove = true;				
				}
				this.toRemove = true;
			}
		}
	}

	isPosWall() {
		let leftBumper = {x:this.x - 20,y:this.y};
		let rightBumper = {x:this.x + 20,y:this.y};
		let upBumper = {x:this.x,y:this.y - 5};
		let downBumper = {x:this.x,y:this.y + 20};
		
		if(this.mapGrid.isPositionWall(rightBumper) || this.mapGrid.isPositionWall(leftBumper)
		|| this.mapGrid.isPositionWall(upBumper) || this.mapGrid.isPositionWall(downBumper))
			this.toRemove = true;		
	}

	static list = {};

	static update() {
		let pack = [];

		for(let i in Bullet.list) {
			let bullet = Bullet.list[i];
			bullet.update();
			if(bullet.toRemove) {
				delete Bullet.list[i];
				Entity.removePack.bullet.push(bullet.id);
			} else
				pack.push(bullet.getUpdatePack());		
		}
		return pack;
	}

	static getAllInitPack() {
		let bullets = [];
		for(let i in Bullet.list)
			bullets.push(Bullet.list[i].getInitPack());
		return bullets;
	}
}

class Upgrade extends Entity {
	
	constructor(param) {
		super(param);
		this.type= "upgrade";
		this.category = param.category;
		this.boostTime = param.boostTime || 100;

		Upgrade.list[this.id] = this;
		Entity.initPack.upgrade.push(this.getInitPack());
	}

	update() {
		this.isPosWall();		
		super.update();

		this.toDelete();

		this.upgradeCollision();
	}

	upgradeCollision() {
		for(let i in Player.list) {
			let p = Player.list[i];

			if(this.testCollision(p)) {
				switch(this.category) {
					case "boostSpd":
						if(p.maxSpd < p.MaxSpd) {
							p.maxSpd += 1;
							p.baseSpd += 1;
							p.getScore += 0.1;
						}
						break;

					case "boostAtk":
						p.atkSpd += 1;
						p.getScore += 1.5;
						break;
					
					case 'boostReload':
						if(p.reloadSpd < p.MaxReload) {
							p.reloadSpd += 1;
							p.getScore += 0.3;
						}
						break;
					
					case 'boostHP':
						if(p.hpMax < p.MaxHP ) {
							p.hpMax += 10;
							p.getScore += 1;
						}
						p.hp = p.hpMax;
						break;
				}	
				this.toRemove = true;	
			}				
		}
	}

	static list = {};

	static update() {
		let pack = [];
		for(let i in Upgrade.list) {
			let upgrade = Upgrade.list[i];
			upgrade.update();
			if(upgrade.toRemove){
				delete Upgrade.list[i];
				Entity.removePack.upgrade.push(upgrade.id);
			} else
				pack.push(upgrade.getUpdatePack());		
		}
		return pack;
	}

	static getAllInitPack() {
		let upgrades = [];
		for(let i in Upgrade.list)
			upgrades.push(Upgrade.list[i].getInitPack());
		return upgrades;
	}

	static spawn(data) {
		new Upgrade({
			x: data.x,
			y: data.y,
			category: data.category,
			map: data.map,
		});
	}

	static randomGenerate() {
		let map = Entity.randomMap();

		if(Maps.list[map].playersInMap > 0) {				
			let boost = ['boostSpd','boostAtk','boostReload','boostHP'];
			let category = boost[Math.round(Math.random() * 3)];

			if(DEBUG)
				category = boost[3];

			Upgrade.spawn({
				category: category,
				map: map
			});
		}
	}
}

class Item extends Entity {
	
	constructor(param) {
		super(param);
		this.type= "item";
		this.name = param.name || "potion";
		this.amount = param.amount || 1;

		Item.list[this.id] = this;
		Entity.initPack.item.push(this.getInitPack());
	}

	update() {
		this.isPosWall();
		super.update();
		
		this.toDelete();

		this.itemCollision();
	}

	itemCollision() {		
		for(let i in Player.list) {
			let p = Player.list[i];

			if(this.testCollision(p) && p.inventory.items.length < 1) {
				p.inventory.addItem(this.name,this.amount);
				p.socket.emit('updateInventory', p.inventory);
				this.toRemove = true;		
			}
		}
	}

	static list = {};

	static update() {
		let pack = [];

		for(let i in Item.list) {
			let item = Item.list[i];
			item.update();
			if(item.toRemove){
				delete Item.list[i];
				Entity.removePack.item.push(item.id);
			} else
				pack.push(item.getUpdatePack());		
		}
		return pack;
	}

	static getAllInitPack() {
		let items = [];
		for(let i in Item.list)
			items.push(Item.list[i].getInitPack());
		return items;
	}

	static spawn(data) {
		new Item({
			name: data.name,
			amount: data.amount,
			map: data.map,
		});
	}

	static randomGenerate() {
		let map = Entity.randomMap();

		if(Maps.list[map].playersInMap > 0)
		{	
			let name = "superAttack";	
			let amount = 1;		
				//name, amount
				//if(Math.random() < 0.5)
					//name = "superAttack";

				//if(name === "potion")
					//amount = Math.round(1 + Math.random() * 5);
				//else if(name === "superAttack")
					//amount = Math.round(1 + Math.random() * 3);

			Item.spawn({
				name: name,
				amount: amount,
				map: map
			});
		}		
	}
}

module.exports = {Entity, Player, Bullet, Enemy, Upgrade, Item};