var express = require("express");
var app = express();
var mongoose = require("mongoose");
var client = require("socket.io").listen(4000).sockets;
app.use(express.static("public"));
app.set("view engine", "pug");
app.listen(3000, function () {
console.log("App running at localhost:3000");
});

// Connect to mongo
mongoose.set("useCreateIndex", true);
mongoose.Promise = require("bluebird");
var mongoDB = "mongodb://127.0.0.1:27017/mongochat";
mongoose.connect(mongoDB,{ useNewUrlParser: true, useUnifiedTopology: true },function (err, db) {
    if (err) {
      console.log("Mongoose Error: " + err);
    }
    console.log("Mongoose connected..." + mongoDB);

    // Connect to Socket.io
    client.on("connection", function (socket) {
      let chat = db.collection("chats");

      // Create function to send status
      sendStatus = function (s) {
        socket.emit("status", s);
      };

      // Get chats from mongo collection
      chat
        .find()
        .limit(100)
        .sort({ _id: 1 })
        .toArray(function (err, res) {
          if (err) {
            throw err;
          }

          // Emit the messages
          socket.emit("output", res);
        });

      // Handle input events
      socket.on("input", function (data) {
        let name = data.name;
        let message = data.message;

        // Check for name and message
        if (name == "" || message == "") {
          // Send error status
          sendStatus("Please enter a name and message");
        } else {

          // Create Mongoose Shema
          var ChatShema=new mongoose.Schema({
              name:String,
              message:String,
              msg_time: {type:Date, default:Date.now}
          })
          //Create Model 
          var Chat=mongoose.model("Chat",ChatShema)

          //Create new object
          var newChat=new Chat({
            name: name, message: message, 
          })
          // Insert message to DB
          
          newChat.save( function (err) {
              if(err){
                  console.log(err)
              }
            console.log("Name: " + name + " Message: " + message +" >>Chat saved mongoDB/mongochat/chats shema");
            client.emit("output", [data]);

            // Send status object
            sendStatus({
              message: "Message sent",
              clear: true,
            });
          });
        }
      });

      // Handle clear
      socket.on("clear", function (data) {
        // Remove all chats from collection
        chat.deleteOne({}, function () {
          // Emit cleared
          socket.emit("cleared");
        });
      });
    });
  }
);
