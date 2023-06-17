const Database = require('./Database.js');

class leaderboard {

    constructor() {}

    static updated = true;

    static getLeaderBoard(player) {
        if(!leaderboard.updated)
            return;

        let board = {};
	    for(let i = 1; i <= 10; i++) {		
		    Database.getLeaderboard(i, player.map, data => {
		        board[data.rank] = data;
                if(i === 10) {
                    if(Object.keys(board).length === 10) {
                        player.socket.emit('refreshLeaderBoard',board);
                        leaderboard.updated = false;
                    } else
                        leaderboard.updated = true;                                        
                }
		    });        
	    }  
    }

    //check if player is in board, update leader board if not, update ranking if yes
    static updateLeaderboard(player){   
	    Database.getLeaderboard(10, player.map, data => {        
            if(player.score > data.score) {
		        Database.updateLeaderboard({rank: 10, username: player.username, score: player.score}, player.map);
                leaderboard.updated = true;                
            }                                
        });                        
    }

    static updateRanking(player){
  
        if(player.rank > 1) {
            Database.getLeaderboard(player.rank - 1, player.map, data => {
                if(player.score > data.score) {
                    Database.updateLeaderboard({rank: data.rank, username: player.username, score: player.score}, player.map);
                    Database.updateLeaderboard({rank: player.rank, username: data.username, score: data.score}, player.map);                     
                    leaderboard.updated = true;              
                }

                else {
                    Database.getRanking(player.username, player.map, data => {
                        if(player.score > data.score) {
                            Database.updateLeaderboard({rank: data.rank, username: player.username, score: player.score}, player.map);
                            leaderboard.updated = true;
                        }
                    });
                }
            }); 
        }

        else if(player.rank === 1) {
            Database.getLeaderboard(1, player.map, data => {
                if(player.score > data.score) {
                    Database.updateLeaderboard({rank: 1, username: player.username, score: player.score}, player.map);
                    leaderboard.updated = true;
                }
            });         
        }   
    }  
}

module.exports = leaderboard;