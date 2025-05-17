import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { constants } from "buffer";
import { time } from "console";



const app = express();
const server = createServer(app);
const io = new Server(server);
const allusers = {};

// /your/system/path
const __dirname = dirname(fileURLToPath(import.meta.url));


// exposing public directory to outside world
app.use(express.static("public"));

// handle incoming http request
app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(join(__dirname + "/app/vc.html"));
});

// handle socket connections
io.on("connection", (socket) => {
    console.log(`Someone connected to socket server and socket id is ${socket.id}`);
    socket.on("join-user", username => {
        console.log(`${username} joined socket connection`);
        allusers[username] = { username, id: socket.id };
        // inform everyone that someone joined
        io.emit("joined", allusers);
    });

     // Handle offer
     socket.on("offer", ({ from, to, offer }) => {
        if (allusers[to]) {
            console.log({ from, to, offer });
            io.to(allusers[to].id).emit("offer", { from, to, offer });
        } else {
            console.error(`User ${to} not found in allusers`);
        }
    });
 // Handle answer
 socket.on("answer", ({ from, to, answer }) => {
    if (allusers[from]) {
        io.to(allusers[from].id).emit("answer", { from, to, answer });
    } else {
        console.error(`User ${from} not found in allusers`);
    }
});


 // Handle end-call
 socket.on("end-call", ({ from, to }) => {
    if (allusers[to]) {
        io.to(allusers[to].id).emit("end-call", { from, to });
    } else {
        console.error(`User ${to} not found in allusers`);
    }
});

   // Handle call-ended
   socket.on("call-ended", (caller) => {
    if (Array.isArray(caller) && caller.length === 2) {
        const [from, to] = caller;
        if (allusers[from] && allusers[to]) {
            io.to(allusers[from].id).emit("call-ended", caller);
            io.to(allusers[to].id).emit("call-ended", caller);
        } else {
            console.error(`One or both users not found in allusers: ${from}, ${to}`);
        }
    } else {
        console.error(`Invalid caller data: ${caller}`);
    }
});


 
    // Handle ICE candidate
    socket.on("icecandidate", ({ to, candidate }) => {
        if (allusers[to]) {
            console.log({ to, candidate });
            io.to(allusers[to].id).emit("icecandidate", { candidate });
        } else {
            console.error(`User ${to} not found in allusers`);
        }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        for (const username in allusers) {
            if (allusers[username].id === socket.id) {
                console.log(`${username} disconnected`);
                delete allusers[username];
                io.emit("user-disconnected", username);
                break;
            }
        }
    });
});
io.on('connection', (socket) => {
    console.log('A user connected');
});

io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle chat messages
    socket.on('chat-message', (data) => {
        // Broadcast the message to all connected clients
        socket.broadcast.emit('chat-message', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// youtube
io.on('connection', (socket) => {
    socket.on('sync-youtube-video', (data) => {
        const {videoId, timestamp}= data;
      if(videoId){
        socket.broadcast.emit('sync-youtube-video',{videoId,timestamp});
      }
    });
});

// Start the server
server.listen(3000, () => {
    console.log(`Server listening on port 3000`);
});

