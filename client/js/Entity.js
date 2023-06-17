const Entity = initPack => {
    let self = {
       id: initPack.id,
       x: initPack.x,
       y: initPack.y,
       map: initPack.map
    }

    self.draw = Img => {
        if(Player.list[selfId].map !== self.map)
            return;
        let width = Img.width/2;
        let height = Img.height/2;
        
        let x = self.x - Player.list[selfId].x + WIDTH/2;
        let y = self.y - Player.list[selfId].y + HEIGHT/2;
        
        ctx.drawImage(Img,
            0,0,Img.width,Img.height,
            x-width/2,y-height/2,width,height);
    }

    return self;
}

const Actor = initPack => {
    let self = Entity(initPack);

    self.hp = initPack.hp;
    self.hpMax = initPack.hpMax;
    self.aimAngle = initPack.aimAngle;

    self.spriteAnimCounter = initPack.spriteAnimCounter;

    self.draw = (Img, player = false, username = "") => {	
        if(Player.list[selfId].map !== self.map)
            return;

        let x = self.x - Player.list[selfId].x + WIDTH/2;
        let y = self.y - Player.list[selfId].y + HEIGHT/2;
        
        let hpWidth = 30 * self.hp / self.hpMax;
        ctx.fillStyle = 'red';
        ctx.fillRect(x - hpWidth/2,y - 40,hpWidth,4);
                        
        let width = Img.width/1.8;
        let height = Img.height/1.8;

        if(player){
            let nameWidth = username.length;
            ctx.fillStyle = "black";
            ctx.font = '20px Arial';
            ctx.fillText(username, x - (width/4 * nameWidth/2),y+60);
        }

        let frameWidth = Img.width/3;
        let frameHeight = Img.height/3.9;

        let aimAngle = self.aimAngle;
        if(aimAngle < 0)
            aimAngle = 360 + aimAngle;

        let directionMod = 3;	//draw right
        if(aimAngle >= 45 && aimAngle < 135)	//down
            directionMod = 2;
        else if(aimAngle >= 135 && aimAngle < 225)	//left
            directionMod = 1;
        else if(aimAngle >= 225 && aimAngle < 315)	//up
            directionMod = 0;
            
        let walkingMod = Math.floor(self.spriteAnimCounter) % 3;//1,2
               
        ctx.drawImage(Img,
            walkingMod*frameWidth,directionMod*frameHeight, frameWidth,frameHeight,
            x-width/2,y-height/2,width,height);
    }    
    return self;
}


//Player
const Player = initPack => {
    let self = Actor(initPack);

    self.score = initPack.score;
    self.highscore = initPack.highscore;
    self.inventory = initPack.inventory;
    self.username = initPack.username;
    self.bullets = initPack.bullets;
    self.atkSpd = initPack.atkSpd;
    self.reloadSpd = initPack.reloadSpd;
    self.maxSpd = initPack.maxSpd;    
    
    Player.list[self.id] = self;

    return self;
}
Player.list = {};

Player.init = data => {
    for(let i = 0 ; i < data.player.length; i++)
        Player(data.player[i]); 
}

Player.update = data => {        
    for(let i = 0 ; i < data.player.length; i++){
        let pack = data.player[i];
        let p = Player.list[pack.id];
        if(p){
            if(pack.x !== null)
                p.x = pack.x;
            if(pack.y !== null)
                p.y = pack.y;
            if(pack.hp !== null)
                p.hp = pack.hp;
            if(pack.score !== null)
                p.score = pack.score;
            if(pack.highscore !== null)
                p.highscore = pack.highscore;
            if(pack.spriteAnimCounter !== null)
                p.spriteAnimCounter = pack.spriteAnimCounter;
            if(pack.aimAngle !== null)
                p.aimAngle = pack.aimAngle;
            if(pack.inventory !== null)
                p.inventory = pack.inventory;
            if(pack.bullets !== null)
                p.bullets = pack.bullets;
            if(pack.atkSpd !== null)
                p.atkSpd = pack.atkSpd;
            if(pack.reloadSpd !== null)
                p.reloadSpd = pack.reloadSpd;
            if(pack.maxSpd !== null)
                p.maxSpd = pack.maxSpd;
        }
    }
}

Player.remove = data => {
    for(let i = 0 ; i < data.player.length; i++)
        delete Player.list[data.player[i]];
}


//Enemy
const Enemy = initPack => {
    let self = Actor(initPack);
    self.enemyType = initPack.enemyType;

    Enemy.list[self.id] = self;
    return self;
}
Enemy.list = {};

Enemy.init = data => {
    for(let i = 0 ; i < data.enemy.length; i++)
        Enemy(data.enemy[i]); 
}

Enemy.update = data => {
    for(let i = 0 ; i < data.enemy.length; i++) {        
        let pack = data.enemy[i];
        let e = Enemy.list[pack.id];
        if(e){
            if(pack.x !== null)
                e.x = pack.x;
            if(pack.y !== null)
                e.y = pack.y;
            if(pack.hp !== null)
                e.hp = pack.hp;
            if(pack.spriteAnimCounter !== null)
                e.spriteAnimCounter = pack.spriteAnimCounter;
            if(pack.aimAngle !== null)
                e.aimAngle = pack.aimAngle;
        }
    }
}

Enemy.remove = data => {
    for(let i = 0 ; i < data.enemy.length; i++)
        delete Enemy.list[data.enemy[i]];
}

//Bullet
const Bullet = initPack => {
    let self = Entity(initPack);

    Bullet.list[self.id] = self;
    return self;
}
Bullet.list = {};

Bullet.init = data => {
    for(let i = 0 ; i < data.bullet.length; i++)
        Bullet(data.bullet[i]);
}

Bullet.update = data => {
    for(let i = 0 ; i < data.bullet.length; i++){
        let pack = data.bullet[i];
        let b = Bullet.list[data.bullet[i].id];
        if(b){
            if(pack.x !== null)
                b.x = pack.x;
            if(pack.y !== null)
                b.y = pack.y;
        }
    }
}

Bullet.remove = data => {
    for(let i = 0 ; i < data.bullet.length; i++)
        delete Bullet.list[data.bullet[i]];
}


//upgrades
const Upgrade = initPack => {
    let self = Entity(initPack);

    Upgrade.list[self.id] = self;
    return self;
}
Upgrade.list = {};

Upgrade.init = data => {
    for(let i = 0 ; i < data.upgrade.length; i++)
        Upgrade(data.upgrade[i]);
}

Upgrade.update = data => {
    for(let i = 0 ; i < data.upgrade.length; i++){
        let pack = data.upgrade[i];
        let u = Upgrade.list[data.upgrade[i].id];
        if(u){
            if(pack.x !== null)
                u.x = pack.x;
            if(pack.y !== null)
                u.y = pack.y;
        }
    }
}

Upgrade.remove = data => {
    for(let i = 0 ; i < data.upgrade.length; i++)
        delete Upgrade.list[data.upgrade[i]];
}


//items
const _item = initPack => {
    let self = Entity(initPack);

    _item.list[self.id] = self;
    return self;
}
_item.list = {};

_item.init = data => {
    for(let i = 0 ; i < data.item.length; i++)
        _item(data.item[i]);
}

_item.update = data => {
    for(let i = 0 ; i < data.item.length; i++){
        let pack = data.item[i];
        let _i = _item.list[data.item[i].id];
        if(_i){
            if(pack.x !== null)
                _i.x = pack.x;
            if(pack.y !== null)
                _i.y = pack.y;
        }
    }
}

_item.remove = data => {
    for(let i = 0 ; i < data.item.length; i++)
        delete _item.list[data.item[i]];
}