//INITIALIZATION:Handshake with Server
const socket = io();
// Socket Programming is use to Play Multiplayer and it makes Game more Intresting

//STATE MANAGEMENT
let myBoard = [];        //It is use to See 1D Array representing the 5x5 Grid
let markedIndices = [];  //It is use to See progress
let receivedNumbers = []; //Valid numbers received from Server(between 1 to 75)

//SOCKET EVENT HANDLERS 

//JOIN LOGIC(when user Wants to Join the game)[Needs to fill the name]
function joinGame() {
    const name = document.getElementById('playerName').value;
    if(!name) return alert("Name required!");

    socket.emit('joinGame', name);

    //(DOM MANIPULATION)Web Page App View Switching
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('waitingSection').classList.remove('hidden');
}

//LOBBY SYNC(When two or more players are player the list is updated by this)
socket.on('updatePlayerList', (players) => {
    const list = document.getElementById('playerList');
    list.innerHTML = players.map(p => `<li> ${p.name}</li>`).join('');

    //HOST IDENTIFICATION LOGIC(This is most important to find The HOST)
    //Who is the first player when he jions the lobby he will be the HOST
    //After Some time i want to add user choose who will be the host 
    const myName = document.getElementById('playerName').value;
    if (players.length > 0 && players[0].name === myName) {
        document.getElementById('startBtn').classList.remove('hidden');
        document.getElementById('statusMsg').innerText = "You are the Host! Start when ready.";
    } else {
        document.getElementById('startBtn').classList.add('hidden');
        document.getElementById('statusMsg').innerText = "Waiting for Host to Start...";
    }
});

//GAME START TRIGGER
function requestStart() {
    socket.emit('startGame');
}

//Use to See TRANSITION From LOBBY to GAME
socket.on('gameStarted', () => {
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('gameUI').classList.remove('hidden');
    generateTicket();
    receivedNumbers = []; //(RESET)Sync local state
});

// REAL-TIME UPDATES (The Core Loop Which is use to assign Number in the ball(circle))
socket.on('newNumber', (num) => {
    const ball = document.getElementById('currentBall');
    ball.innerText = num;
    
    // Update local 'Truth' array for validation
    receivedNumbers.push(num); 
    
    // CSS Animation Trigger
    ball.style.transform = "scale(1.2)";
    setTimeout(() => ball.style.transform = "scale(1)", 200);
});

// User-SIDE GAME LOGIC 
// ALGORITHM to generates Random Matrix(Ticket)
function generateTicket() {
    const ticketDiv = document.getElementById('ticket');
    ticketDiv.innerHTML = "";
    myBoard = [];
    markedIndices = [];

    // The Logic is Fill the array with unique integers Between 1 to 75(Avoiding tripple digit numbers)
    let numbers = [];
    while(numbers.length < 25) {
        // Math.rondom helps me to generates different number at each square 
        let r = Math.floor(Math.random() * 75) + 1;
        if(!numbers.includes(r)) numbers.push(r);
    }
    myBoard = numbers; 

    // Grid Creation
    myBoard.forEach((num, index) => {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerText = num;
        box.id = `box-${index}`;

        // When User Pass value and index for validation
        box.onclick = () => handleBoxClick(num, index, box);
        ticketDiv.appendChild(box);
    });
}

// The Most IPORTANT LOGIC OF THE CODE(When User Clicks the Different number Which is not Generated)
    function handleBoxClick(number, index, boxElement) {
    // 1. Check: if user already marked the number then Don't process 
    if (markedIndices.includes(index)) return;

    // 2. TRUTH CHECK: Comparing Input(user Clicked Number) vs Server State(Server Generated Ranodom Number)
    if (receivedNumbers.includes(number)) {
        // Valid Click(If Click was Right)
        boxElement.classList.add('checked');
        markedIndices.push(index);
    } else {
        // INVALID CLICK:(If the User Clicked Wrong Number[The Fun Part]) 
        alert("You Clicked Wrong Number\nYou Have No Honer to Play this Game\nGAME OVER.");
        location.reload(); // Punishment for User(RESET the GAME)
    }
}

// ALGORITHM of WINNING PATTERN VALIDATION(Tughest Part for Me) 
function claimWin() {
    // Optimization: Here I am Checking locally before emitting to server
    if (checkForBingo()) {
        socket.emit('claimBingo');
    } else {
        alert(" Validation Failed: You do not have a Bingo yet.");
    }
}

function checkForBingo() {
    // DATA STRUCTURE: Pre-calculated Winning Vectors (Indices of Winning)
    const winningPatterns = [
        // Horizontal Vectors (Rows)
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        // Vertical Vectors (Columns)
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        // Diagonal Vectors
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];

    // Here I am Checking the Row is Really Full
    for (let pattern of winningPatterns) {
        const isWin = pattern.every(index => markedIndices.includes(index));
        if (isWin) return true;
    }
    return false;
}

// GAME OVER STATE
socket.on('gameOver', (winner) => {
    alert(` GAME OVER! Winner: ${winner}`);
    location.reload();
});