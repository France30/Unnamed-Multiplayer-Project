let USE_DB = true;
const mongojs = USE_DB ? require("mongojs") : null;
const db = USE_DB ? mongojs('localhost:27017/MyGame', ['account','progress']) : null;

class Database {
    constructor() {}

    static isValidPassword(data,cb){
        if(!USE_DB)
            return cb(true);
        db.account.findOne({username:data.username,password:data.password}, (err,res) => {
            if(res)
                cb(true);
            else
                cb(false);
        });
    }
    static isUserOnline(username,cb){
        if(!USE_DB)
            return cb(true);
        db.accountStatus.findOne({username:username}, (err,res) => cb({online:res.online}));
    }
    static isUsernameTaken(data,cb){
        if(!USE_DB)
            return cb(false);
        db.account.findOne({username:data.username}, (err,res) => {
            if(res)
                cb(true);
            else
                cb(false);
        });
    }
    static userStatus(data,cb){
        cb = cb || function(){}
        if(!USE_DB)
            return cb();
        db.accountStatus.update({username:data.username},{$set: data},{upsert:true},cb);
    }
    
    static addUser(data,cb){
        if(!USE_DB)
            return cb();
        db.account.insert({username:data.username,password:data.password}, err => {
            Database.userStatus({username:data.username,online:false});
            Database.savePlayerProgress({username:data.username,highscore:0},'field', _ => cb());
            Database.savePlayerProgress({username:data.username,highscore:0},'map2',  _ => {});
        });
    }

    static getPlayerProgress(username,map,cb){
        if(!USE_DB)
            return cb({highscore:0});
        Database.progress[map].findOne({username:username}, (err,res) => cb({highscore:res.highscore}));
    }    
    static savePlayerProgress(data,map,cb){
        cb = cb || function(){}
        if(!USE_DB)
            return cb();
        Database.progress[map].update({username:data.username},{$set: data},{upsert:true},cb);
    }
      
    //leaderboard
    static getLeaderboard(rank,map,cb){
        if(!USE_DB)
            return cb({rank: 1, username: "", score: 0});
        Database.board[map].findOne({rank:rank}, (err,res) => cb({rank: res.rank, username: res.username, score: res.score}));
    }
    static updateLeaderboard(data,map,cb){
        cb = cb || function(){}
        if(!USE_DB)
            return cb();
        Database.board[map].update({rank:data.rank},{$set: data},{upsert:true},cb);
    }
    
    //leaderboard ranking
    static getRanking(username,map,cb){
        if(!USE_DB)
            return cb(null);

        Database.board[map].findOne({username:username}, (err,res) => {
            if(res)
                cb({rank: res.rank, username: res.username, score: res.score});
            else
                cb(null);
        });
    }

    static board = {};
    static progress = {};
}

Database.board['field'] = db.leaderboard;
Database.board['map2'] = db.leaderboard2;

Database.progress['field'] = db.progress;
Database.progress['map2'] = db.progress2;

module.exports = Database;