const express = require('express');
const app = express();
const { connectDB } = require('./routes/db');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const path = require('path');
const port = process.env.PORT;
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const corsOptions = {
    origin: [process.env.FRONTEND,'https://edu-karii-14k6uh3bw-satyam-karns-projects.vercel.app'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
    if (req.originalUrl === '/data/upload') {
        next(); 
    } else {
        express.json()(req, res, next); 
    }
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: process.env.FRONTEND, credentials: true },
});

// WebRTC Signaling
io.on("connection", (socket) => {
    socket.on("offer", ({ offer, room }) => {
        socket.to(room).emit("offer", offer);
    });

    socket.on("answer", ({ answer, room }) => {
        socket.to(room).emit("answer", answer);
    });

    socket.on("candidate", ({ candidate, room }) => {
        socket.to(room).emit("candidate", candidate);
    });

    socket.on("join-room", (room) => {
        socket.join(room);
    });

    socket.on("disconnect", () => {});
});

// Serve WebRTC frontend
app.get('/video-call', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'videoCall.html'));
});

connectDB().then(() => {
    app.use('/data', require('./routes/data'));
    app.use('/auth', require('./routes/auth'));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    server.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });

}).catch((error) => {
    console.log(error);
    process.exit(1);
});
