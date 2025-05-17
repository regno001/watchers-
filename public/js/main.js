// DOM Elements
const createUserBtn = document.getElementById("create-user");
const username = document.getElementById("username");
const allusersHtml = document.getElementById("allusers");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const endCallBtn = document.getElementById("end-call-btn");

// Socket connection
const socket = io();

// Global variables
let localStream;
let caller = [];

// PeerConnection Singleton
const PeerConnection = (function () {
    let peerConnection;

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302", // Public STUN server
                },
            ],
        };
        peerConnection = new RTCPeerConnection(config);

        // Add local stream to peer connection
        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });

        // Listen for remote stream and add to video element
        peerConnection.ontrack = function (event) {
            remoteVideo.srcObject = event.streams[0];
        };

        // Listen for ICE candidates
        peerConnection.onicecandidate = function (event) {
            if (event.candidate) {
                socket.emit("icecandidate", event.candidate);
            }
        };

        return peerConnection;
    };

    return {
        getInstance: () => {
            if (!peerConnection) {
                peerConnection = createPeerConnection();
            }
            return peerConnection;
        },
    };
})();

// Handle browser events
createUserBtn.addEventListener("click", (e) => {
    if (username.value !== "") {
        const usernameContainer = document.querySelector(".username-input");
        socket.emit("join-user", username.value);
        usernameContainer.style.display = "none";
    }
});

endCallBtn.addEventListener("click", (e) => {
    socket.emit("call-ended", caller);
});

// Handle socket events
socket.on("joined", (allusers) => {
    console.log({ allusers });
    const createUsersHtml = () => {
        allusersHtml.innerHTML = "";

        for (const user in allusers) {
            const li = document.createElement("li");
            li.textContent = `${user} ${user === username.value ? "(You)" : ""}`;

            if (user !== username.value) {
                const button = document.createElement("button");
                button.classList.add("call-btn");
                button.addEventListener("click", (e) => {
                    startCall(user);
                });
                const img = document.createElement("img");
                img.setAttribute("src", "/images/phone.png");
                img.setAttribute("width", 20);

                button.appendChild(img);

                li.appendChild(button);
            }

            allusersHtml.appendChild(li);
        }
    };

    createUsersHtml();
});

socket.on("offer", async ({ from, to, offer }) => {
    const pc = PeerConnection.getInstance();
    // Set remote description
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { from, to, answer: pc.localDescription });
    caller = [from, to];
});

socket.on("answer", async ({ from, to, answer }) => {
    const pc = PeerConnection.getInstance();
    await pc.setRemoteDescription(answer);
    // Show end call button
    endCallBtn.style.display = "block";
    caller = [from, to];
});

socket.on("icecandidate", async (candidate) => {
    console.log({ candidate });
    const pc = PeerConnection.getInstance();
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("end-call", ({ from, to }) => {
    endCallBtn.style.display = "block";
});

socket.on("call-ended", (caller) => {
    endCall();
});

// Start call method
const startCall = async (user) => {
    console.log({ user });
    const pc = PeerConnection.getInstance();
    const offer = await pc.createOffer();
    console.log({ offer });
    await pc.setLocalDescription(offer);
    socket.emit("offer", { from: username.value, to: user, offer: pc.localDescription });
};

// End call method
const endCall = () => {
    const pc = PeerConnection.getInstance();
    if (pc) {
        pc.close();
        endCallBtn.style.display = "none";
        muteButton.style.display = "none";
    }
};
// Get the mute button
const muteButton = document.getElementById('mute-call-btn');

// Variable to track mute state
let isMuted = false;

// Add event listener to the mute button
muteButton.addEventListener('click', () => {
    // Get the local media stream
    const localStream = localVideo.srcObject;

    if (localStream) {
        // Get the audio tracks from the stream
        const audioTracks = localStream.getAudioTracks();

        if (audioTracks.length > 0) {
            // Toggle the enabled property of the audio track
            isMuted = !isMuted;
            audioTracks[0].enabled = !isMuted;

            // Update the button icon or style based on mute state
            if (isMuted) {
                muteButton.innerHTML = '<img height="30px" width="30px" src="/images/unmute.png">';
            } else {
                muteButton.innerHTML = '<img height="30px" width="30px" src="/images/mute.png">';
            }
        }
    } else {
        console.error('No local stream found.');
    }
});

// Initialize app
const startMyVideo = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        console.log({ stream });
        localStream = stream;
        localVideo.srcObject = stream;
    } catch (error) {
        console.error("Error accessing media devices:", error);
    }
};


// Get chat elements
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const sendChatBtn = document.getElementById('send-chat-btn');

// Handle sending chat messages when the Enter key is pressed
chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior (e.g., form submission)
        sendChatBtn.click(); // Trigger the Send button click event
    }
});


// Handle sending chat messages
sendChatBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        // Emit the message to the server
        socket.emit('chat-message', { username: username.value, message });

        // Add the message to the chat UI
        addChatMessage({ username: 'You', message });

        // Clear the input field
        chatInput.value = '';
    }
});

// Listen for incoming chat messages
socket.on('chat-message', (data) => {
    addChatMessage(data);
});

// Function to add a chat message to the UI
function addChatMessage({ username, message }) {
    // Clear previous messages
    chatMessages.innerHTML = '';

    // Add the latest message
    const messageDiv = document.createElement('div');
    messageDiv.innerHTML = `<strong>${username}:</strong> ${message}`;
    chatMessages.appendChild(messageDiv);
} 

// DOM Elements
const youtubeUrlInput = document.getElementById('youtube-url');
const youtubePlayer = document.getElementById('youtube-player');
const loadYoutubeVideoButton = document.getElementById('load-youtube-video');

// Function to extract YouTube video ID
function extractYoutubeVideoId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// Event listener for the "Load Video" button
loadYoutubeVideoButton.addEventListener('click', () => {
    const youtubeUrl = youtubeUrlInput.value.trim();
    const videoId = extractYoutubeVideoId(youtubeUrl);

    if (videoId) {
        // Update the local YouTube player
        youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`;
        const timestamp =Date.now();
        // Emit the video ID to the server for synchronization
        socket.emit('sync-youtube-video', {videoId,timestamp});
    } else {
        alert('Invalid YouTube URL');
    }
});

// Listen for "sync-youtube-video" events from the server
socket.on('sync-youtube-video', (data) => {
    const { videoId ,timestamp} = data;
if (videoId) {
        const delay = Date.now() - timestamp;
        youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=${Math.floor(delay / 1000)}`;
    }
});

startMyVideo();
//npm run start 