const {Entity, Player, Bullet, Enemy, Upgrade, Item} = require('./serverEntities.js');

const getFrameUpdateData = () => {
    let pack = {
        initPack:{
            player: Entity.initPack.player,
            enemy: Entity.initPack.enemy,
            bullet: Entity.initPack.bullet,
            upgrade: Entity.initPack.upgrade,
            item: Entity.initPack.item,
        },
        removePack:{
            player:Entity.removePack.player,
            enemy:Entity.removePack.enemy,
            bullet: Entity.removePack.bullet,
            upgrade: Entity.removePack.upgrade,
            item: Entity.removePack.item,
        },
        
        updatePack:{
            player: Player.update(),
            enemy:Enemy.update(),
            bullet: Bullet.update(),
            upgrade: Upgrade.update(),
            item: Item.update(),
        }
    };
    
    Entity.initPack.player = [];
    Entity.initPack.enemy = [];
    Entity.initPack.bullet = [];
    Entity.initPack.upgrade = [];
    Entity.initPack.item = [];

    Entity.removePack.player = [];
    Entity.removePack.enemy = [];
    Entity.removePack.bullet = [];
    Entity.removePack.upgrade = [];
    Entity.removePack.item = [];

    return pack;
}

module.exports = {getFrameUpdateData};