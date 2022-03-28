var mongoose = require('mongoose');

var Schema = mongoose.Schema;

mongoose.connect("mongodb://localhost:27017/chat_bd");

mongoose.connection.on('open', function (ref) {
    console.log('Connected to mongo server.');
});
mongoose.connection.on('error', function (err) {
    console.log('Could not connect to mongo server!');
    console.log(err);
});

// mongoose.connect('mongodb://localhost/mongodb');

module.exports.users=mongoose.model('users',new Schema({
    id: Number,
    type:Number,
    login:String,
    password: String,
    friends:[],
    name:String,
    gender:String
},{strict: false}));
module.exports.rooms=mongoose.model('rooms',new Schema({
    id:Number,
    teacher:Number,
    student:Number,
    status:Number
}));
module.exports.messages=mongoose.model('messages',new Schema({
    id:Number,
    user_id:Number,
    text : String,
    date : Date,
    room_id:Number,
    file: String
}));