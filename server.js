"use strict"
const fileUpload = require("express-fileupload")
const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const cors = require('cors')
var models = require('./model.js')
const io = new Server(server, {
    cors: {

        origin: "*",
        methods: ["GET", "POST"]
    }
})

let thisRoom = {}
let thisUser

app.use(fileUpload())
app.use(express.json()) 
app.use(express.urlencoded({ extended: true })) 

app.use(cors({
    origin: '*'
}));


app.post('/auth', (req, res) => {
    console.log("-- Auth -- ",req.body)
    models.users.findOne({ login: req.body.login, password: req.body.password }, (err, doc) => {
        if (err) return res.status(400).send(err)
        if (doc == null) return res.status(400).send("User has not registered")
        else {
            thisUser = doc
            let idFriends = []
            for (let i = 0; i < doc.friends.length; i++) {
                idFriends.push(doc.friends[i].id)
            }
            let mainUser = { id: doc.id, type: doc.type, login: doc.login, name: doc.name, friends: doc.friends, gender: doc.gender }
            let fr = doc.friends
            models.users.find({ id: idFriends }, (err, doc) => {
                for (let i = 0; i < doc.length; i++) {
                    for (let j = 0; j < fr.length; j++) {
                        if (doc[i].id === fr[j].id) {
                            fr[j].gender = doc[i].gender
                            fr[j].type = doc[i].type
                            break
                        }
                    }
                }
                mainUser.friends = fr
                console.log("-- Entrace-- ", mainUser)
                return res.status(200).send(mainUser)
            })
        }
    })
});

app.get('/user', (req, res) => {
    models.users.findOne({ id: thisUser.id }, (err, doc) => {
        if (err) return res.status(400).send(err)
        if (doc == null) return res.status(400).send("User has not registered")
        else {
            thisUser = doc
            let idFriends = []
            for (let i = 0; i < doc.friends.length; i++) {
                idFriends.push(doc.friends[i].id)
            }
            let mainUser = { id: doc.id, type: doc.type, login: doc.login, name: doc.name, friends: doc.friends, gender: doc.gender }
            let fr = doc.friends
            models.users.find({ id: idFriends }, (err, doc) => {
                for (let i = 0; i < doc.length; i++) {
                    for (let j = 0; j < fr.length; j++) {
                        if (doc[i].id === fr[j].id) {
                            fr[j].gender = doc[i].gender
                            fr[j].type = doc[i].type
                            break
                        }
                    }
                }
                mainUser.friends = fr
                console.log("-- Info User -- ", mainUser)
                return res.status(200).send(mainUser)
            })
        }
    })
})

app.get('/:id/download', function (req, res, next) {
    var filePath = "files/" + req.params.id
    var fileName = "req.query.id"
    res.download(filePath, fileName);
})

app.post("/upload", (req, res) => {
    console.log("-- Upload -- ")
    let maxMsg = 0
    const newpath = __dirname + "/files/";
    const file = req.files.file;
    const filename = file.name;
    file.mv(`${newpath}${filename}`, (err) => {
        if (err) console.log(err)
        else {
            models.messages
                .find()
                .sort({ id: -1 })
                .limit(1)
                .exec(function (err, doc) {
                    if (err) maxMsg = 0
                    else {
                        maxMsg = doc[0]?.id ? doc[0].id : 0;
                    }
                    models.messages.create({ id: maxMsg + 1, user_id: thisUser.id, text: null, date: new Date(), room_id: thisRoom.id, file: `/files/${filename}` }, (err, doc) => {
                        if (err) console.log("---- ADD FILE ERROR ----", err)
                        else {
                            console.log("---- ADD FILE SUCCES ----")
                        }
                    })
                });
        }
        console.log("AAA")
    });
});

app.get('/users', (req, res) => {
    models.users.find({ type: 1 }, (err, doc) => {
        if (err) res.status(500).send({ message: 'Error', code: 200 })
        else {
            let tmpUsers = []
            for (let i = 0; i < doc.length; i++) {
                tmpUsers.push({ type: doc[i].type, login: doc[i].login, id: doc[i].id, name: doc[i].name, gender: doc[i].gender })
            }
            console.log("--- ALL STUDENTS ---  ", tmpUsers)
            res.status(200).send(tmpUsers)
        }
    })
})

