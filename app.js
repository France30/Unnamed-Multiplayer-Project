const {Player, Enemy, Upgrade, Item} = require('./server/serverEntities.js');
const {getFrameUpdateData} = require('./server/frameUpdateData.js');
const leaderboard = require('./server/leaderBoard.js');
const Database = require('./server/Database.js');

const express = require('express');
const app = express();
const serv = require('http').Server(app);

app.get('/', (req, res) => res.sendFile(__dirname + '/client/index.html'));
app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

let SOCKET_LIST = {};


let DEBUG = false;
let frameCount = 0;

const io = require('socket.io')(serv,{});
io.sockets.on('connection', socket => {
	
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;
	
	socket.on('signIn', data => { //{username,password}
		Database.isValidPassword(data, res => {
			if(!res)
				return socket.emit('signInResponse',{success:false, message:"Invalid password"});

			Database.isUserOnline(data.username, res => {
				if(res.online)
					return socket.emit('signInResponse',{success:false, message:"User is already online"});
							
				Database.getPlayerProgress(data.username,data.map, progress => {					
					Player.onConnect(socket,data.username,progress,data.map);
					socket.emit('signInResponse',{success:true});										
				});											
			});
		});
	});
	socket.on('signUp', data => {
		Database.isUsernameTaken(data, res => {
			if(res)
				socket.emit('signUpResponse',{success:false, message: "Username is already taken"});		
			else
				Database.addUser(data, () => socket.emit('signUpResponse',{success:true, message: "Sign up successful"}));
		});		
	});
				
	socket.on('disconnect', _ => {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});

	socket.on('evalServer', data => {
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);		
	});
	
	socket.on('resizeBoard', data => {
		leaderboard.updated = data;
	})	
});

setInterval( _ => {
	let packs = getFrameUpdateData();
	
	//sends data to client
	for(let i in SOCKET_LIST) {
		let socket = SOCKET_LIST[i];
		socket.emit('init', packs.initPack);
		socket.emit('update', packs.updatePack);
		socket.emit('remove', packs.removePack);

		if(Player.list[socket.id])
			leaderboard.getLeaderBoard(Player.list[socket.id]);
	}
	
	//random spawning of stuff
	if(Object.keys(Player.list).length > 0) {
		frameCount++;
		if(frameCount % 100 === 0)
			Enemy.randomGenerate();
		if(frameCount % 75 === 0) {
			Upgrade.randomGenerate();
			Item.randomGenerate();
		}	
	}
	
},1000/25);

