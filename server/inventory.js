class Inventory {

	constructor(playerId) { 
		this.items = [];//{id:"itemId",amount:1}
		this.playerId=playerId;
	}

    addItem(id,amount){
		for(let i = 0 ; i < this.items.length; i++){
			if(this.items[i].id === id){
				this.items[i].amount += amount;
				return;
			}
		}
		if(this.items.length < 3) {
			this.items.push({id:id,amount:amount});
		}
    }

    removeItem(id,amount){
		for(let i = 0 ; i < this.items.length; i++){
			if(this.items[i].id === id){
				this.items[i].amount -= amount;
				if(this.items[i].amount <= 0) {
					this.items.splice(i,1);
				}
				return;
			}
		}    
    }
	
    hasItem(id,amount){
		for(let i = 0 ; i < this.items.length; i++) {
			if(this.items[i].id === id){
				return this.items[i].amount >= amount;
			}
		}  
		return false;
    }

	useItem(itemId, player){
		let item = _Item.list[itemId];
		item.event(player);
	}
}


class _Item {
	constructor(id,name,event) {
		this.id=id;
		this.name=name;
		this.event=event;
		_Item.list[this.id] = this;
	}
	
	static list = {};
}

new _Item("potion","Potion",player => {
	player.hp = 10;
	player.inventory.removeItem("potion",1);
});

new _Item("superAttack","Super Attack",player => {
	for(let i = 0 ; i < 360; i++)
		player.shootBullet(i);
	player.inventory.removeItem("superAttack", 1);
});

module.exports = {Inventory, _Item};