app.post('/friend', (req, res) => {
    if (thisUser.type === 0) {
        models.users.findOne({ id: req.body.id }, (err, doc) => {
            if (err) {
                console.log("-- {ERROR1} -- Main user - ", thisUser.id,  " ADD ", req.body.id)
                res.status(400).send(err)
            }
            if (doc == null) {
                console.log("-- {ERROR2} -- Main user - ",thisUser.id , " ADD ", req.body.id)
                res.status(400).send("User not found")
            }
            else {
                models.users.updateOne({ id: thisUser.id }, { $push: { friends: { name: doc.name, id: req.body.id } } }, { upsert: true }, (err, doc) => {
                    models.users.updateOne({ id: req.body.id }, { $push: { friends: { name: thisUser.name, id: thisUser.id } } }, { upsert: true }, (err, doc) => {
                        if (err) {
                            res.status(400).send(err)
                        }
                        else {
                            let id_room
                            if (thisUser.id < req.body.id) id_room = String(thisUser.id) + String(req.body.id)
                            else id_room = String(req.body.id) + String(thisUser.id)
                            models.rooms.create({ id: Number(id_room), teacher: thisUser.id, student: req.body.id, status: 0 }, (err, doc) => {
                                if (err) { res.status(500) }
                                else {
                                    console.log("-- {Success} -- Main user - ", thisUser.id , " ADD ", req.body.id)
                                    res.status(200).send({ code: 200 })
                                }
                            })
                        }
                    })
                })
            }
        })
    }
    else return res.status(400).send("user not teacher")
})




io.on('connection', (socket) => {
    console.log('user connected');
    socket.on('get messages', () => {
        let tmpMessage
        models.messages.find({ room_id: 0 }, (err, doc) => {
            if (err) io.emit(0)
            else {
                tmpMessage = [...doc]
                let tmpID = []
                for (let i = 0; i < doc.length; i++) {
                    tmpID.push(doc[i].user_id)
                }
                models.users.find({ id: tmpID }, (err, doc) => {
                    let messages = []
                    for (let i = 0; i < tmpMessage.length; i++) {
                        for (let j = 0; j < doc.length; j++) {
                            if (tmpMessage[i].user_id == doc[j].id) {
                                messages.push({ id: tmpMessage[i].id, user_id: tmpMessage[i].user_id, text: tmpMessage[i].text, date: tmpMessage[i].date, room_id: tmpMessage[i].room_id, name: doc[j].name, user_type: doc[j].type, gender: doc[j].gender })

                            }
                        }
                    }
                    io.emit('get messages', messages)
                })
            }
        })
    })
    socket.on('chat message', (msg) => {
        console.log('-- chat message --')
        let tmpMessage = []
        let maxMsg
        models.messages
            .find()
            .sort({ id: -1 })
            .limit(1)
            .exec(function (err, doc) {
                if (err) maxMsg = 0
                else {
                    maxMsg = doc[0]?.id ? doc[0].id : 0;
                }
                models.messages.create({ id: maxMsg + 1, user_id: msg.user_id, text: msg.text, date: msg.date, room_id: 0, file: null }, (err, doc) => {
                    models.messages.find({ room_id: 0 }, (err, doc) => {
                        if (err) io.emit(0)
                        else {
                            tmpMessage = [...doc]
                            let tmpID = []
                            for (let i = 0; i < doc.length; i++) {
                                tmpID.push(doc[i].user_id)
                            }
                            models.users.find({ id: tmpID }, (err, doc) => {
                                let messages = []
                                for (let i = 0; i < tmpMessage.length; i++) {
                                    for (let j = 0; j < doc.length; j++) {
                                        if (tmpMessage[i].user_id == doc[j].id) {
                                            messages.push({ id: tmpMessage[i].id, user_id: tmpMessage[i].user_id, text: tmpMessage[i].text, file: tmpMessage[i].file, date: tmpMessage[i].date, room_id: tmpMessage[i].room_id, name: doc[j].name, user_type: doc[j].type, gender: doc[j].gender })

                                        }
                                    }
                                }
                                io.emit('chat message', messages)
                            })
                        }
                    })
                })
            });
    })

    socket.on("joinRoom", (room) => {
        console.log("-- joinRoom --" , room)
        models.rooms.findOne({ id: room }, (err, doc) => {
            if (err) io.emit(err)
            if (doc) {
                thisRoom.id = doc.id
                thisRoom.teacher = doc.teacher
                thisRoom.student = doc.student
                thisRoom.status = doc.status
                models.messages.find({ room_id: doc.id }, (err, doc) => {
                    if (err) io.emit(0)
                    else {
                        let tmpMessage = [...doc]
                        let tmpID = []
                        for (let i = 0; i < doc.length; i++) {
                            tmpID.push(doc[i].user_id)
                        }
                        models.users.find({ id: tmpID }, (err, doc) => {
                            let messages = []
                            for (let i = 0; i < tmpMessage.length; i++) {
                                for (let j = 0; j < doc.length; j++) {
                                    if (tmpMessage[i].user_id == doc[j].id) {
                                        messages.push({ id: tmpMessage[i].id, user_id: tmpMessage[i].user_id, text: tmpMessage[i].text, file: tmpMessage[i].file, date: tmpMessage[i].date, room_id: tmpMessage[i].room_id, name: doc[j].name, user_type: doc[j].type, gender: doc[j].gender })

                                    }
                                }
                            }
                            thisRoom.message = messages
                            io.emit('joinRoom', thisRoom)
                        })
                    }
                })
            }
        })
    })

    socket.on('private message', (msg) => {
        let tmpMessage = []
        console.log("----PRIVATE MESSAGE----")
        let maxMsg
        models.messages
            .find()
            .sort({ id: -1 })
            .limit(1)
            .exec(function (err, doc) {
                if (err) maxMsg = 0
                else {
                    maxMsg = doc[0]?.id ? doc[0].id : 0;
                }
                if (msg.user_id === 0) {
                    models.messages.find({ room_id: Number(msg.room_id) }, (err, doc) => {
                        if (err) io.emit(0)
                        else {
                            tmpMessage = [...doc]
                            let tmpID = []
                            for (let i = 0; i < doc.length; i++) {
                                tmpID.push(doc[i].user_id)
                            }
                            models.users.find({ id: tmpID }, (err, doc) => {
                                let messages = []
                                for (let i = 0; i < tmpMessage.length; i++) {
                                    for (let j = 0; j < doc.length; j++) {
                                        if (tmpMessage[i].user_id == doc[j].id) {
                                            messages.push({ id: tmpMessage[i].id, user_id: tmpMessage[i].user_id, text: tmpMessage[i].text, file: tmpMessage[i].file, date: tmpMessage[i].date, room_id: tmpMessage[i].room_id, name: doc[j].name, user_type: doc[j].type, gender: doc[j].gender })

                                        }
                                    }
                                }
                                io.emit('private message', messages)
                            })
                        }
                    })
                }
                else {
                    models.messages.create({ id: maxMsg + 1, user_id: msg.user_id, text: msg.text, date: msg.date, room_id: Number(msg.room_id), file: null }, (err, doc) => {
                        models.messages.find({ room_id: Number(msg.room_id) }, (err, doc) => {
                            if (err) io.emit(0)
                            else {
                                tmpMessage = [...doc]
                                let tmpID = []
                                for (let i = 0; i < doc.length; i++) {
                                    tmpID.push(doc[i].user_id)
                                }
                                models.users.find({ id: tmpID }, (err, doc) => {
                                    let messages = []
                                    for (let i = 0; i < tmpMessage.length; i++) {
                                        for (let j = 0; j < doc.length; j++) {
                                            if (tmpMessage[i].user_id == doc[j].id) {
                                                messages.push({ id: tmpMessage[i].id, user_id: tmpMessage[i].user_id, text: tmpMessage[i].text, file: tmpMessage[i].file, date: tmpMessage[i].date, room_id: tmpMessage[i].room_id, name: doc[j].name, user_type: doc[j].type, gender: doc[j].gender })

                                            }
                                        }
                                    }
                                    io.emit('private message', messages)
                                })
                            }
                        })
                    })
                }
            });

    })
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

io.emit('some event', { someProperty: 'some value', otherProperty: 'other value' }); // This will emit the event to all connected sockets


server.listen(3000, () => {
    console.log('listening on *:3000');
});

console.log(models)
